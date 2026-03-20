import prisma from './_lib/prisma.js'
import { uploadToR2 } from './_lib/r2.js'
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

async function generateQuotePDF(quote) {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const blueColor = [0, 102, 255];
    const grayColor = [100, 100, 100];
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    try {
      const logoPath = path.join(process.cwd(), 'public', 'img', 'OLEACONTROLS.png');
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath).toString('base64');
        doc.addImage(`data:image/png;base64,${logoData}`, 'PNG', margin, 12, 60, 10);
      }
    } catch (e) {}

    doc.setFillColor(245, 247, 250);
    doc.rect(140, 15, 55, 25, 'F');
    doc.setFontSize(14); doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
    doc.text("PRESUPUESTO", 145, 25);
    doc.setFontSize(9); doc.setTextColor(0);
    doc.text(`No: ${quote.quoteNumber}`, 145, 32);
    doc.text(`Fecha: ${new Date(quote.createdAt).toLocaleDateString()}`, 145, 37);

    doc.setFontSize(8); doc.setTextColor(grayColor[0]);
    let y = 35;
    doc.setFont('helvetica', 'bold'); doc.text("OLEA CONTROLS MÉXICO S.A. DE C.V.", margin, y);
    doc.setFont('helvetica', 'normal'); y += 4;
    doc.text("Av. Homero 1425 - 105, Polanco, Polanco II Secc,", margin, y); y += 4;
    doc.text("Miguel Hidalgo, 11540 Ciudad de México, CDMX", margin, y); y += 4;
    doc.text("RFC: OCM090623GR8 | heroes@oleacontrols.com", margin, y);

    doc.setDrawColor(230); doc.line(margin, 55, pageWidth - margin, 55);

    y = 65;
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
    doc.text("FACTURAR A:", margin, y); doc.text("DETALLES DEL PROYECTO:", 110, y);
    doc.setFont(undefined, 'normal'); doc.setTextColor(0); y += 5;
    doc.text(quote.client?.companyName || "Cliente", margin, y);
    doc.text(`Responsable: ${quote.creator?.name || 'Vendedor'}`, 110, y); y += 4;
    const addr = doc.splitTextToSize(quote.client?.address || "Dirección", 70);
    doc.text(addr, margin, y); doc.text(`Vendedor: ${quote.seller?.name || 'No asignado'}`, 110, y);
    
    y += (addr.length * 4);
    const tableBody = quote.items.map((item, i) => [
      (i + 1).toString().padStart(2, '0'),
      item.serial || '-',
      `${item.name}\n${item.desc}`,
      item.qty,
      `$${parseFloat(item.price).toLocaleString('es-MX')}`,
      `$${(parseFloat(item.price) * parseInt(item.qty)).toLocaleString('es-MX')}`
    ]);

    autoTable(doc, {
      startY: y + 10,
      head: [['#', 'Nº SERIE', 'DESCRIPCIÓN', 'CANT', 'P. UNITARIO', 'IMPORTE']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: blueColor, textColor: 255, fontStyle: 'bold' }
    });

    y = doc.lastAutoTable.finalY + 10;
    doc.text(`TOTAL GENERAL: $${parseFloat(quote.total).toLocaleString('es-MX')} MXN`, 140, y, { align: 'left' });

    const pdfOutput = doc.output('arraybuffer');
    const fileName = `${quote.quoteNumber}.pdf`;
    return await uploadToR2(Buffer.from(pdfOutput), 'quotes', fileName, 'application/pdf');
  } catch (err) {
    return null;
  }
}

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    try {
      const { id } = req.query;
      if (id) {
        const quote = await prisma.quote.findUnique({ where: { id }, include: { client: true, creator: true, seller: true } });
        const url = await generateQuotePDF(quote);
        if (url) await prisma.quote.update({ where: { id }, data: { pdfUrl: url } });
        return res.status(200).json({ ...quote, pdfUrl: url || quote.pdfUrl });
      }
      const quotes = await prisma.quote.findMany({ include: { client: true, creator: true, seller: true }, orderBy: { createdAt: 'desc' } });
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
          creatorId: data.creatorId,
          sellerId: data.sellerId || null, // Colaborador en la venta
          status: 'PENDING'
        },
        include: { client: true, creator: true, seller: true }
      });

      const pdfUrl = await generateQuotePDF(quote);
      if (pdfUrl) await prisma.quote.update({ where: { id: quote.id }, data: { pdfUrl } });
      return res.status(201).json(quote);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { id, status } = req.body;
      const updated = await prisma.quote.update({
        where: { id },
        data: { status },
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
