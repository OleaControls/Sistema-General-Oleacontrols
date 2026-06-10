import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PERSONAL_LABELS = {
  uniform:      'Uniforme completo',
  epp:          'EPP (casco, lentes, guantes, botas)',
  toolsBasic:   'Herramientas básicas',
  toolsSpecial: 'Herramientas especiales',
  materials:    'Materiales / Refacciones',
};

const VEHICLE_LABELS = {
  fuel:          'Combustible suficiente',
  cleanInterior: 'Limpieza interior',
  cleanExterior: 'Estética exterior',
  odometer:      'Tacómetro / Odómetro',
  functionality: 'Funcionalidad (luces, frenos, motor)',
};

/**
 * Genera y descarga el PDF de reporte de asistencia.
 * @param {object} log       - TechAttendanceLog
 * @param {string} techName  - Nombre del técnico
 * @param {object} goal      - TechDailyGoal (puede ser null)
 * @param {'personal'|'vehicle'|'both'} type - qué secciones incluir
 */
export function generateAttendanceReportPDF(log, techName, goal, type = 'both') {
  const doc = new jsPDF({ compress: true });
  const W   = doc.internal.pageSize.getWidth();
  const M   = 15;
  let y     = M;

  const dateStr = new Date(log.date || log.createdAt)
    .toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // ── Franja de encabezado ────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39); // gray-900
  doc.roundedRect(M, y, W - M * 2, 28, 4, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('REPORTE DE INCIDENCIAS — ASISTENCIA', M + 6, y + 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('OleaControls · Sistema de Gestión', M + 6, y + 17);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, M + 6, y + 23);

  y += 36;

  // ── Datos del técnico ───────────────────────────────────────────────────────
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(M, y, W - M * 2, 28, 3, 3, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(M, y, W - M * 2, 28, 3, 3, 'S');

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('TÉCNICO', M + 5, y + 7);
  doc.text('FECHA', M + 65, y + 7);
  doc.text('HORA DE ENTRADA', M + 115, y + 7);

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(techName || '—', M + 5, y + 16);
  doc.text(dateStr, M + 65, y + 16);
  doc.text(log.checkInTime || '—', M + 115, y + 16);

  if (goal) {
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE / META DEL DÍA', M + 5, y + 24);
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${goal.clientName}${goal.clientLocation ? '  ·  ' + goal.clientLocation : ''}`,
      M + 5, y + 31
    );
    y += 10;
  }

  y += 36;

  // ── Helper: sección de checklist ────────────────────────────────────────────
  const renderChecklistSection = (title, color, checklist, labels, missingText, isOdometer = false) => {
    // Título de sección
    doc.setFillColor(...color);
    doc.roundedRect(M, y, W - M * 2, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title.toUpperCase(), M + 5, y + 7);
    y += 14;

    // Filas del checklist
    const rows = Object.entries(labels).map(([key, label]) => {
      const val = checklist?.[key];
      if (key === 'odometer') {
        const km = val != null && val !== '' ? `${Number(val).toLocaleString()} km` : '—';
        return [label, km, ''];
      }
      const status = val === true ? 'OK' : val === false ? 'FALTANTE' : 'Sin responder';
      return [label, status, ''];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Ítem', 'Estado / Valor', '']],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99], fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 0 },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === 'body') {
          const v = data.cell.raw;
          if (v === 'OK')        { data.cell.styles.textColor = [5, 150, 105]; }
          if (v === 'FALTANTE')  { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fillColor = [254, 242, 242]; }
        }
      },
    });

    y = doc.lastAutoTable.finalY + 6;

    // Notas de faltantes
    if (missingText) {
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(M, y, W - M * 2, 16, 2, 2, 'FD');
      doc.setTextColor(146, 64, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('OBSERVACIONES / FALTANTES:', M + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(missingText, M + 4, y + 13, { maxWidth: W - M * 2 - 8 });
      y += 22;
    }

    y += 4;
  };

  // ── Sección Equipo Personal ─────────────────────────────────────────────────
  if ((type === 'personal' || type === 'both') && log.checklistPersonal) {
    renderChecklistSection(
      'Checklist — Uniforme · EPP · Herramientas',
      [37, 99, 235],
      log.checklistPersonal,
      PERSONAL_LABELS,
      log.personalMissing,
    );
  }

  // ── Sección Vehículo ────────────────────────────────────────────────────────
  if ((type === 'vehicle' || type === 'both') && log.checklistVehicle) {
    renderChecklistSection(
      'Checklist — Vehículo',
      [79, 70, 229],
      log.checklistVehicle,
      VEHICLE_LABELS,
      log.vehicleMissing,
    );
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.line(M, 287, W - M, 287);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('OleaControls — Reporte generado automáticamente por el Sistema de Asistencia', M, 292);
    doc.text(`Pág. ${i} / ${pageCount}`, W - M, 292, { align: 'right' });
  }

  // ── Nombre de archivo y descarga ────────────────────────────────────────────
  const safeName = (techName || 'tecnico').replace(/\s+/g, '_');
  const dateISO  = new Date(log.date || log.createdAt).toISOString().slice(0, 10);
  doc.save(`Reporte_Asistencia_${safeName}_${dateISO}.pdf`);
}
