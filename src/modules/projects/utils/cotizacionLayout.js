import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ═══════════════════════════════════════════════════════════════════════════
// FORMATO OFICIAL DE COTIZACIÓN
// Port exacto del PDF que genera el cotizador del CRM (api/_handlers/quotes.js)
// para que las calculadoras entreguen el mismo documento: mismo logo, misma
// caja de referencias, misma tabla, mismos recuadros de descuentos y totales,
// mismo pie de página.
//
// Allá corre en el servidor (lee el logo con fs y sube el PDF a R2); aquí corre
// en el navegador, así que el logo se descarga con fetch y el archivo se baja
// con doc.save(). El dibujo es el mismo, medida por medida.
//
// Se alimenta con un objeto con la misma forma que un Quote del CRM:
//   { quoteNumber, createdAt, validUntil, templateType, client:{...},
//     contactName, projectName, creator:{name}, seller:{name},
//     requirements, terms, observations, benefits,
//     items:[{ serial, name, desc, qty, price }],
//     subtotal, tax, adjustment, total }
// ═══════════════════════════════════════════════════════════════════════════

const DARK = [25, 25, 25];
const GRAY = [110, 110, 110];

export const fmtMXN = (n) =>
  `MX$ ${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/** Descarga una imagen del sitio y la deja lista para addImage. */
export const loadPngAsBase64 = async (url) => {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
};

/**
 * Dibuja la cotización con el formato del CRM.
 *
 * @param {object} quote  Cotización normalizada (ver arriba).
 * @param {object} [opts]
 * @param {string} [opts.logo]  Data URI del logo (public/img/OLEACONTROLS.png).
 * @returns {jsPDF} documento listo para guardar o exportar.
 */
/**
 * @param {object} quote
 * @param {object} [opts]
 * @param {string} [opts.logo]
 * @param {boolean} [opts.showBenefits=true]  Hoja final "Motivos para elegir
 *        con confianza". Las cotizaciones comerciales la llevan; las de
 *        ingeniería (cotizador de edificios) no, porque se entregan a un
 *        cliente que ya contrató.
 */
export function buildQuotePDF(quote, { logo = null, showBenefits = true } = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const margin = 18;
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const cW = pageW - margin * 2;

  const tpl = quote.templateType || 'PRESUPUESTO';
  const isPre = tpl === 'PRESUPUESTO';

  // Colores según plantilla: azul para PRESUPUESTO, verde para PREFACTURA
  const BLUE = isPre ? [0, 91, 187] : [22, 130, 60];
  const LIGHT = isPre ? [243, 246, 252] : [240, 253, 244];

  // ── LOGO ──────────────────────────────────────────────────────────────────
  if (logo) {
    try { doc.addImage(logo, 'PNG', margin, 10, 60, 7); } catch { /* ignora */ }
  }

  // ── QUOTE BOX (arriba derecha) ────────────────────────────────────────────
  const bxX = pageW - margin - 72;
  const bxY = 8;
  doc.setFillColor(...BLUE);
  doc.roundedRect(bxX, bxY, 72, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(isPre ? 'REFERENCIAS DE PROYECTO' : 'PREFACTURA', bxX + 36, bxY + 6.3, { align: 'center' });

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
  doc.text(String(quote.quoteNumber || '—'), bxX + 14, bxY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text('Fecha:', bxX + 4, bxY + 21);
  doc.text(fmtDate(quote.createdAt), bxX + 17, bxY + 21);
  doc.text('Vigente:', bxX + 4, bxY + 27);
  doc.text(fmtDate(quote.validUntil), bxX + 19, bxY + 27);

  // ── DATOS EMPRESA (izquierda, abajo del logo) ─────────────────────────────
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

  // ── FACTURAR A / DETALLES DEL PROYECTO ───────────────────────────────────
  y = 52;
  const colMid = pageW / 2 + 2;

  const details = [
    ['Proyecto:', quote.projectName || '—'],
    ['Elaboró:', quote.creator?.name || '—'],
    [isPre ? 'Asesor:' : 'Vendedor:', quote.seller?.name || 'No asignado'],
  ];
  let yR = 52 + 5;
  details.forEach(([, val]) => {
    const lines = doc.splitTextToSize(val, pageW - margin - colMid - 28);
    yR += Math.max(lines.length * 3.8, 5);
  });
  const maxHeaderY = yR;

  // — Izquierda: cliente
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text(isPre ? 'CLIENTE:' : 'FACTURAR A:', margin, y);

  y += 5;
  const contactDisplay = quote.contactName || quote.client?.contactName || '';
  if (contactDisplay) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(contactDisplay.toUpperCase(), margin, y);
    y += 5;
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text((quote.client?.companyName || 'Cliente').toUpperCase(), margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  y += 4;
  if (quote.client?.rfc && y < maxHeaderY) {
    doc.setTextColor(...GRAY);
    doc.text(`RFC: ${quote.client.rfc}`, margin, y);
    y += 4;
  }
  if (quote.client?.address && y < maxHeaderY) {
    doc.setTextColor(...DARK);
    const addrLines = doc.splitTextToSize(quote.client.address, colMid - margin - 6);
    doc.text(addrLines, margin, y);
    y += addrLines.length * 3.8;
  }
  if (quote.client?.email && y < maxHeaderY) {
    doc.setTextColor(...GRAY);
    doc.text(quote.client.email, margin, y);
    y += 4;
  }
  if (quote.client?.phone && y < maxHeaderY) {
    doc.text(quote.client.phone, margin, y);
    y += 4;
  }

  // — Derecha: proyecto
  yR = 52;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('DETALLES DEL PROYECTO:', colMid, yR);
  yR += 5;

  doc.setFontSize(7.5);
  details.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text(label, colMid, yR);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(val, pageW - margin - colMid - 28);
    doc.text(lines, colMid + 26, yR);
    yR += Math.max(lines.length * 3.8, 5);
  });

  // ── REQUERIMIENTOS DEL CLIENTE ────────────────────────────────────────────
  let tableStartY = Math.max(Math.min(y, maxHeaderY), yR) + 6;

  if (quote.requirements && quote.requirements.trim()) {
    const reqText = quote.requirements.trim();
    const lineH = 4.2;
    const reqLines = doc.splitTextToSize(reqText, cW - 10);

    let reqLinesLeft = [...reqLines];
    let firstReqChunk = true;
    while (reqLinesLeft.length > 0) {
      const availH = pageH - 15 - tableStartY;
      const labelH = 7;
      const padH = 5;
      const maxLines = Math.max(1, Math.floor((availH - labelH - padH) / lineH));
      const chunk = reqLinesLeft.splice(0, maxLines);
      const contentH = chunk.length * lineH + padH;
      const reqH = labelH + contentH;

      if (tableStartY + reqH > pageH - 15) {
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
      doc.text(firstReqChunk ? 'REQUERIMIENTOS DEL CLIENTE:' : 'REQUERIMIENTOS (cont.):',
        margin + cW / 2, tableStartY + 4.8, { align: 'center' });

      doc.setFillColor(...LIGHT);
      doc.setDrawColor(...BLUE);
      doc.rect(margin, tableStartY + labelH, cW, contentH, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...DARK);
      doc.text(chunk, margin + 4, tableStartY + labelH + 4);

      tableStartY += reqH + 5;
      firstReqChunk = false;

      if (reqLinesLeft.length > 0) {
        doc.addPage();
        tableStartY = 20;
      }
    }
  }

  // ── TABLA DE CONCEPTOS ────────────────────────────────────────────────────
  const items = Array.isArray(quote.items) ? quote.items : [];
  const tableBody = items.map((item, i) => [
    { content: String(i + 1).padStart(2, '0'), styles: { halign: 'center', fontStyle: 'bold' } },
    { content: item.serial || '—', styles: { halign: 'center' } },
    { content: item.desc ? `${item.name}\n${item.desc}` : item.name },
    { content: String(item.qty), styles: { halign: 'center' } },
    { content: fmtMXN(item.price), styles: { halign: 'right' } },
    { content: fmtMXN(parseFloat(item.price) * parseFloat(item.qty || 1)), styles: { halign: 'right', fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Nº', 'Serie', 'Servicio / Descripción', 'Cantidad', 'Precio Unit.', 'Total']],
    body: tableBody,
    theme: 'grid',
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
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

  // ── BLOQUE TOTALES + TÉRMINOS ─────────────────────────────────────────────
  const totW = 82;
  const totX = pageW - margin - totW;
  // El renglón de promoción solo aparece cuando de verdad hay un ajuste: un
  // "Promoción $0.00" en una cotización de ingeniería confunde más que informa.
  const rows = [
    ['Subtotal', fmtMXN(quote.subtotal || 0)],
    ['Impuesto (IVA)', fmtMXN(quote.tax || 0)],
  ];
  if (Number(quote.adjustment || 0) !== 0) {
    rows.push(['Promoción', fmtMXN(quote.adjustment)]);
  }
  const rowH = 6.5;
  const headerH = 8;
  const totH = headerH + rows.length * rowH + 9;

  const payOpts = [
    { label: 'Pago Inmediato 24Hrs', pct: '5% de descuento' },
    { label: 'Pago Preferente', pct: '3% de descuento' },
    { label: 'Pago Programado', pct: '1% de descuento' },
  ];

  let afterTableY = (doc.lastAutoTable?.finalY ?? tableStartY) + 6;
  const discBoxH_est = 7 + payOpts.length * 6.2;
  const termsLines_est = quote.terms
    ? doc.splitTextToSize(quote.terms, (pageW - margin * 2) / 2 - 6).length
    : 0;
  const leftColH_est = (termsLines_est > 0 ? 10 + termsLines_est * 3.5 + 5 : 0) + discBoxH_est + 10;
  const spaceNeeded = Math.max(totH, leftColH_est) + 20;
  if (afterTableY + spaceNeeded > pageH - 15) {
    doc.addPage();
    afterTableY = 20;
  }

  const termsColW = totX - margin - 6;
  let termsBottomY = afterTableY;
  if (quote.terms) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text('TÉRMINOS Y CONDICIONES:', margin, afterTableY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const termsLines = doc.splitTextToSize(quote.terms, termsColW);
    const lineH3 = 3.5;
    const maxTermsY = pageH - 15;
    const availLines = Math.max(1, Math.floor((maxTermsY - (afterTableY + 5)) / lineH3));
    doc.text(termsLines.slice(0, availLines), margin, afterTableY + 5);
    termsBottomY = Math.min(afterTableY + 5 + termsLines.length * lineH3, maxTermsY - 2);
  }

  const discW = totX - margin - 6;
  const discBoxH = 7 + payOpts.length * 6.2;
  const boxStartY = termsBottomY + (quote.terms ? 5 : 0);

  // Recuadro de descuentos (izquierda)
  doc.setFillColor(245, 248, 255);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, boxStartY, discW, discBoxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...BLUE);
  doc.text('DESCUENTOS POR PAGO ANTICIPADO', margin + discW / 2, boxStartY + 4.5, { align: 'center' });
  payOpts.forEach((opt, i) => {
    const ry = boxStartY + 9 + i * 6.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(opt.label, margin + 4, ry);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    doc.text(opt.pct, margin + discW - 4, ry, { align: 'right' });
  });

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
  doc.text('INVERSIÓN TOTAL', totX + 4, ty + 6);
  doc.setFontSize(9);
  doc.text(fmtMXN(quote.total || 0), totX + totW - 4, ty + 6, { align: 'right' });

  const totBottomY = ty + 12;
  termsBottomY = boxStartY + discBoxH;

  // ── OBSERVACIONES ────────────────────────────────────────────────────────
  let afterTotalsY = Math.max(totBottomY, termsBottomY);
  if (quote.observations && quote.observations.trim()) {
    const obsText = quote.observations.trim();
    const lineH = 4.5;
    const obsLines = doc.splitTextToSize(obsText, cW - 10);
    const obsHeaderH = 9;
    const footerPad = 5;

    afterTotalsY += 6;

    const fullObsH = obsHeaderH + obsLines.length * lineH + footerPad;
    if (afterTotalsY + fullObsH > pageH - 15) {
      doc.addPage();
      afterTotalsY = 20;
    }

    let linesLeft = [...obsLines];
    let firstChunk = true;
    while (linesLeft.length > 0) {
      const availH = pageH - 15 - afterTotalsY;
      const maxLines = Math.max(1, Math.floor((availH - obsHeaderH - footerPad) / lineH));
      const chunk = linesLeft.splice(0, maxLines);
      const chunkH = obsHeaderH + chunk.length * lineH + footerPad;

      doc.setFillColor(248, 248, 250);
      doc.setDrawColor(200, 200, 210);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, afterTotalsY, cW, chunkH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(firstChunk ? 'OBSERVACIONES:' : 'OBSERVACIONES (cont.):', margin + 4, afterTotalsY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...DARK);
      doc.text(chunk, margin + 4, afterTotalsY + obsHeaderH);

      afterTotalsY += chunkH;
      firstChunk = false;

      if (linesLeft.length > 0) {
        doc.addPage();
        afterTotalsY = 20;
      }
    }
  }

  // ── DATOS BANCARIOS (solo PREFACTURA) ────────────────────────────────────
  if (!isPre) {
    let bankY = afterTotalsY + 8;
    if (bankY + 42 > pageH - 15) {
      doc.addPage();
      bankY = 20;
    }

    const bankH = 42;
    doc.setFillColor(237, 244, 255);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, bankY, cW, bankH, 3, 3, 'FD');

    doc.setFillColor(...BLUE);
    doc.roundedRect(margin, bankY, cW, 9, 3, 3, 'F');
    doc.rect(margin, bankY + 5, cW, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('DATOS BANCARIOS PARA TRANSFERENCIA', margin + cW / 2, bankY + 6, { align: 'center' });

    const bankRows = [
      ['Razón Social:', 'OLEA CONTROLS MÉXICO, S.A. DE C.V.'],
      ['RFC:', 'OCM090623GR8'],
      ['Banco:', 'Banco Nacional de México, S.A. (BANAMEX)'],
      ['Sucursal:', '384 – Mariano Escobedo'],
      ['Cuenta:', '0384-6105270'],
      ['CLABE:', '002180038461052707'],
    ];

    doc.setFontSize(7.5);
    const c1X = margin + 5;
    const c2X = margin + cW / 2 + 5;
    let byL = bankY + 16;
    let byR = bankY + 16;

    bankRows.forEach((row, i) => {
      const xL = i < 3 ? c1X : c2X;
      const cur = i < 3 ? byL : byR;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLUE);
      doc.text(row[0], xL, cur);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text(row[1], xL + 23, cur);

      if (i < 3) byL += 7;
      else byR += 7;
    });

    doc.setDrawColor(190, 210, 240);
    doc.setLineWidth(0.3);
    doc.line(margin + cW / 2, bankY + 11, margin + cW / 2, bankY + bankH - 4);
  }

  // ── BENEFICIOS — hoja nueva, solo si la cotización la lleva ──────────────
  let benefY = afterTotalsY + 8;

  if (showBenefits) {
    doc.addPage();
    benefY = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...BLUE);
    doc.text('Motivos para elegir con confianza', margin, benefY + 6);

    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.6);
    doc.line(margin, benefY + 9, margin + 38, benefY + 9);
    doc.setLineWidth(0.2);
    doc.setDrawColor(210, 220, 235);
    doc.line(margin + 40, benefY + 9, margin + cW, benefY + 9);

    benefY += 18;

    if (quote.benefits && quote.benefits.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const benefLines = doc.splitTextToSize(quote.benefits.trim(), cW - 12);
      const benefH = 10 + benefLines.length * 5.2 + 8;

      doc.setFillColor(240, 246, 255);
      doc.setDrawColor(...BLUE);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, benefY, cW, benefH, 3, 3, 'FD');

      doc.setTextColor(...DARK);
      doc.text(benefLines, margin + 6, benefY + 10);

      benefY += benefH + 14;
    } else {
      const benefH = 120;
      const lineSpacing = 9;
      const lineCount = Math.floor((benefH - 10) / lineSpacing);

      doc.setFillColor(252, 253, 255);
      doc.setDrawColor(180, 195, 220);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, benefY, cW, benefH, 3, 3, 'FD');

      doc.setDrawColor(215, 225, 240);
      doc.setLineWidth(0.2);
      for (let ln = 0; ln < lineCount; ln++) {
        const ly = benefY + 12 + ln * lineSpacing;
        doc.line(margin + 6, ly, margin + cW - 6, ly);
      }

      benefY += benefH + 14;
    }
  }

  // ── IMÁGENES DE PRODUCTOS ─────────────────────────────────────────────────
  const itemsWithImages = items.filter(item => item.imageBase64);
  if (itemsWithImages.length > 0) {
    let imgSectY = benefY;

    const imgW = 53;
    const imgH = 44;
    const nameH = 10;
    const colGap = 6;
    const cols = 3;
    const rowsCount = Math.ceil(itemsWithImages.length / cols);
    const needed = 22 + rowsCount * (imgH + nameH + 6);

    if (imgSectY + needed > pageH - 15) {
      doc.addPage();
      imgSectY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...BLUE);
    doc.text('Productos', margin, imgSectY + 6);

    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.6);
    doc.line(margin, imgSectY + 9, margin + 30, imgSectY + 9);
    doc.setLineWidth(0.2);
    doc.setDrawColor(210, 220, 235);
    doc.line(margin + 32, imgSectY + 9, margin + cW, imgSectY + 9);

    imgSectY += 16;

    let col = 0;
    let rowY = imgSectY;
    for (const item of itemsWithImages) {
      const x = margin + col * (imgW + colGap);

      doc.setFillColor(248, 249, 253);
      doc.setDrawColor(215, 220, 230);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, rowY, imgW, imgH, 2, 2, 'FD');

      try {
        let imgData = item.imageBase64;
        if (imgData && imgData.startsWith('data:')) {
          const commaIdx = imgData.indexOf(',');
          if (commaIdx !== -1) imgData = imgData.slice(commaIdx + 1);
        }
        if (imgData) doc.addImage(imgData, 'PNG', x + 1, rowY + 1, imgW - 2, imgH - 2);
      } catch { /* la imagen no bloquea el PDF */ }

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      const nameLines = doc.splitTextToSize(item.name || '—', imgW);
      doc.text(nameLines.slice(0, 2), x + imgW / 2, rowY + imgH + 5, { align: 'center' });

      if (item.serial) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...GRAY);
        doc.text(item.serial, x + imgW / 2, rowY + imgH + 5 + (nameLines.slice(0, 2).length * 3.5), { align: 'center' });
      }

      col++;
      if (col >= cols) {
        col = 0;
        rowY += imgH + nameH + 8;
        if (rowY + imgH + nameH > pageH - 20) {
          doc.addPage();
          rowY = 20;
        }
      }
    }
  }

  // ── FOOTER EN TODAS LAS PÁGINAS ──────────────────────────────────────────
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

/** Vigencia por omisión de las cotizaciones que salen de las calculadoras. */
export const vigenciaDias = (dias = 30, desde = new Date()) => {
  const d = new Date(desde);
  d.setDate(d.getDate() + dias);
  return d;
};

/** Nombre de archivo sin acentos ni espacios. */
export const slug = (s) => (s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Genera y entrega el PDF con el formato del CRM.
 * @returns {Promise<string|void>} data URI cuando se pide, si no descarga.
 */
export async function renderQuotePDF(quote, {
  fileName, download = true, returnDataUri = false, showBenefits = true,
} = {}) {
  const logo = await loadPngAsBase64('/img/OLEACONTROLS.png');
  const doc = buildQuotePDF(quote, { logo, showBenefits });
  if (returnDataUri) return doc.output('datauristring');
  if (download) doc.save(fileName || `${slug(quote.quoteNumber) || 'cotizacion'}.pdf`);
}
