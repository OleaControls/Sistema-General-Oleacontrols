import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

async function getCallerRoles(id) {
  const emp = await prisma.employee.findUnique({ where: { id }, select: { roles: true } });
  return emp?.roles || [];
}

export default async function handler(req, res) {
  const { method } = req;

  const caller = authMiddleware(req, res);
  if (!caller) return;
  const userId  = caller.id;
  const roles   = await getCallerRoles(userId);
  const isAdmin = roles.includes('ADMIN');
  const isSales = roles.includes('SALES') && !isAdmin;

  // El admin puede consultar datos de cualquier vendedor pasando ?sellerId=xxx
  // El vendedor SALES siempre consulta sus propios datos
  const targetSeller = (isAdmin && req.query.sellerId) ? req.query.sellerId : userId;

  try {
    // ─── GET ────────────────────────────────────────────────────────────
    if (method === 'GET') {
      const { type } = req.query;

      // Admin sin sellerId específico → todos los vendedores (para métricas globales)
      if (isAdmin && !req.query.sellerId && type) {
        if (type === 'bitacora') {
          const data = await prisma.salesBitacora.findMany({
            include: { seller: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
          });
          return res.status(200).json(data);
        }
        if (type === 'reporte') {
          const data = await prisma.salesDailyReport.findMany({
            include: { seller: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
          });
          return res.status(200).json(data);
        }
        if (type === 'cartera') {
          const data = await prisma.salesPortfolio.findMany({
            include: { seller: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
          });
          return res.status(200).json(data);
        }
      }

      // Datos del vendedor específico
      if (type === 'bitacora') {
        const data = await prisma.salesBitacora.findMany({
          where: { sellerId: targetSeller },
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(data);
      }
      if (type === 'reporte') {
        const data = await prisma.salesDailyReport.findMany({
          where: { sellerId: targetSeller },
          orderBy: { semana: 'desc' }
        });
        return res.status(200).json(data);
      }
      if (type === 'cartera') {
        const data = await prisma.salesPortfolio.findMany({
          where: { sellerId: targetSeller },
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(data);
      }

      // Resumen de todos los vendedores (solo admin)
      if (type === 'summary' && isAdmin) {
        const sellers = await prisma.employee.findMany({
          where: { roles: { has: 'SALES' } },
          select: { id: true, name: true, avatar: true }
        });
        const sellerIds = sellers.map(s => s.id);

        const [bitacoraCounts, reporteData, carteraCounts] = await Promise.all([
          prisma.salesBitacora.groupBy({
            by: ['sellerId'],
            where: { sellerId: { in: sellerIds } },
            _count: { id: true }
          }),
          prisma.salesDailyReport.findMany({
            where: { sellerId: { in: sellerIds } },
            select: { sellerId: true, llamadas: true, efec: true, visitas: true, cotizaciones: true, cierres: true, venta: true }
          }),
          prisma.salesPortfolio.groupBy({
            by: ['sellerId'],
            where: { sellerId: { in: sellerIds } },
            _count: { id: true }
          }),
        ]);

        const bitacoraMap = Object.fromEntries(bitacoraCounts.map(b => [b.sellerId, b._count.id]));
        const carteraMap  = Object.fromEntries(carteraCounts.map(c => [c.sellerId, c._count.id]));
        const reporteMap  = {};
        reporteData.forEach(r => { (reporteMap[r.sellerId] ??= []).push(r); });

        const summaries = sellers.map((s) => {
          const bitacora = bitacoraMap[s.id] || 0;
          const reporte  = reporteMap[s.id]  || [];
          const cartera  = carteraMap[s.id]  || 0;
          const totalLlamadas     = reporte.reduce((acc, r) => acc + r.llamadas, 0);
          const totalEfec         = reporte.reduce((acc, r) => acc + r.efec, 0);
          const totalVisitas      = reporte.reduce((acc, r) => acc + r.visitas, 0);
          const totalCotizaciones = reporte.reduce((acc, r) => acc + r.cotizaciones, 0);
          const totalCierres      = reporte.reduce((acc, r) => acc + r.cierres, 0);
          const totalVenta        = reporte.reduce((acc, r) => acc + r.venta, 0);
          const tasaCierre        = totalCotizaciones ? Math.round((totalCierres / totalCotizaciones) * 100) : 0;
          const eficiencia        = totalLlamadas     ? Math.round((totalEfec / totalLlamadas) * 100) : 0;
          return { seller: s, bitacora, reporteRows: reporte.length, cartera, totalLlamadas, totalEfec, totalVisitas, totalCotizaciones, totalCierres, totalVenta, tasaCierre, eficiencia };
        });
        return res.status(200).json(summaries);
      }

      return res.status(400).json({ error: 'Tipo no válido. Usa: bitacora, reporte, cartera, summary' });
    }

    // ─── POST ────────────────────────────────────────────────────────────
    if (method === 'POST') {
      const { type, ...body } = req.body;

      if (type === 'bitacora') {
        const entry = await prisma.salesBitacora.create({
          data: {
            sellerId:        userId,
            dia:             body.dia             || null,
            empresaVisitada: body.empresaVisitada || null,
            nombre:          body.nombre          || null,
            potencial:       Boolean(body.potencial),
            decisor:         Boolean(body.decisor),
            resultado:       body.resultado       || null,
          }
        });
        return res.status(201).json(entry);
      }

      if (type === 'reporte') {
        const entry = await prisma.salesDailyReport.create({
          data: {
            sellerId:     userId,
            semana:       body.semana       || null,
            dia:          body.dia          || null,
            llamadas:     parseInt(body.llamadas)     || 0,
            efec:         parseInt(body.efec)         || 0,
            visitas:      parseInt(body.visitas)      || 0,
            correos:      parseInt(body.correos)      || 0,
            mensajes:     parseInt(body.mensajes)     || 0,
            decisorR:     parseInt(body.decisorR)     || 0,
            decisorFinal: parseInt(body.decisorFinal) || 0,
            cotizaciones: parseInt(body.cotizaciones) || 0,
            cierres:      parseInt(body.cierres)      || 0,
            venta:        parseFloat(body.venta)      || 0,
          }
        });
        return res.status(201).json(entry);
      }

      if (type === 'cartera') {
        const entry = await prisma.salesPortfolio.create({
          data: {
            sellerId:         userId,
            empresa:          body.empresa          || null,
            mes:              body.mes              || null,
            tipo:             body.tipo             || 'Prospecto',
            fechaUltContacto: body.fechaUltContacto || null,
            decisor:          Boolean(body.decisor),
            resultado:        body.resultado        || null,
            proxContacto:     body.proxContacto     || null,
            motivo:           body.motivo           || null,
          }
        });
        return res.status(201).json(entry);
      }

      return res.status(400).json({ error: 'Tipo no válido' });
    }

    // ─── PUT ────────────────────────────────────────────────────────────
    if (method === 'PUT') {
      const { type, id, ...body } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      if (type === 'bitacora') {
        const updated = await prisma.salesBitacora.update({
          where: { id },
          data: {
            dia: body.dia || null, empresaVisitada: body.empresaVisitada || null,
            nombre: body.nombre || null, potencial: Boolean(body.potencial),
            decisor: Boolean(body.decisor), resultado: body.resultado || null,
          }
        });
        return res.status(200).json(updated);
      }

      if (type === 'reporte') {
        const updated = await prisma.salesDailyReport.update({
          where: { id },
          data: {
            semana: body.semana || null, dia: body.dia || null,
            llamadas: parseInt(body.llamadas) || 0, efec: parseInt(body.efec) || 0,
            visitas: parseInt(body.visitas) || 0, correos: parseInt(body.correos) || 0,
            mensajes: parseInt(body.mensajes) || 0, decisorR: parseInt(body.decisorR) || 0,
            decisorFinal: parseInt(body.decisorFinal) || 0, cotizaciones: parseInt(body.cotizaciones) || 0,
            cierres: parseInt(body.cierres) || 0, venta: parseFloat(body.venta) || 0,
          }
        });
        return res.status(200).json(updated);
      }

      if (type === 'cartera') {
        const updated = await prisma.salesPortfolio.update({
          where: { id },
          data: {
            empresa: body.empresa || null, mes: body.mes || null,
            tipo: body.tipo || 'Prospecto', fechaUltContacto: body.fechaUltContacto || null,
            decisor: Boolean(body.decisor), resultado: body.resultado || null,
            proxContacto: body.proxContacto || null, motivo: body.motivo || null,
          }
        });
        return res.status(200).json(updated);
      }

      return res.status(400).json({ error: 'Tipo no válido' });
    }

    // ─── DELETE ──────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      const { type, id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      if (type === 'bitacora') {
        await prisma.salesBitacora.delete({ where: { id } });
        return res.status(200).json({ success: true });
      }
      if (type === 'reporte') {
        await prisma.salesDailyReport.delete({ where: { id } });
        return res.status(200).json({ success: true });
      }
      if (type === 'cartera') {
        await prisma.salesPortfolio.delete({ where: { id } });
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Tipo no válido' });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('[SALES-DATA ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
}
