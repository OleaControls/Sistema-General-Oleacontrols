import prisma from '../_lib/prisma.js'
import { uploadToR2 } from '../_lib/r2.js'
import { authMiddleware } from '../_lib/auth.js'

/* Gastos de campo. Todo pasa por sesión: este endpoint mueve dinero —quién
   comprueba y quién aprueba— así que ninguna de sus ramas es pública.

   Quién puede qué:
     · Aprobar o rechazar (cambiar `status`) → solo ADMIN y SUPERVISOR.
     · Ver todos los gastos                 → solo ADMIN y SUPERVISOR.
     · Ver los propios, comprobar y corregir mientras siguen PENDING → cada quien.

   El filtro "cada técnico ve solo lo suyo" ya existía, pero vivía en la
   pantalla (ExpensesList.jsx): el servidor mandaba los gastos de todos y
   cualquiera con la pestaña de red abierta los leía. Aquí se aplica de verdad. */

const ROLES_APROBADORES = ['ADMIN', 'SUPERVISOR'];
const rolesDe = (auth) => (Array.isArray(auth?.roles) ? auth.roles : [auth?.roles].filter(Boolean));
const puedeAprobar = (auth) => rolesDe(auth).some(r => ROLES_APROBADORES.includes(r));

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  const { method } = req;
  const aprobador = puedeAprobar(auth);

  if (method === 'GET') {
    const { userId, otId, status } = req.query;
    try {
      const where = {};
      if (userId) where.employeeId = userId;
      if (status) where.status = status;

      // Quien no aprueba solo ve sus propios gastos, sin importar lo que pida
      // en la consulta.
      if (!aprobador) where.employeeId = auth.id;
      
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
          receipt: true, 
          status: true,
          comment: true,
          workOrderId: true,
          employeeId: true,
          createdAt: true,
          employee: { select: { name: true } },
          workOrder: { 
            select: { 
              otNumber: true, 
              title: true,
              assignedFunds: true,
              expenses: {
                where: { NOT: { status: 'REJECTED' } },
                select: { amount: true }
              }
            } 
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Mapear para compatibilidad con el frontend
      const formatted = expenses.map(e => {
          let financials = null;
          if (e.workOrder) {
              const totalSpent = e.workOrder.expenses.reduce((sum, ex) => sum + ex.amount, 0);
              const balance = (e.workOrder.assignedFunds || 0) - totalSpent;
              financials = {
                  assignedFunds: e.workOrder.assignedFunds || 0,
                  totalSpent,
                  balance,
                  isOverLimit: balance < 0
              };
          }

          return {
              ...e,
              otId: e.workOrder?.otNumber,
              userId: e.employeeId,
              date: new Date(e.createdAt).toISOString().split('T')[0],
              financials
          };
      });

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
      // El dueño del gasto sale de la sesión, no del cuerpo de la petición: si
      // no, cualquiera podría comprobar a nombre de otro. Un aprobador sí puede
      // capturar por alguien más (gasto levantado en oficina).
      const dueñoId = aprobador ? (userId || auth.id) : auth.id;
      if (!dueñoId) {
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
          employeeId: dueñoId,
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
    if (!id) return res.status(400).json({ error: 'Falta el id del gasto' });

    try {
      const actual = await prisma.expense.findUnique({
        where: { id },
        select: { id: true, employeeId: true, status: true },
      });
      if (!actual) return res.status(404).json({ error: 'Gasto no encontrado' });

      // Aprobar o rechazar es la decisión que mueve el dinero: solo Operaciones
      // y Admin. Antes esta rama no pedía nada — bastaba con conocer la
      // dirección para autorizarse el propio reembolso.
      if (status !== undefined && !aprobador) {
        return res.status(403).json({ error: 'Solo Operaciones o Admin pueden aprobar o rechazar un gasto' });
      }

      // Corregir el propio comprobante se permite mientras nadie lo haya
      // resuelto todavía; ya aprobado o rechazado, queda como está.
      if (!aprobador) {
        if (actual.employeeId !== auth.id) {
          return res.status(403).json({ error: 'Solo puedes modificar tus propios gastos' });
        }
        if (actual.status !== 'PENDING') {
          return res.status(409).json({ error: 'Este gasto ya fue resuelto y no se puede modificar' });
        }
      }

      const data = {};
      if (status !== undefined) data.status = status;
      if (comment !== undefined) data.comment = comment || null;
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No hay nada que actualizar' });
      }

      const updated = await prisma.expense.update({ where: { id }, data });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
