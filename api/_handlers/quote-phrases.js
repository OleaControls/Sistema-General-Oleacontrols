import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

export default async function handler(req, res) {
  const caller = authMiddleware(req, res);
  if (!caller) return;

  if (req.method === 'GET') {
    try {
      const category = req.query.category || 'requirements';
      const phrases = await prisma.quoteRequirementPhrase.findMany({
        where: { category },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
      });
      return res.status(200).json(phrases);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { text, category = 'requirements' } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: 'El texto no puede estar vacío' });
      const count = await prisma.quoteRequirementPhrase.count({ where: { category } });
      const phrase = await prisma.quoteRequirementPhrase.create({
        data: { text: text.trim(), order: count, category }
      });
      return res.status(201).json(phrase);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, text, order } = req.body;
      const data = {};
      if (text !== undefined) data.text = text.trim();
      if (order !== undefined) data.order = order;
      const phrase = await prisma.quoteRequirementPhrase.update({ where: { id }, data });
      return res.status(200).json(phrase);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      await prisma.quoteRequirementPhrase.delete({ where: { id } });
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
