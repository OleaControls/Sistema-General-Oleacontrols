import prisma from '../_lib/prisma.js'
import { uploadToR2, signUrlIfNeeded } from '../_lib/r2.js'
import { authMiddleware } from '../_lib/auth.js'
import { notifyOTAssigned, notifyOTCompleted } from '../_lib/telegram.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  const { method } = req;
  const { techId, supervisorId, status, id: specificId, search } = req.query;

  // RUTAS PÚBLICAS: GET por ID (para encuestas de clientes sin login)
  if (method === 'GET' && (specificId || (req.url.includes('/api/ots/') && req.query.id))) {
      // Continuar sin verificar token para este caso específico
  } else {
      // Proteger el resto de las rutas
      const user = authMiddleware(req, res);
      if (!user) return; // authMiddleware ya envió la respuesta 401
  }

  // Helper para procesar imágenes de OT a R2
  const processOTImages = async (data) => {
    const updated = { ...data };
    
    // 1. Procesar Firmas
    if (updated.signature && updated.signature.startsWith('data:')) {
        updated.signature = await uploadToR2(updated.signature, 'signatures');
    }
    if (updated.clientSignature && updated.clientSignature.startsWith('data:')) {
        updated.clientSignature = await uploadToR2(updated.clientSignature, 'signatures');
    }
    if (updated.clientSignature2 && updated.clientSignature2.startsWith('data:')) {
        updated.clientSignature2 = await uploadToR2(updated.clientSignature2, 'signatures');
    }

    // 1.5 Procesar Acta de Entrega (PDF)
    if (updated.deliveryActUrl && updated.deliveryActUrl.startsWith('data:')) {
        updated.deliveryActUrl = await uploadToR2(updated.deliveryActUrl, 'delivery-acts');
    }

    // 2. Procesar fotos de evidencia (evidences / completionPhotos / photos)
    const photoFields = ['completionPhotos', 'photos'];
    for (const field of photoFields) {
        if (Array.isArray(updated[field])) {
            const uploaded = [];
            for (const item of updated[field]) {
                if (typeof item === 'string' && item.startsWith('data:')) {
                    const url = await uploadToR2(item, 'evidences');
                    uploaded.push(url);
                } else {
                    uploaded.push(item);
                }
            }
            updated[field] = uploaded;
        }
    }

    return updated;
  };

  if (method === 'GET') {
    try {
      const { techId, supervisorId, status, id: specificId, search } = req.query;
      
      // Si piden una OT específica (detalle)
      if (specificId || (req.url.includes('/api/ots/') && req.query.id)) {
          const idToFind = specificId || req.query.id;
          const ot = await prisma.workOrder.findFirst({
              where: { OR: [ { id: idToFind }, { otNumber: idToFind } ] },
              include: {
                  technician: { select: { name: true, avatar: true, position: true } },
                  supervisor: { select: { name: true } },
                  evidences: true,
                  expenses: true
              }
          });
          
          if (!ot) return res.status(404).json({ error: 'OT no encontrada' });

          // FIRMAR URLs para el detalle
          ot.signature = await signUrlIfNeeded(ot.signature);
          ot.clientSignature = await signUrlIfNeeded(ot.clientSignature);
          ot.deliveryActUrl = await signUrlIfNeeded(ot.deliveryActUrl);
          if (ot.evidences) {
              for (let ev of ot.evidences) {
                  ev.url = await signUrlIfNeeded(ev.url);
              }
          }

          // Normalizar campos para que el frontend los reciba igual que en el listado
          const detailFormatted = {
              ...ot,
              leadTechId:   ot.technicianId,
              leadTechName: ot.technician?.name || 'Sin asignar',
              technicianName: ot.technician?.name || 'Sin asignar',
              client:       ot.clientName,
              location:     ot.address,
              lat:          ot.latitude,
              lng:          ot.longitude,
              workDescription: ot.description,
              assistantTechs: ot.assistantTechs
                  ? (typeof ot.assistantTechs === 'string' ? JSON.parse(ot.assistantTechs) : ot.assistantTechs)
                  : [],
              supportTechs: ot.supportTechs
                  ? (typeof ot.supportTechs === 'string' ? JSON.parse(ot.supportTechs) : ot.supportTechs)
                  : [],
          };

          return res.status(200).json(detailFormatted);
      }

      const where = {};
      
      if (search) {
        where.OR = [
          { otNumber: { contains: search } },
          { clientName: { contains: search } },
          { storeName: { contains: search } },
          { storeNumber: { contains: search } },
        ];
      }

      if (techId) {
          const techFilter = {
              OR: [
                  { technicianId: techId },
                  { assistantTechs: { array_contains: [{ id: techId }] } },
                  { supportTechs: { array_contains: [{ id: techId }] } }
              ]
          };
          
          if (where.OR) {
              // Si ya hay una búsqueda por texto, combinamos con el filtro de técnico
              const originalOR = where.OR;
              delete where.OR;
              where.AND = [
                  { OR: originalOR },
                  techFilter
              ];
          } else {
              where.OR = techFilter.OR;
          }
      }
      
      if (supervisorId) where.supervisorId = supervisorId;
      if (status && status !== 'ALL') where.status = status;

      const ots = await prisma.workOrder.findMany({
        where,
        select: {
          id: true,
          otNumber: true,
          title: true,
          status: true,
          priority: true,
          clientName: true,
          storeName: true,
          storeNumber: true,
          address: true,
          latitude: true,
          longitude: true,
          scheduledDate: true,
          arrivalTime: true,
          technicianId: true,
          supervisorId: true,
          description: true,
          assignedFunds: true,
          deliveryActUrl: true,
          assistantTechs: true,
          supportTechs: true,
          jornadas: true,
          startedAt: true,
          createdAt: true,
          technician: { select: { name: true, avatar: true, position: true } },
          supervisor: { select: { name: true } },
          evidences: { select: { url: true } },
          expenses: {
            where: { NOT: { status: 'REJECTED' } },
            select: { amount: true, category: true, description: true, createdAt: true, id: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Procesar cada OT para inyectar financieros y firmar URLs necesarias
      const formattedOts = await Promise.all(ots.map(async (ot) => {
        // Cálculo de financieros
        const totalSpent = ot.expenses.reduce((sum, e) => sum + e.amount, 0);
        const balance = (ot.assignedFunds || 0) - totalSpent;
        const financials = {
            assignedFunds: ot.assignedFunds || 0,
            totalSpent,
            balance,
            isOverLimit: balance < 0,
            expenses: ot.expenses.map(e => ({ ...e, date: e.createdAt }))
        };

        // FIRMAR URL DEL ACTA solo si existe
        let signedActUrl = ot.deliveryActUrl;
        if (ot.deliveryActUrl && (ot.status === 'COMPLETED' || ot.status === 'VALIDATED')) {
            signedActUrl = await signUrlIfNeeded(ot.deliveryActUrl);
        }

        return {
          ...ot,
          id: ot.otNumber, 
          client: ot.clientName,
          leadTechId: ot.technicianId,
          leadTechName: ot.technician?.name || 'Sin asignar',
          workDescription: ot.description,
          lat: ot.latitude,
          lng: ot.longitude,
          location: ot.address,
          financials,
          completionPhotos: ot.evidences.map(e => e.url),
          deliveryActUrl: signedActUrl,
          assistantTechs: ot.assistantTechs ? (typeof ot.assistantTechs === 'string' ? JSON.parse(ot.assistantTechs) : ot.assistantTechs) : [],
          supportTechs: ot.supportTechs ? (typeof ot.supportTechs === 'string' ? JSON.parse(ot.supportTechs) : ot.supportTechs) : [],
          creatorName: 'Sistema',
          assignedByName: ot.technicianId ? (ot.supervisor?.name || 'Supervisor') : null
        };
      }));

      return res.status(200).json(formattedOts);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'POST') {
    try {
      const data = await processOTImages(req.body);
      
      const cleanName = (data.storeName || 'NA').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
      const cleanNum = (data.storeNumber || '000').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const baseId = `OT-${cleanName}-${cleanNum}`;
      
      const existingCount = await prisma.workOrder.count({ where: { otNumber: { startsWith: baseId } } });
      const otNumber = existingCount > 0 ? `${baseId}-${String.fromCharCode(65 + existingCount)}` : baseId;

      const ot = await prisma.workOrder.create({
        data: {
          otNumber,
          title: data.title,
          description: data.workDescription,
          status: data.leadTechId ? 'ASSIGNED' : 'UNASSIGNED',
          priority: data.priority || 'MEDIUM',

          storeNumber: data.storeNumber,
          storeName: data.storeName,
          clientName: data.client,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          address: data.address,
          secondaryAddress: data.secondaryAddress,
          otAddress: data.otAddress,
          otReference: data.otReference,
          latitude: data.lat,
          longitude: data.lng,

          arrivalTime: data.arrivalTime,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
          assignedFunds: parseFloat(data.assignedFunds) || 0,

          supervisorId: data.supervisorId,
          technicianId: data.leadTechId,
          creatorId: data.supervisorId,
          assignedById: data.leadTechId ? data.supervisorId : null,

          assistantTechs: data.assistantTechs || [],
          supportTechs: data.supportTechs || [],
        }
      });

      // Notificar por Telegram si la OT ya viene asignada
      if (data.leadTechId) {
        const techIds = [data.leadTechId];
        const assistants = Array.isArray(data.assistantTechs) ? data.assistantTechs.map(t => t.id).filter(Boolean) : [];
        const support = Array.isArray(data.supportTechs) ? data.supportTechs.map(t => t.id).filter(Boolean) : [];
        const allIds = [...new Set([...techIds, ...assistants, ...support])];

        const techs = await prisma.employee.findMany({
          where: { id: { in: allIds }, roles: { has: 'TECHNICIAN' }, telegramChatId: { not: null } },
          select: { id: true, name: true, telegramChatId: true }
        });
        notifyOTAssigned(ot, techs).catch(console.error);
      }

      return res.status(201).json(ot);
    } catch (error) {
      console.error("POST OT Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const data = await processOTImages(req.body);
      const { 
          id, status, report, signature, clientSignature, clientSignature2, 
          systemType, deliveryDetails, pendingTasks, clientContact2, photos,
          startedAt, finishedAt, leadTechId, assignedFunds, isLocked,
          deliveryActUrl
      } = data;
      
      // Buscar la OT real
      const targetOT = await prisma.workOrder.findFirst({
        where: { OR: [ { id: id }, { otNumber: id } ] }
      });

      if (!targetOT) return res.status(404).json({ error: 'OT no encontrada' });

      // BLOQUEO DE SEGURIDAD: Solo permitir cambios de fondos (o desbloqueo explícito) si ya está completada
      const isExplicitUnlock = req.body.isLocked === false && req.body.status === 'IN_PROGRESS';
      if (targetOT.status === 'COMPLETED' && !req.body.assignedFunds && !isExplicitUnlock) {
          return res.status(403).json({ error: 'Esta OT está CERRADA. Solo se permite ampliar fondos.' });
      }
      // Las OTs VALIDATED solo pueden desbloquearse explícitamente
      if (targetOT.status === 'VALIDATED' && !isExplicitUnlock) {
          return res.status(403).json({ error: 'Esta OT está VALIDADA y bloqueada. Solo un administrador puede desbloquearla.' });
      }

      const updateData = {};
      if (status) updateData.status = status;
      if (report !== undefined) updateData.report = report;
      if (signature !== undefined) updateData.signature = signature;
      if (clientSignature !== undefined) updateData.clientSignature = clientSignature;
      if (clientSignature2 !== undefined) updateData.clientSignature2 = clientSignature2;
      if (systemType !== undefined) updateData.systemType = systemType;
      if (deliveryDetails !== undefined) updateData.deliveryDetails = deliveryDetails;
      if (pendingTasks !== undefined) updateData.pendingTasks = pendingTasks;
      if (clientContact2 !== undefined) updateData.clientContact2 = clientContact2;
      if (leadTechId !== undefined) updateData.technicianId = leadTechId;
      if (assignedFunds !== undefined) updateData.assignedFunds = assignedFunds;
      if (isLocked !== undefined) updateData.isLocked = isLocked;
      if (deliveryActUrl !== undefined) updateData.deliveryActUrl = deliveryActUrl;
      
      // Añadir soporte para técnicos auxiliares
      if (data.assistantTechs !== undefined) updateData.assistantTechs = data.assistantTechs;
      if (data.supportTechs !== undefined) updateData.supportTechs = data.supportTechs;
      if (data.jornadas !== undefined) updateData.jornadas = data.jornadas;
      
      if (startedAt) updateData.startedAt = new Date(startedAt);
      if (finishedAt) updateData.finishedAt = new Date(finishedAt);

      // 1. Actualizar los datos maestros de la OT
      const updated = await prisma.workOrder.update({
        where: { id: targetOT.id },
        data: updateData,
        include: { technician: { select: { name: true } } }
      });

      // 2. Si vienen fotos nuevas, las guardamos como evidencias
      if (photos && Array.isArray(photos) && photos.length > 0) {
          await prisma.evidence.createMany({
              data: photos.map(p => ({
                  url: p,
                  type: 'IMAGE',
                  workOrderId: targetOT.id
              }))
          });
      }

      // 3. Notificaciones Telegram
      const prevStatus = targetOT.status;
      const newStatus = updateData.status;

      // 3a. OT asignada → notificar a todos los técnicos asignados (rol TECHNICIAN)
      if (newStatus === 'ASSIGNED' && prevStatus !== 'ASSIGNED') {
        const leadId = updateData.technicianId || targetOT.technicianId;
        const rawAssistants = updateData.assistantTechs ?? targetOT.assistantTechs;
        const rawSupport   = updateData.supportTechs   ?? targetOT.supportTechs;
        const assistants = Array.isArray(rawAssistants) ? rawAssistants.map(t => t.id).filter(Boolean) : [];
        const support    = Array.isArray(rawSupport)    ? rawSupport.map(t => t.id).filter(Boolean)    : [];
        const allIds = [...new Set([leadId, ...assistants, ...support].filter(Boolean))];

        if (allIds.length > 0) {
          const techs = await prisma.employee.findMany({
            where: { id: { in: allIds }, roles: { has: 'TECHNICIAN' }, telegramChatId: { not: null } },
            select: { id: true, name: true, telegramChatId: true }
          });
          notifyOTAssigned(updated, techs).catch(console.error);
        }
      }

      // 3b. OT completada → notificar a todos los empleados con rol SUPERVISOR (Operaciones)
      if (newStatus === 'COMPLETED' && prevStatus !== 'COMPLETED') {
        const opsTeam = await prisma.employee.findMany({
          where: { roles: { has: 'SUPERVISOR' }, telegramChatId: { not: null } },
          select: { telegramChatId: true }
        });
        for (const ops of opsTeam) {
          notifyOTCompleted(updated, ops).catch(console.error);
        }
      }

      return res.status(200).json(updated);
    } catch (error) {
      console.error("PUT OT Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'DELETE') {
      try {
          const { id } = req.query; // id puede ser folio
          console.log(`[OT DELETE] Attempting to delete OT: ${id}`);

          const targetOT = await prisma.workOrder.findFirst({
              where: { OR: [ { id: id }, { otNumber: id } ] }
          });

          if (!targetOT) return res.status(404).json({ error: 'OT no encontrada' });

          // ELIMINAR DEPENDENCIAS (Integridad Referencial manual)
          // 1. Evidencias
          await prisma.evidence.deleteMany({ where: { workOrderId: targetOT.id } });
          // 2. Gastos
          await prisma.expense.deleteMany({ where: { workOrderId: targetOT.id } });
          // 3. Evaluaciones vinculadas a esta OT
          await prisma.evaluation.deleteMany({ where: { otId: targetOT.id } });

          // Finalmente eliminar la OT
          await prisma.workOrder.delete({ where: { id: targetOT.id } });
          
          console.log(`[OT DELETE] Successfully deleted OT: ${targetOT.otNumber}`);
          return res.status(200).json({ success: true });
      } catch (error) {
          console.error("DELETE OT Error:", error);
          return res.status(500).json({ error: error.message });
      }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
