import prisma from './_lib/prisma.js'
import { uploadToR2 } from './_lib/r2.js'

export default async function handler(req, res) {
  const { method } = req;

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
      const { techId, supervisorId, status } = req.query;
      const where = {};
      
      if (techId) where.technicianId = techId;
      if (supervisorId) where.supervisorId = supervisorId;
      if (status && status !== 'ALL') where.status = status;

      const ots = await prisma.workOrder.findMany({
        where,
        include: {
          technician: { select: { name: true, avatar: true, position: true } },
          supervisor: { select: { name: true } },
          // Quitamos creator y assignedBy temporalmente para ver si esto causa el 500
          evidences: true,
          expenses: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Mapear TODOS los campos para que el frontend los vea completos
      const formattedOts = ots.map(ot => ({
        ...ot,
        id: ot.otNumber, 
        client: ot.clientName,
        leadTechId: ot.technicianId,
        leadTechName: ot.technician?.name || 'Sin asignar',
        workDescription: ot.description,
        lat: ot.latitude,
        lng: ot.longitude,
        location: ot.address,
        expensesSubmitted: ot.expenses.length,
        completionPhotos: ot.evidences.map(e => e.url),
        assistantTechs: ot.assistantTechs ? (typeof ot.assistantTechs === 'string' ? JSON.parse(ot.assistantTechs) : ot.assistantTechs) : [],
        supportTechs: ot.supportTechs ? (typeof ot.supportTechs === 'string' ? JSON.parse(ot.supportTechs) : ot.supportTechs) : [],
        // Asegurar que estos campos lleguen al frontend con sus nombres originales
        storeNumber: ot.storeNumber,
        storeName: ot.storeName,
        clientEmail: ot.clientEmail,
        clientPhone: ot.clientPhone,
        contactName: ot.contactName,
        contactEmail: ot.contactEmail,
        contactPhone: ot.contactPhone,
        secondaryAddress: ot.secondaryAddress,
        otAddress: ot.otAddress,
        otReference: ot.otReference,
        arrivalTime: ot.arrivalTime,
        scheduledDate: ot.scheduledDate,
        assignedFunds: ot.assignedFunds,
        creatorName: 'Sistema', // Temporal
        assignedByName: ot.technicianId ? (ot.supervisor?.name || 'Supervisor') : null // Fallback al supervisor si hay técnico
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

      // BLOQUEO DE SEGURIDAD: Solo permitir cambios de fondos si ya está completada
      if (targetOT.status === 'COMPLETED' && !req.body.assignedFunds && !req.body.isLocked) {
          return res.status(403).json({ error: 'Esta OT está CERRADA. Solo se permite ampliar fondos.' });
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
      
      if (startedAt) updateData.startedAt = new Date(startedAt);
      if (finishedAt) updateData.finishedAt = new Date(finishedAt);

      // 1. Actualizar los datos maestros de la OT
      const updated = await prisma.workOrder.update({
        where: { id: targetOT.id },
        data: updateData
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
      
      return res.status(200).json(updated);
    } catch (error) {
      console.error("PUT OT Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'DELETE') {
      try {
          const { id } = req.query; // id puede ser folio
          const targetOT = await prisma.workOrder.findFirst({
              where: { OR: [ { id: id }, { otNumber: id } ] }
          });
          if (!targetOT) return res.status(404).json({ error: 'OT no encontrada' });

          await prisma.workOrder.delete({ where: { id: targetOT.id } });
          return res.status(200).json({ success: true });
      } catch (error) {
          return res.status(500).json({ error: error.message });
      }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
