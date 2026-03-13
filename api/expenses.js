import prisma from './_lib/prisma.js'
import { uploadToR2 } from './_lib/r2.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  const { method } = req;
// ... (GET permanece igual)

  if (method === 'GET') {
    const { userId, otId, status } = req.query;
    try {
      const where = {};
      if (userId) where.employeeId = userId;
      if (status) where.status = status;
      
      // Si recibimos otId, buscamos la OT real primero
      if (otId) {
          const targetOT = await prisma.workOrder.findFirst({
              where: { OR: [ { id: otId }, { otNumber: otId } ] }
          });
          if (targetOT) where.workOrderId = targetOT.id;
      }

      const expenses = await prisma.expense.findMany({
        where,
        include: {
          employee: { select: { name: true } },
          workOrder: { select: { otNumber: true, title: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Mapear para compatibilidad con el frontend
      const formatted = expenses.map(e => ({
          ...e,
          otId: e.workOrder?.otNumber, // El frontend espera el folio
          userId: e.employeeId,
          date: new Date(e.createdAt).toISOString().split('T')[0] // Formatear fecha
      }));

      return res.status(200).json(formatted);
    } catch (error) {
      console.error('❌ GET EXPENSES ERROR:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'POST') {
    const { amount, category, description, receipt, evidence, otId, userId, paymentMethod, isExternal } = req.body;
    
    try {
      // 1. Validaciones iniciales
      const finalReceipt = receipt || evidence || null;
      const parsedAmount = parseFloat(amount);

      if (isNaN(parsedAmount) || !category || !userId) {
          return res.status(400).json({ 
              error: 'Datos incompletos', 
              message: 'El monto, categoría y usuario son requeridos.' 
          });
      }

      let workOrderId = null;

      // 2. Solo buscar OT si no es externo y tiene un ID
      if (!isExternal && otId) {
          const targetOT = await prisma.workOrder.findFirst({
            where: {
              OR: [ { id: otId }, { otNumber: otId } ]
            }
          });

          if (!targetOT) {
              return res.status(404).json({ error: `No se encontró la Orden ${otId}. Verifique el folio o márquelo como gasto externo.` });
          }
          workOrderId = targetOT.id;
      }

      // 3. Subir evidencia a R2 si existe
      let r2Url = null;
      if (finalReceipt) {
          r2Url = await uploadToR2(finalReceipt, 'expenses');
      }

      // 4. Crear el gasto
      const expense = await prisma.expense.create({
        data: {
          amount: parsedAmount,
          category: category,
          description: description || '',
          paymentMethod: paymentMethod || 'CASH',
          receipt: r2Url,
          status: 'PENDING',
          workOrderId: workOrderId,
          employeeId: userId
        }
      });
      
      return res.status(201).json(expense);
    } catch (error) {
      console.error('❌ POST EXPENSE FATAL ERROR:', error);
      return res.status(500).json({ 
          error: 'Error en el servidor al guardar el gasto',
          details: error.message
      });
    }
  }

  if (method === 'PUT') {
    const { id, status, comment } = req.body;
    try {
      const updated = await prisma.expense.update({
        where: { id },
        data: { 
            status,
            comment: comment || null
        }
      });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
