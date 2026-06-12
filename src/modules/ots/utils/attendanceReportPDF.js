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

// ── Helpers de carga de imágenes ────────────────────────────────────────────

const loadPngAsBase64 = async (url) => {
  try {
    const res  = await fetch(url, { cache: 'no-store' });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/**
 * Genera y descarga el PDF de reporte de asistencia.
 * @param {object} log       - TechAttendanceLog
 * @param {string} techName  - Nombre del técnico
 * @param {object} goal      - TechDailyGoal (puede ser null)
 * @param {'personal'|'vehicle'|'both'} type - qué secciones incluir
 */
export async function generateAttendanceReportPDF(log, techName, goal, type = 'both') {

  // ── Carga de logo ───────────────────────────────────────────────────────────
  const insigniaUrl = await loadPngAsBase64('/img/Insignia.png');

  const doc = new jsPDF({ compress: true });
  const W   = doc.internal.pageSize.getWidth();
  const M   = 15;
  let y     = M;

  // Extraer solo la parte YYYY-MM-DD y renderizar a mediodía UTC para evitar
  // el desfase de zona horaria (midnight UTC = día anterior en UTC-6)
  const _rawDate  = log.date || log.createdAt;
  const _dateOnly = new Date(_rawDate).toISOString().slice(0, 10);
  const dateStr   = new Date(_dateOnly + 'T12:00:00Z')
    .toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // ── Helper: insertar imagen sin deformar ────────────────────────────────────
  const addImageFit = (dataUrl, x, imgY, maxW, maxH, opts = {}) => {
    if (!dataUrl) return;
    try {
      const fmt   = dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      const props = doc.getImageProperties(dataUrl);
      const ratio = Math.min(maxW / (props.width || 1), maxH / (props.height || 1));
      const w  = props.width  * ratio;
      const h  = props.height * ratio;
      const dx = opts.align  === 'center' ? (maxW - w) / 2 : 0;
      const dy = opts.valign === 'middle' ? (maxH - h) / 2 : 0;
      doc.addImage(dataUrl, fmt, x + dx, imgY + dy, w, h, undefined, 'FAST');
    } catch { /* logo no disponible */ }
  };

  // ── Header ──────────────────────────────────────────────────────────────────
  // Franja superior azul
  doc.setFillColor(29, 78, 216);           // blue-700
  doc.rect(0, 0, W, 3, 'F');

  // Cuerpo principal del header
  const headerH = 44;
  doc.setFillColor(15, 23, 42);            // slate-900
  doc.rect(0, 3, W, headerH, 'F');

  // Separador diagonal decorativo — divide el header en zona empresa / zona documento
  const divX = 88;
  doc.setFillColor(23, 37, 63);            // ligeramente más claro
  doc.triangle(divX, 3, divX + 18, 3, divX, 3 + headerH, 'F');
  doc.setFillColor(15, 23, 42);
  doc.triangle(divX + 18, 3, divX + 18, 3 + headerH, divX, 3 + headerH, 'F');

  // — ZONA IZQUIERDA: logo + nombre empresa —
  if (insigniaUrl) {
    addImageFit(insigniaUrl, M, 8, 28, 28, { align: 'center', valign: 'middle' });
  }

  const brandX = M + 33;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OLEACONTROLS', brandX, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);         // slate-500
  doc.text('Sistema de Gestión Operativa', brandX, 30);
  doc.text('Control de Asistencia Técnica', brandX, 37);

  // — ZONA DERECHA: título del documento —
  const docZoneX = divX + 24;
  const docZoneW = W - docZoneX - M;

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('REPORTE DE ASISTENCIA', docZoneX + docZoneW / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);         // slate-400
  doc.text('Control de Incidencias', docZoneX + docZoneW / 2, 28, { align: 'center' });

  // Línea separadora fina
  doc.setDrawColor(51, 65, 85);            // slate-700
  doc.setLineWidth(0.3);
  doc.line(docZoneX, 32, W - M, 32);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, docZoneX + docZoneW / 2, 39, { align: 'center' });

  // Franja inferior azul del header
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 3 + headerH, W, 3, 'F');

  y = 3 + headerH + 3 + 11;               // tiras + header + padding

  // ── Tarjeta de datos del técnico ────────────────────────────────────────────
  const cardH = goal ? 44 : 30;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, W - M * 2, cardH, 4, 4, 'FD');

  // Barra lateral izquierda
  doc.setFillColor(29, 78, 216);
  doc.roundedRect(M, y, 4, cardH, 2, 2, 'F');

  const col1 = M + 10;
  const col2 = M + 72;
  const col3 = M + 144;

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TÉCNICO', col1, y + 9);
  doc.text('FECHA', col2, y + 9);
  doc.text('HORA ENTRADA', col3, y + 9);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(doc.splitTextToSize(techName || '—', col2 - col1 - 4)[0], col1, y + 19);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, col2, y + 19);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(log.checkInTime || '—', col3, y + 19);

  if (goal) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(M + 8, y + 24, W - M - 4, y + 24);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE / META DEL DÍA', col1, y + 31);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    const clientStr = `${goal.clientName}${goal.clientLocation ? '  ·  ' + goal.clientLocation : ''}`;
    doc.text(doc.splitTextToSize(clientStr, W - M * 2 - 14)[0], col1, y + 40);
  }

  y += cardH + 8;

  // Badge tipo de reporte
  const typeLabel  = type === 'personal' ? 'Equipo Personal' : type === 'vehicle' ? 'Vehículo' : 'Reporte Completo';
  const badgeW     = 62;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(147, 197, 253);
  doc.setLineWidth(0.4);
  doc.roundedRect(W - M - badgeW, y, badgeW, 9, 2, 2, 'FD');
  doc.setTextColor(29, 78, 216);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(typeLabel, W - M - badgeW / 2, y + 6.3, { align: 'center' });
  y += 13;

  // ── Helper: sección de checklist ────────────────────────────────────────────
  const renderChecklistSection = (title, accentRgb, checklist, labels, missingText) => {
    // Encabezado de sección con borde izquierdo de acento
    doc.setFillColor(241, 245, 249);       // slate-100
    doc.setDrawColor(...accentRgb);
    doc.setLineWidth(0);
    doc.roundedRect(M, y, W - M * 2, 12, 2, 2, 'F');
    doc.setFillColor(...accentRgb);
    doc.roundedRect(M, y, 5, 12, 2, 2, 'F');

    doc.setTextColor(...accentRgb);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(title.toUpperCase(), M + 10, y + 8.2);
    y += 14;

    // Tabla
    const rows = Object.entries(labels).map(([key, label]) => {
      const val = checklist?.[key];
      if (key === 'odometer') {
        const km = val != null && val !== '' ? `${Number(val).toLocaleString()} km` : '—';
        return [label, km];
      }
      const status = val === true ? 'OK' : val === false ? 'FALTANTE' : 'Sin responder';
      return [label, status];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Ítem de verificación', 'Estado']],
      body: rows,
      theme: 'plain',
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        font: 'helvetica',
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [71, 85, 105],
        fontStyle: 'bold',
        fontSize: 7,
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 'auto', halign: 'center', fontStyle: 'bold' },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === 'body') {
          const v = data.cell.raw;
          if (v === 'OK') {
            data.cell.styles.textColor  = [5, 150, 105];
            data.cell.styles.fillColor  = [236, 253, 245];
          }
          if (v === 'FALTANTE') {
            data.cell.styles.textColor  = [220, 38, 38];
            data.cell.styles.fillColor  = [254, 242, 242];
          }
        }
      },
    });

    y = doc.lastAutoTable.finalY + 5;

    // Caja de observaciones
    if (missingText) {
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.roundedRect(M, y, W - M * 2, 20, 3, 3, 'FD');

      doc.setFillColor(245, 158, 11);
      doc.roundedRect(M, y, 5, 20, 2, 2, 'F');

      doc.setTextColor(146, 64, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('OBSERVACIONES:', M + 9, y + 7.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(
        doc.splitTextToSize(missingText, W - M * 2 - 14)[0],
        M + 9, y + 15.5
      );
      y += 26;
    }

    y += 6;
  };

  // ── Sección Equipo Personal ─────────────────────────────────────────────────
  if ((type === 'personal' || type === 'both') && log.checklistPersonal) {
    renderChecklistSection(
      'Checklist — Uniforme · EPP · Herramientas',
      [29, 78, 216],
      log.checklistPersonal,
      PERSONAL_LABELS,
      log.personalMissing,
    );
  }

  // ── Sección Vehículo ────────────────────────────────────────────────────────
  if ((type === 'vehicle' || type === 'both') && log.checklistVehicle) {
    renderChecklistSection(
      'Checklist — Vehículo',
      [109, 40, 217],
      log.checklistVehicle,
      VEHICLE_LABELS,
      log.vehicleMissing,
    );
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();

    // Franja superior del footer
    doc.setFillColor(29, 78, 216);
    doc.rect(0, pH - 16, W, 1.5, 'F');

    // Fondo del footer
    doc.setFillColor(15, 23, 42);
    doc.rect(0, pH - 14.5, W, 14.5, 'F');

    // Insignia pequeña en el footer
    if (insigniaUrl) {
      addImageFit(insigniaUrl, M, pH - 13, 9, 9, { align: 'center', valign: 'middle' });
    }

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('OleaControls — Reporte generado automáticamente por el Sistema de Gestión', M + 12, pH - 6);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`${i} / ${pageCount}`, W - M, pH - 6, { align: 'right' });
  }

  // ── Descarga y devuelve blob ──────────────────────────────────────────────────
  const safeName = (techName || 'tecnico').replace(/\s+/g, '_');
  const dateISO  = new Date(log.date || log.createdAt).toISOString().slice(0, 10);
  const filename = `Reporte_Asistencia_${safeName}_${dateISO}.pdf`;
  doc.save(filename);
  return { blob: doc.output('blob'), filename };
}
