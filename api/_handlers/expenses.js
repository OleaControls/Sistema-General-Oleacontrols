import prisma from '../_lib/prisma.js'
import { uploadToR2 } from '../_lib/r2.js'

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
        select: {
          id: true,
          amount: true,
          category: true,
          description: true,
          paymentMethod: true,
          receipt: true, // Restauramos el recibo para que el frontend pueda mostrarlo
          status: true,
          comment: true,
          workOrderId: true,
          employeeId: true,
          createdAt: true,
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
    const { amount, category, description, receipt, evidence, otId, userId, paymentMethod, isExternal, date } = req.body;
    
    try {
      // 1. Validaciones iniciales
      const finalReceipt = receipt || evidence || null;
      const parsedAmount = parseFloat(amount);

      if (isNaN(parsedAmount)) {
          return res.status(400).json({ error: 'Monto inválido', message: 'El monto debe ser un número válido.' });
      }
      if (!category) {
          return res.status(400).json({ error: 'Categoría requerida', message: 'Debe seleccionar una categoría.' });
      }
      if (!userId) {
          return res.status(400).json({ error: 'Usuario no identificado', message: 'No se encontró el ID del usuario en la petición.' });
      }

      let workOrderId = null;

      // 2. Solo buscar OT si no es externo y tiene un ID
      if (!isExternal && otId && otId.trim() !== "") {
          const targetOT = await prisma.workOrder.findFirst({
            where: {
              OR: [ { id: otId }, { otNumber: otId } ]
            }
          });

          if (!targetOT) {
              return res.status(404).json({ 
                  error: 'Orden no encontrada', 
                  message: `No se encontró la Orden ${otId}. Verifique el folio o márquelo como gasto externo.` 
              });
          }
          workOrderId = targetOT.id;
      }

      // 3. Subir evidencia a R2 si existe
      let r2Url = null;
      if (finalReceipt) {
          try {
              r2Url = await uploadToR2(finalReceipt, 'expenses');
          } catch (uploadError) {
              console.error('⚠️ Error subiendo a R2, guardando base64 como fallback:', uploadError.message);
              r2Url = finalReceipt; // Fallback a base64 si falla R2
          }
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
          employeeId: userId,
          createdAt: date ? new Date(date) : new Date()
        }
      });
      
      return res.status(201).json(expense);
    } catch (error) {
      console.error('❌ POST EXPENSE FATAL ERROR:', error);
      return res.status(500).json({ 
          error: 'Error en el servidor al guardar el gasto',
          message: error.message,
          details: error.stack
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
