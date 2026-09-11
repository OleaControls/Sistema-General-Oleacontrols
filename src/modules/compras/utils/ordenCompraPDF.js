import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtMXN, loadPngAsBase64, slug } from '@/modules/projects/utils/cotizacionLayout';
import { poStatusMeta } from '@/lib/compras';

// ═══════════════════════════════════════════════════════════════════════════
// ORDEN DE COMPRA — mismo formato que la cotización del CRM
//
// Comparte el dibujo de cotizacionLayout.js medida por medida: logo arriba a
// la izquierda, caja de referencias arriba a la derecha, datos de la empresa,
// línea divisoria, dos columnas de encabezado, tabla de conceptos con cabecera
// azul, recuadro de totales a la derecha y pie en todas las páginas.
//
// Cambia lo que tiene que cambiar por ser otro documento:
//   · CLIENTE          → PROVEEDOR (a quién se le compra)
//   · REQUERIMIENTOS   → ASUNTO DE LA ORDEN
//   · Descuentos por   → AUTORIZACIONES (quién firmó y cuándo)
//     pago anticipado
//   · Datos bancarios  → Domicilios de facturación y envío
//   · INVERSIÓN TOTAL  → TOTAL DE LA ORDEN
//
// Las funciones de formato y el cargador del logo se importan de allá para no
// tener dos versiones de lo mismo.
// ═══════════════════════════════════════════════════════════════════════════

const DARK  = [25, 25, 25];
const GRAY  = [110, 110, 110];
const BLUE  = [0, 91, 187];
const LIGHT = [243, 246, 252];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/**
 * Dibuja la orden de compra.
 * @param {object} orden  Orden con supplier, project, items y approvals.
 * @param {{logo?: string}} [opts]
 * @returns {jsPDF}
 */
export function buildOrdenCompraPDF(orden, { logo = null } = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const margin = 18;
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const cW = pageW - margin * 2;

  const moneda = orden.currency || 'MXN';
  const prov = orden.supplier || {};

  // ── LOGO ──────────────────────────────────────────────────────────────────
  if (logo) {
    try { doc.addImage(logo, 'PNG', margin, 10, 60, 7); } catch { /* ignora */ }
  }

  // ── CAJA DE REFERENCIAS (arriba derecha) ──────────────────────────────────
  const bxX = pageW - margin - 72;
  const bxY = 8;
  doc.setFillColor(...BLUE);
  doc.roundedRect(bxX, bxY, 72, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ORDEN DE COMPRA', bxX + 36, bxY + 6.3, { align: 'center' });

  doc.setFillColor(...LIGHT);
  doc.roundedRect(bxX, bxY + 9, 72, 20, 0, 0, 'F');
  doc.roundedRect(bxX, bxY + 9, 72, 20, 0, 2, 'FD');
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.3);
  doc.roundedRect(bxX, bxY, 72, 29, 2, 2, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text('No.:', bxX + 4, bxY + 15);
  doc.setFont('helvetica', 'bold');
  doc.text(String(orden.orderNumber || '—'), bxX + 14, bxY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text('Fecha:', bxX + 4, bxY + 21);
  doc.text(fmtDate(orden.orderDate), bxX + 17, bxY + 21);
  doc.text('Entrega:', bxX + 4, bxY + 27);
  doc.text(fmtDate(orden.deliveryDate), bxX + 19, bxY + 27);

  // ── DATOS DE LA EMPRESA (izquierda, abajo del logo) ───────────────────────
  let y = 21;
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'bold');
  doc.text('OLEA CONTROLS MÉXICO, S.A. DE C.V.', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 4;
  doc.text('Av. Homero 1425 - 105, Polanco II Secc, Miguel Hidalgo, CDMX 11540', margin, y);
  y += 4;
  doc.text('RFC: OCM090623GR8  |  heroes@oleacontrols.com', margin, y);

  // ── LÍNEA DIVISORA ────────────────────────────────────────────────────────
  y = 46;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineWidth(0.2);
  doc.setDrawColor(200, 200, 200);

  // ── PROVEEDOR / DETALLES DE LA ORDEN ──────────────────────────────────────
  y = 52;
  const colMid = pageW / 2 + 2;

  const details = [
    ['Proyecto:',      orden.project ? `${orden.project.code} · ${orden.project.name}` : '—'],
    ['Solicita:',      orden.ownerName || orden.createdByName || '—'],
    ['Forma de pago:', orden.paymentMethod || '—'],
    ['Moneda:',        Number(orden.exchangeRate) !== 1 ? `${moneda} · TC ${orden.exchangeRate}` : moneda],
    ['Transportista:', orden.carrier || '—'],
    ['Estado:',        poStatusMeta(orden.status).label],
  ];

  let yR = 52 + 5;
  details.forEach(([, val]) => {
    const lines = doc.splitTextToSize(String(val), pageW - margin - colMid - 28);
    yR += Math.max(lines.length * 3.8, 5);
  });
  const maxHeaderY = yR;

  // — Izquierda: proveedor
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('PROVEEDOR:', margin, y);

  y += 5;
  const contacto = orden.contactName || prov.contactName || '';
  if (contacto) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(contacto.toUpperCase(), margin, y);
    y += 5;
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text((prov.name || 'Proveedor').toUpperCase(), margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  y += 4;
  if (prov.rfc && y < maxHeaderY) {
    doc.setTextColor(...GRAY);
    doc.text(`RFC: ${prov.rfc}`, margin, y);
    y += 4;
  }
  const dir = [prov.address, prov.city, prov.state, prov.zip].filter(Boolean).join(', ');
  if (dir && y < maxHeaderY) {
    doc.setTextColor(...DARK);
    const lineas = doc.splitTextToSize(dir, colMid - margin - 6);
    doc.text(lineas, margin, y);
    y += lineas.length * 3.8;
  }
  if (prov.email && y < maxHeaderY) {
    doc.setTextColor(...GRAY);
    doc.text(prov.email, margin, y);
    y += 4;
  }
  if (prov.phone && y < maxHeaderY) {
    doc.text(prov.phone, margin, y);
    y += 4;
  }

  // — Derecha: detalles
  yR = 52;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('DETALLES DE LA ORDEN:', colMid, yR);
  yR += 5;

  doc.setFontSize(7.5);
  details.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text(label, colMid, yR);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(String(val), pageW - margin - colMid - 28);
    doc.text(lines, colMid + 26, yR);
    yR += Math.max(lines.length * 3.8, 5);
  });

  // ── ASUNTO DE LA ORDEN ────────────────────────────────────────────────────
  let tableStartY = Math.max(Math.min(y, maxHeaderY), yR) + 6;

  if (orden.subject && orden.subject.trim()) {
    const lineH = 4.2;
    const lineas = doc.splitTextToSize(orden.subject.trim(), cW - 10);
    const labelH = 7;
    const padH = 5;
    const contentH = lineas.length * lineH + padH;
    const cajaH = labelH + contentH;

    if (tableStartY + cajaH > pageH - 15) {
      doc.addPage();
      tableStartY = 20;
    }

    doc.setFillColor(...BLUE);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, tableStartY, cW, labelH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('ASUNTO DE LA ORDEN:', margin + cW / 2, tableStartY + 4.8, { align: 'center' });

    doc.setFillColor(...LIGHT);
    doc.setDrawColor(...BLUE);
    doc.rect(margin, tableStartY + labelH, cW, contentH, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(lineas, margin + 4, tableStartY + labelH + 4);

    tableStartY += cajaH + 5;
  }

  // ── TABLA DE CONCEPTOS ────────────────────────────────────────────────────
  const items = Array.isArray(orden.items) ? orden.items : [];
  const body = items.map((it, i) => [
    { content: String(i + 1).padStart(2, '0'), styles: { halign: 'center', fontStyle: 'bold' } },
    { content: it.description || '—' },
    { content: String(it.quantity ?? 0), styles: { halign: 'center' } },
    { content: fmtMXN(it.unitPrice), styles: { halign: 'right' } },
    { content: Number(it.discount) ? fmtMXN(it.discount) : '—', styles: { halign: 'right' } },
    { content: fmtMXN(it.total), styles: { halign: 'right', fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Nº', 'Producto / Servicio', 'Cantidad', 'Precio Unit.', 'Desc.', 'Total']],
    body,
    theme: 'grid',
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 9,  halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    headStyles: {
      fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold',
      fontSize: 7.5, halign: 'center', cellPadding: 3,
    },
    bodyStyles: { fontSize: 7.5, textColor: DARK, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 249, 253] },
    styles: { lineColor: [215, 220, 230], lineWidth: 0.2 },
  });

  // ── AUTORIZACIONES (izq.) + TOTALES (der.) ────────────────────────────────
  const totW = 82;
  const totX = pageW - margin - totW;

  // El renglón solo aparece si tiene valor: un "Descuento $0.00" estorba.
  const rows = [['Subtotal', fmtMXN(orden.subtotal || 0)]];
  if (Number(orden.discount || 0) !== 0)   rows.push(['Descuento', fmtMXN(-Math.abs(orden.discount))]);
  rows.push(['Impuesto (IVA)', fmtMXN(orden.tax || 0)]);
  if (Number(orden.adjustment || 0) !== 0) rows.push(['Ajuste', fmtMXN(orden.adjustment)]);

  const rowH = 6.5;
  const totH = 8 + rows.length * rowH + 9;

  const firmas = (orden.approvals || []).filter(a => a.decision === 'APROBADA');
  const firmasBoxH = 7 + Math.max(firmas.length, 1) * 6.2;

  let afterTableY = (doc.lastAutoTable?.finalY ?? tableStartY) + 6;
  const termsLines_est = orden.terms
    ? doc.splitTextToSize(orden.terms, (pageW - margin * 2) / 2 - 6).length
    : 0;
  const leftColH_est = (termsLines_est > 0 ? 10 + termsLines_est * 3.5 + 5 : 0) + firmasBoxH + 10;
  const necesita = Math.max(totH, leftColH_est) + 20;
  if (afterTableY + necesita > pageH - 15) {
    doc.addPage();
    afterTableY = 20;
  }

  const termsColW = totX - margin - 6;
  let termsBottomY = afterTableY;
  if (orden.terms) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text('TÉRMINOS Y CONDICIONES:', margin, afterTableY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const lineas = doc.splitTextToSize(orden.terms, termsColW);
    const lineH3 = 3.5;
    const maxY = pageH - 15;
    const disponibles = Math.max(1, Math.floor((maxY - (afterTableY + 5)) / lineH3));
    doc.text(lineas.slice(0, disponibles), margin, afterTableY + 5);
    termsBottomY = Math.min(afterTableY + 5 + lineas.length * lineH3, maxY - 2);
  }

  // Recuadro de autorizaciones (izquierda) — el lugar donde la cotización
  // pone los descuentos por pago anticipado.
  const firmasW = totX - margin - 6;
  const boxStartY = termsBottomY + (orden.terms ? 5 : 0);

  doc.setFillColor(245, 248, 255);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, boxStartY, firmasW, firmasBoxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...BLUE);
  doc.text('AUTORIZACIONES', margin + firmasW / 2, boxStartY + 4.5, { align: 'center' });

  if (firmas.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text('Sin autorizar', margin + 4, boxStartY + 9);
  } else {
    firmas.forEach((a, i) => {
      const ry = boxStartY + 9 + i * 6.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(`${a.approverName}${a.approverRole === 'ADMIN' ? ' (Dirección)' : ''}`, margin + 4, ry);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLUE);
      doc.text(fmtDate(a.createdAt), margin + firmasW - 4, ry, { align: 'right' });
    });
  }

  // Recuadro de totales (derecha)
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.3);
  doc.roundedRect(totX, boxStartY, totW, totH, 2, 2, 'FD');

  let ty = boxStartY + 5;
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(label, totX + 4, ty);
    doc.setTextColor(...DARK);
    doc.text(val, totX + totW - 4, ty, { align: 'right' });
    ty += rowH;
  });

  doc.setDrawColor(200, 210, 230);
  doc.line(totX + 3, ty, totX + totW - 3, ty);
  ty += 3;

  doc.setFillColor(...BLUE);
  doc.roundedRect(totX, ty - 1, totW, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL DE LA ORDEN', totX + 4, ty + 6);
  doc.setFontSize(9);
  doc.text(fmtMXN(orden.total || 0), totX + totW - 4, ty + 6, { align: 'right' });

  const totBottomY = ty + 12;
  const firmasBottomY = boxStartY + firmasBoxH;

  // ── DOMICILIOS ────────────────────────────────────────────────────────────
  // Ocupan el lugar del recuadro de datos bancarios de la prefactura.
  let afterTotalsY = Math.max(totBottomY, firmasBottomY);

  if (orden.billingAddress || orden.shippingAddress) {
    let dirY = afterTotalsY + 8;
    const facturacion = doc.splitTextToSize(orden.billingAddress || '—', cW / 2 - 12);
    const envio       = doc.splitTextToSize(orden.shippingAddress || '—', cW / 2 - 12);
    const cajaH = 13 + Math.max(facturacion.length, envio.length) * 4 + 5;

    if (dirY + cajaH > pageH - 15) {
      doc.addPage();
      dirY = 20;
    }

    doc.setFillColor(237, 244, 255);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, dirY, cW, cajaH, 3, 3, 'FD');

    doc.setFillColor(...BLUE);
    doc.roundedRect(margin, dirY, cW, 9, 3, 3, 'F');
    doc.rect(margin, dirY + 5, cW, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('DOMICILIOS', margin + cW / 2, dirY + 6, { align: 'center' });

    const c1X = margin + 5;
    const c2X = margin + cW / 2 + 5;

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    doc.text('FACTURACIÓN', c1X, dirY + 14);
    doc.text('ENVÍO', c2X, dirY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(facturacion, c1X, dirY + 19);
    doc.text(envio, c2X, dirY + 19);

    doc.setDrawColor(190, 210, 240);
    doc.setLineWidth(0.3);
    doc.line(margin + cW / 2, dirY + 11, margin + cW / 2, dirY + cajaH - 4);

    afterTotalsY = dirY + cajaH;
  }

  // ── FIRMAS AL PIE ─────────────────────────────────────────────────────────
  let firmaY = afterTotalsY + 14;
  if (firmaY + 22 > pageH - 15) {
    doc.addPage();
    firmaY = 30;
  }
  const anchoFirma = (cW - 20) / 2;
  [['AUTORIZÓ', 'Olea Controls México'], ['ACEPTÓ', prov.name || 'Proveedor']].forEach(([rol, quien], i) => {
    const x = margin + i * (anchoFirma + 20);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(x, firmaY, x + anchoFirma, firmaY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(rol, x + anchoFirma / 2, firmaY + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(quien, x + anchoFirma / 2, firmaY + 9, { align: 'center' });
  });

  // ── PIE EN TODAS LAS PÁGINAS ──────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  const footY = pageH - 8;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, footY - 4, pageW - margin, footY - 4);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(
      'OLEA CONTROLS MÉXICO, S.A. DE C.V.  |  heroes@oleacontrols.com  |  www.oleacontrols.com',
      pageW / 2, footY, { align: 'center' }
    );
    doc.text(`Página ${p} de ${totalPages}`, pageW - margin, footY, { align: 'right' });
  }

  return doc;
}

/**
 * Genera y descarga el PDF de la orden de compra.
 * @param {object} orden
 * @param {{download?: boolean}} [opts]
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
export async function generarOrdenCompraPDF(orden, { download = true } = {}) {
  const logo = await loadPngAsBase64('/img/OLEACONTROLS.png');
  const doc = buildOrdenCompraPDF(orden, { logo });
  const filename = `${slug(orden.orderNumber) || 'orden-compra'}.pdf`;
  if (download) doc.save(filename);
  return { blob: doc.output('blob'), filename };
}

export default generarOrdenCompraPDF;
