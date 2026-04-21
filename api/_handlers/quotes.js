import prisma from '../_lib/prisma.js'
import { uploadToR2 } from '../_lib/r2.js'
import { authMiddleware } from '../_lib/auth.js'
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

async function generateQuotePDF(quote) {
  try {
    const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const BLUE    = [0, 91, 187];
    const DARK    = [25, 25, 25];
    const GRAY    = [110, 110, 110];
    const LIGHT   = [243, 246, 252];
    const margin  = 18;
    const pageW   = doc.internal.pageSize.width;   // 215.9 mm
    const pageH   = doc.internal.pageSize.height;  // 279.4 mm
    const cW      = pageW - margin * 2;

    const fmtMXN = (n) =>
      `MX$ ${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

    // ── LOGO ──────────────────────────────────────────────────────────────────
    try {
      const logoPath = path.join(process.cwd(), 'public', 'img', 'OLEACONTROLS.png');
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath).toString('base64');
        doc.addImage(`data:image/png;base64,${logoData}`, 'PNG', margin, 10, 68, 15);
      }
    } catch (_) {}

    // ── QUOTE BOX (arriba derecha) ────────────────────────────────────────────
    const bxX = pageW - margin - 72;
    const bxY = 8;
    doc.setFillColor(...BLUE);
    doc.roundedRect(bxX, bxY, 72, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text('PRESUPUESTO', bxX + 36, bxY + 6.3, { align: 'center' });

    doc.setFillColor(...LIGHT);
    doc.roundedRect(bxX, bxY + 9, 72, 20, 0, 0, 'F');
    doc.roundedRect(bxX, bxY + 9, 72, 20, 0, 2, 'FD');
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.3);
    doc.roundedRect(bxX, bxY, 72, 29, 2, 2, 'D');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(`No.:`, bxX + 4, bxY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(quote.quoteNumber, bxX + 14, bxY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha:`, bxX + 4, bxY + 21);
    doc.text(fmtDate(quote.createdAt), bxX + 17, bxY + 21);
    doc.text(`Vigente:`, bxX + 4, bxY + 27);
    doc.text(fmtDate(quote.validUntil), bxX + 19, bxY + 27);

    // ── DATOS EMPRESA (izquierda, abajo del logo) ─────────────────────────────
    let y = 30;
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

    // — Izquierda: cliente
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    doc.text('FACTURAR A:', margin, y);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    y += 5;
    doc.text(quote.client?.companyName || 'Cliente', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    y += 4;
    if (quote.client?.rfc) { doc.setTextColor(...GRAY); doc.text(`RFC: ${quote.client.rfc}`, margin, y); y += 4; }
    if (quote.client?.address) {
      doc.setTextColor(...DARK);
      const addrLines = doc.splitTextToSize(quote.client.address, colMid - margin - 6);
      doc.text(addrLines, margin, y);
      y += addrLines.length * 3.8;
    }
    if (quote.client?.email)  { doc.setTextColor(...GRAY); doc.text(quote.client.email,  margin, y); y += 4; }
    if (quote.client?.phone)  { doc.text(quote.client.phone, margin, y); }

    // — Derecha: proyecto
    let yR = 52;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    doc.text('DETALLES DEL PROYECTO:', colMid, yR);
    yR += 5;

    const details = [
      ['Proyecto:',    quote.projectName               || '—'],
      ['Contacto:',    quote.contactName || quote.client?.contactName || '—'],
      ['Responsable:', quote.creator?.name             || '—'],
      ['Vendedor:',    quote.seller?.name              || 'No asignado'],
    ];
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

    // ── TABLA DE CONCEPTOS ────────────────────────────────────────────────────
    const tableStartY = Math.max(y, yR) + 8;

    const tableBody = quote.items.map((item, i) => [
      { content: String(i + 1).padStart(2, '0'), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: item.serial || '—', styles: { halign: 'center' } },
      { content: item.desc ? `${item.name}\n${item.desc}` : item.name },
      { content: String(item.qty), styles: { halign: 'center' } },
      { content: fmtMXN(item.price), styles: { halign: 'right' } },
      { content: fmtMXN(parseFloat(item.price) * parseInt(item.qty || 1)), styles: { halign: 'right', fontStyle: 'bold' } },
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: [['Nº', 'Serie', 'Servicio / Descripción', 'Cantidad', 'Precio Unit.', 'Total']],
      body: tableBody,
      theme: 'grid',
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 9,  halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
      },
      headStyles: {
        fillColor: BLUE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
        cellPadding: 3,
      },
      bodyStyles:          { fontSize: 7.5, textColor: DARK, cellPadding: 2.5 },
      alternateRowStyles:  { fillColor: [248, 249, 253] },
      styles:              { lineColor: [215, 220, 230], lineWidth: 0.2 },
    });

    // ── BLOQUE TOTALES + TÉRMINOS ─────────────────────────────────────────────
    const afterTableY = doc.lastAutoTable.finalY + 6;

    // Totales (derecha)
    const totW  = 82;
    const totX  = pageW - margin - totW;
    const rows  = [
      ['Subtotal',       fmtMXN(quote.subtotal   || 0)],
      ['Impuesto (IVA)', fmtMXN(quote.tax        || 0)],
      ['Ajuste',         fmtMXN(quote.adjustment || 0)],
    ];
    const rowH    = 6.5;
    const headerH = 8;
    const totH    = headerH + rows.length * rowH + 9;

    doc.setFillColor(...LIGHT);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.3);
    doc.roundedRect(totX, afterTableY, totW, totH, 2, 2, 'FD');

    let ty = afterTableY + 5;
    rows.forEach(([label, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(label, totX + 4, ty);
      doc.setTextColor(...DARK);
      doc.text(val, totX + totW - 4, ty, { align: 'right' });
      ty += rowH;
    });

    // Línea separadora
    doc.setDrawColor(200, 210, 230);
    doc.line(totX + 3, ty, totX + totW - 3, ty);
    ty += 3;

    // TOTAL GENERAL
    doc.setFillColor(...BLUE);
    doc.roundedRect(totX, ty - 1, totW, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL GENERAL', totX + 4, ty + 6);
    doc.setFontSize(9);
    doc.text(fmtMXN(quote.total || 0), totX + totW - 4, ty + 6, { align: 'right' });

    const totBottomY = ty + 12;

    // Términos (izquierda, junto a totales)
    let termsBottomY = afterTableY;
    if (quote.terms) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRAY);
      doc.text('TÉRMINOS Y CONDICIONES:', margin, afterTableY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      const termsLines = doc.splitTextToSize(quote.terms, totX - margin - 6);
      doc.text(termsLines, margin, afterTableY + 5);
      termsBottomY = afterTableY + 5 + termsLines.length * 3.5;
    }

    // ── DATOS BANCARIOS ───────────────────────────────────────────────────────
    let bankY = Math.max(totBottomY, termsBottomY) + 8;

    // Si no cabe, nueva página
    if (bankY + 42 > pageH - 15) {
      doc.addPage();
      bankY = 20;
    }

    const bankH = 42;
    doc.setFillColor(237, 244, 255);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, bankY, cW, bankH, 3, 3, 'FD');

    // Header azul
    doc.setFillColor(...BLUE);
    doc.roundedRect(margin, bankY, cW, 9, 3, 3, 'F');
    doc.rect(margin, bankY + 5, cW, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('DATOS BANCARIOS PARA TRANSFERENCIA', margin + cW / 2, bankY + 6, { align: 'center' });

    // Filas de datos en 2 columnas
    const bankRows = [
      ['Razón Social:', 'OLEA CONTROLS MÉXICO, S.A. DE C.V.'],
      ['RFC:',          'OCM090623GR8'],
      ['Banco:',        'Banco Nacional de México, S.A. (BANAMEX)'],
      ['Sucursal:',     '384 – Mariano Escobedo'],
      ['Cuenta:',       '0384-6105270'],
      ['CLABE:',        '002180038461052707'],
    ];

    doc.setFontSize(7.5);
    const half    = cW / 2 - 4;
    const c1X     = margin + 5;
    const c2X     = margin + cW / 2 + 5;
    let byL       = bankY + 16;
    let byR       = bankY + 16;

    bankRows.forEach((row, i) => {
      const xL  = i < 3 ? c1X : c2X;
      const cur = i < 3 ? byL : byR;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLUE);
      doc.text(row[0], xL, cur);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text(row[1], xL + 23, cur);

      if (i < 3)  byL += 7;
      else        byR += 7;
    });

    // Línea vertical separadora entre columnas
    doc.setDrawColor(190, 210, 240);
    doc.setLineWidth(0.3);
    doc.line(margin + cW / 2, bankY + 11, margin + cW / 2, bankY + bankH - 4);

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const footY = pageH - 8;
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

    const pdfOutput = doc.output('arraybuffer');
    const fileName  = `${quote.quoteNumber}.pdf`;
    return await uploadToR2(Buffer.from(pdfOutput), 'quotes', fileName, 'application/pdf');
  } catch (err) {
    console.error('[PDF ERROR]', err);
    return null;
  }
}

export default async function handler(req, res) {
  const { method } = req;

  // Verificar token
  const caller = authMiddleware(req, res);
  if (!caller) return;
  const userId = caller.id;

  // Roles desde la BD (siempre actualizados, no del JWT que puede estar desactualizado)
  const emp     = await prisma.employee.findUnique({ where: { id: userId }, select: { roles: true } });
  const roles   = emp?.roles || [];
  const isAdmin = roles.includes('ADMIN');
  const isSales = roles.includes('SALES') && !isAdmin;

  if (method === 'GET') {
    try {
      const { id } = req.query;
      if (id) {
        const quote = await prisma.quote.findUnique({ where: { id }, include: { client: true, creator: true, seller: true } });
        const url = await generateQuotePDF(quote);
        if (url) await prisma.quote.update({ where: { id }, data: { pdfUrl: url } });
        return res.status(200).json({ ...quote, pdfUrl: url || quote.pdfUrl });
      }
      // Si es SALES, solo ve sus propias cotizaciones (como creador o vendedor)
      const where = isSales
        ? { OR: [{ creatorId: userId }, { sellerId: userId }] }
        : {};
      const quotes = await prisma.quote.findMany({
        where,
        include: { client: true, creator: true, seller: true },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(quotes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'POST') {
    try {
      const data = req.body;
      const quote = await prisma.quote.create({
        data: {
          quoteNumber: data.quoteNumber,
          clientId: data.clientId,
          projectName: data.projectName || '',
          projectPhase: data.projectPhase || 'INICIAL',
          contactName: data.contactName || '',
          items: data.items,
          subtotal: parseFloat(data.subtotal) || 0,
          tax: parseFloat(data.tax) || 0,
          total: parseFloat(data.total) || 0,
          validUntil: new Date(data.validUntil),
          terms: data.terms || '',
          creatorId: data.creatorId || userId,
          sellerId: data.sellerId || (isSales ? userId : null),
          status: 'PENDING'
        },
        include: { client: true, creator: true, seller: true }
      });

      const pdfUrl = await generateQuotePDF(quote);
      if (pdfUrl) {
        await prisma.quote.update({ where: { id: quote.id }, data: { pdfUrl } });
        quote.pdfUrl = pdfUrl;
      }
      return res.status(201).json(quote);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { id, status, sellerId, projectName, contactName, validUntil, terms, items, subtotal, tax, adjustment, total } = req.body;
      const updateData = {};
      if (status !== undefined)      updateData.status = status;
      if (sellerId !== undefined)    updateData.sellerId = sellerId || null;
      if (projectName !== undefined) updateData.projectName = projectName;
      if (contactName !== undefined) updateData.contactName = contactName;
      if (validUntil !== undefined)  updateData.validUntil = new Date(validUntil);
      if (terms !== undefined)       updateData.terms = terms;
      if (items !== undefined) {
        updateData.items = items;
        updateData.subtotal = parseFloat(subtotal) || 0;
        updateData.tax = parseFloat(tax) || 0;
        updateData.adjustment = parseFloat(adjustment) || 0;
        updateData.total = parseFloat(total) || 0;
      }
      const updated = await prisma.quote.update({
        where: { id },
        data: updateData,
        include: { client: true, creator: true, seller: true }
      });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.body;
      await prisma.quote.delete({ where: { id } });
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
