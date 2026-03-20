import prisma from '../_lib/prisma.js'

export default async function handler(req, res) {
  const method = req.method.toUpperCase();

  try {
    if (method === 'GET') {
      const { employeeId } = req.query;
      
      if (employeeId) {
        // Obtener activos asignados a un empleado específico
        const assets = await prisma.asset.findMany({
          where: { assignedToId: employeeId },
          orderBy: { category: 'asc' }
        });
        return res.status(200).json(assets);
      }

      // Obtener todos los activos con su asignatario (si existe)
      const assets = await prisma.asset.findMany({
        include: { assignedTo: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' }
      });
      return res.status(200).json(assets);
    }

    if (method === 'POST') {
      const { name, category, serialNumber, condition, assignedToId, notes } = req.body;
      
      if (!name || !category) {
        return res.status(400).json({ error: 'Nombre y categoría son requeridos' });
      }

      const asset = await prisma.asset.create({
        data: {
          name,
          category,
          serialNumber,
          condition: condition || 'NEW',
          status: assignedToId ? 'ASSIGNED' : 'AVAILABLE',
          assignedToId: assignedToId || null,
          assignedDate: assignedToId ? new Date() : null,
          notes
        }
      });
      return res.status(201).json(asset);
    }

    if (method === 'PUT') {
      const { id, ...data } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      // Si se está asignando o desasignando, actualizar status y fecha
      const currentAsset = await prisma.asset.findUnique({ where: { id } });
      
      let updateData = { ...data };
      
      if (data.assignedToId !== undefined) {
        if (data.assignedToId) {
          updateData.status = 'ASSIGNED';
          if (currentAsset.assignedToId !== data.assignedToId) {
            updateData.assignedDate = new Date();
          }
        } else {
          updateData.status = 'AVAILABLE';
          updateData.assignedDate = null;
          updateData.assignedToId = null;
        }
      }

      const updated = await prisma.asset.update({
        where: { id },
        data: updateData
      });
      return res.status(200).json(updated);
    }

    if (method === 'DELETE') {
      const { id } = req.body || req.query;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      await prisma.asset.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error("ASSETS API ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
