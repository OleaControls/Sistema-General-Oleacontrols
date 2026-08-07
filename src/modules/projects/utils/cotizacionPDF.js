import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SYSTEMS, AREA_MIN, AREA_MAX } from './cotizador';

// PDF de la cotización de ingeniería de diseño (tab Cotizador del proyecto).
// Replica el contenido del libro FORMA-AJAGC-PP: tabulador + alcances por
// sistema + condiciones generales de la portada.

const PRIMARY = [37, 99, 235];
const DARK    = [15, 23, 42];
const GRAY    = [100, 116, 139];

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—');

const loadPngAsBase64 = async (url) => {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
};

/**
 * Genera el PDF de la cotización de un proyecto.
 * @param {object} project  Proyecto con su relación `quotes`.
 * @param {{download?:boolean, returnDataUri?:boolean}} opts
 */
export async function generateCotizacionPDF(project, { download = true, returnDataUri = false } = {}) {
  const quotes = project.quotes || [];
  if (quotes.length === 0) throw new Error('No hay partidas cotizadas para exportar.');

  const insignia = await loadPngAsBase64('/img/Insignia.png');
  const doc = new jsPDF({ compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;
  let y = M;

  // Salta de página si no caben `h` mm en la actual.
  const ensure = (h) => { if (y + h > H - 20) { doc.addPage(); y = M; } };

  // ── Encabezado ──────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 28, 'F');
  if (insignia) {
    try { doc.addImage(insignia, 'PNG', M, 6, 16, 16); } catch { /* ignora */ }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COTIZACIÓN DE INGENIERÍA DE DISEÑO', insignia ? M + 22 : M, 14);
  doc.setFontSize(9);
  doc.setTextColor(180, 190, 205);
  doc.text(`${project.code || ''}  ·  ${project.name || ''}`, insignia ? M + 22 : M, 21);
  y = 38;

  // ── Datos generales ─────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    body: [
      ['Proyecto', project.name || '—'],
      ['Cliente', project.clientName || '—'],
      ['Responsable', project.managerName || '—'],
      ['Fecha de emisión', fmtDate(new Date())],
      ['Partidas cotizadas', String(quotes.length)],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: DARK, cellWidth: 55 },
      1: { textColor: GRAY },
    },
    margin: { left: M, right: M },
  });
  y = doc.lastAutoTable.finalY + 6;

  // ── Tabla de partidas ───────────────────────────────────────────────────
  const totals = quotes.reduce(
    (a, q) => ({
      subtotal: a.subtotal + (q.subtotal || 0),
      iva: a.iva + (q.iva || 0),
      total: a.total + (q.total || 0),
    }),
    { subtotal: 0, iva: 0, total: 0 }
  );

  // El precio base que ve el cliente ya trae la actualización por inflación:
  // `subtotal` es exactamente basePrice × (1 + updateFactor/100) redondeado, así
  // que se usa ese valor y no se imprime el tabulador de 2006 en crudo.
  autoTable(doc, {
    startY: y,
    head: [['Local / partida', 'Sistema', 'Área', 'Rgo.', 'Precio base', 'I.V.A.', 'Total']],
    body: quotes.map(q => [
      (q.localName || '—') + (q.extrapolated ? ' *' : ''),
      q.systemLabel,
      `${q.area} m²`,
      q.band,
      money(q.subtotal),
      money(q.iva),
      money(q.total),
    ]),
    foot: [['', '', '', 'Totales', money(totals.subtotal), money(totals.iva), money(totals.total)]],
    headStyles: { fillColor: PRIMARY, fontSize: 8 },
    footStyles: { fillColor: [241, 245, 249], textColor: DARK, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right', textColor: GRAY },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
  });
  y = doc.lastAutoTable.finalY + 5;

  // Aviso de partidas extrapoladas.
  if (quotes.some(q => q.extrapolated)) {
    ensure(10);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    const warn = doc.splitTextToSize(
      `* Partida estimada por extrapolación: el área queda fuera del tabulador (${AREA_MIN}–${AREA_MAX} m²). ` +
      'Precio sujeto a revisión.',
      W - M * 2
    );
    doc.text(warn, M, y);
    y += warn.length * 3.6 + 4;
  }

  // ── Alcances de los sistemas cotizados ──────────────────────────────────
  const usedKeys = [...new Set(quotes.map(q => q.systemKey))].filter(k => SYSTEMS[k]);

  for (const key of usedKeys) {
    const s = SYSTEMS[key];
    ensure(28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY);
    doc.text(s.label.toUpperCase(), M, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    for (const p of s.intro) {
      const lines = doc.splitTextToSize(p, W - M * 2);
      ensure(lines.length * 4);
      doc.text(lines, M, y);
      y += lines.length * 4 + 2;
    }

    y += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Alcances:', M, y);
    y += 5;

    s.scopes.forEach((sc, i) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      const lines = doc.splitTextToSize(`${i + 1}. ${sc.text}`, W - M * 2 - 4);
      ensure(lines.length * 4 + 4);
      doc.text(lines, M + 4, y);
      y += lines.length * 4 + 1.5;

      if (sc.note) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY);
        const nl = doc.splitTextToSize(sc.note, W - M * 2 - 8);
        ensure(nl.length * 3.6 + 3);
        doc.text(nl, M + 8, y);
        y += nl.length * 3.6 + 2.5;
      }
    });

    y += 4;
  }

  // ── Condiciones generales (portada del cotizador) ───────────────────────
  ensure(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text('CONDICIONES GENERALES', M, y);
  y += 5.5;

  const ivaPct = quotes[0]?.ivaRate != null ? (quotes[0].ivaRate * 100).toFixed(0) : '16';
  const condiciones = [
    'Los precios son en moneda nacional y están vigentes a la fecha de emisión de esta cotización.',
    `Precios más ${ivaPct}% de I.V.A.`,
    `El tabulador aplica a áreas de ${AREA_MIN} a ${AREA_MAX} m² por local.`,
    'La cotización comprende únicamente la ingeniería de diseño; no incluye suministro ni instalación de equipo.',
    'No incluye viáticos en caso de obra foránea.',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  for (const c of condiciones) {
    const lines = doc.splitTextToSize(`·  ${c}`, W - M * 2 - 4);
    ensure(lines.length * 4);
    doc.text(lines, M + 2, y);
    y += lines.length * 4 + 1;
  }

  // ── Pie ─────────────────────────────────────────────────────────────────
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(
      `Documento generado por Olea Controls Platform · ${new Date().toLocaleDateString('es-MX')}`,
      W / 2, H - 8, { align: 'center' }
    );
    doc.text(`Página ${i} de ${pages}`, W - M, H - 8, { align: 'right' });
  }

  const fileName = `Cotizacion-${project.code || 'proyecto'}.pdf`;
  if (returnDataUri) return doc.output('datauristring');
  if (download) doc.save(fileName);
}
