import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRIMARY = [37, 99, 235];   // azul
const DARK    = [15, 23, 42];
const GRAY    = [100, 116, 139];

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—');

const STATUS_LABEL = {
  INICIACION: 'Iniciación', PLANEACION: 'Planeación', IMPLEMENTACION: 'Implementación', CALIDAD: 'Calidad', CIERRE: 'Cierre',
  // Compatibilidad con estados antiguos
  INICIO: 'Iniciación', EJECUCION: 'Implementación', CERRADO: 'Cierre',
};

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
 * Genera el PDF del Acta de inicio o de cierre de un proyecto.
 * @param {object} project - Proyecto con sus relaciones (tasks, costs, ...).
 * @param {'inicio'|'cierre'} kind
 * @param {{download?:boolean, returnDataUri?:boolean}} opts
 * @returns {Promise<string|void>} data-URI si returnDataUri, si no descarga.
 */
export async function generateProjectActaPDF(project, kind = 'inicio', { download = true, returnDataUri = false } = {}) {
  const insignia = await loadPngAsBase64('/img/Insignia.png');
  const doc = new jsPDF({ compress: true });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;
  let y = M;

  const isCierre = kind === 'cierre';
  const title = isCierre ? 'ACTA DE CIERRE DE PROYECTO' : 'ACTA DE INICIO DE PROYECTO';

  // ── Encabezado ──────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 28, 'F');
  if (insignia) {
    try { doc.addImage(insignia, 'PNG', M, 6, 16, 16); } catch { /* ignora */ }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, insignia ? M + 22 : M, 14);
  doc.setFontSize(9);
  doc.setTextColor(180, 190, 205);
  doc.text(`${project.code || ''}  ·  ${project.name || ''}`, insignia ? M + 22 : M, 21);
  y = 38;

  // ── Bloque de datos generales (tabla clave/valor) ───────────────────────
  const generalRows = [
    ['Nombre del proyecto', project.name || '—'],
    ['Cliente', project.clientName || '—'],
    ['Patrocinador', project.sponsor || '—'],
    ['Responsable', project.managerName || '—'],
    ['Estado', STATUS_LABEL[project.status] || project.status || '—'],
    ['Fecha de inicio', fmtDate(project.startDate)],
    ['Fecha de fin', fmtDate(project.endDate)],
    ['Presupuesto autorizado', money(project.budget)],
    ['Avance reportado', `${project.progress || 0}%`],
  ];
  if (isCierre) {
    generalRows.push(['Fecha de cierre', fmtDate(project.closedAt)]);
  }

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    body: generalRows,
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: DARK, cellWidth: 55 },
      1: { textColor: GRAY },
    },
    margin: { left: M, right: M },
  });
  y = doc.lastAutoTable.finalY + 6;

  // ── Helper: bloque de texto con título ──────────────────────────────────
  const textBlock = (label, text) => {
    if (!text) return;
    if (y > 260) { doc.addPage(); y = M; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY);
    doc.text(label.toUpperCase(), M, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(String(text), W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 4.5 + 5;
  };

  if (isCierre) {
    // Resumen de cierre
    const tasks = project.tasks || [];
    const done = tasks.filter(t => t.status === 'DONE').length;
    const spent = (project.costs || []).reduce((a, c) => a + (c.actual || 0), 0);
    autoTable(doc, {
      startY: y,
      head: [['Indicador de cierre', 'Resultado']],
      body: [
        ['Tareas completadas', `${done} de ${tasks.length}`],
        ['Presupuesto vs gasto real', `${money(project.budget)}  /  ${money(spent)}`],
        ['Variación de costo', money((project.budget || 0) - spent)],
        ['Riesgos registrados', String((project.risks || []).length)],
        ['Incidencias registradas', String((project.incidents || []).length)],
      ],
      headStyles: { fillColor: PRIMARY, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      margin: { left: M, right: M },
    });
    y = doc.lastAutoTable.finalY + 6;
    textBlock('Lecciones aprendidas', project.lessonsLearned);
    textBlock('Notas de cierre / Documentación final', project.closureNotes);
  } else {
    textBlock('Objetivo', project.objective);
    textBlock('Alcance', project.scope);
    textBlock('Justificación', project.justification);
    textBlock('Requerimientos', project.requirements);
    textBlock('Entregables', project.deliverables);
  }

  // ── Pie ─────────────────────────────────────────────────────────────────
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const H = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(
      `Documento generado por Olea Controls Platform · ${new Date().toLocaleDateString('es-MX')}`,
      W / 2, H - 8, { align: 'center' }
    );
    doc.text(`Página ${i} de ${pages}`, W - M, H - 8, { align: 'right' });
  }

  const fileName = `${isCierre ? 'ActaCierre' : 'ActaInicio'}-${project.code || 'proyecto'}.pdf`;
  if (returnDataUri) return doc.output('datauristring');
  if (download) doc.save(fileName);
}
