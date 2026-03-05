import prisma from './_lib/prisma.js'

export default async function handler(req, res) {
  const { method } = req;

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
        assignedFunds: ot.assignedFunds
      }));

      return res.status(200).json(formattedOts);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'POST') {
    try {
      const data = req.body;
      
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
      const { 
          id, status, report, signature, clientSignature, clientSignature2, 
          systemType, deliveryDetails, pendingTasks, clientContact2, photos,
          startedAt, finishedAt, leadTechId, assignedFunds, isLocked 
      } = req.body;
      
      // Buscar la OT real
      const targetOT = await prisma.workOrder.findFirst({
        where: { OR: [ { id: id }, { otNumber: id } ] }
      });

      if (!targetOT) return res.status(404).json({ error: 'OT no encontrada' });

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
