import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

// Obtiene el rol efectivo del usuario directo desde la BD (no depende del JWT)
async function getCallerRoles(callerId) {
  const emp = await prisma.employee.findUnique({
    where: { id: callerId },
    select: { roles: true }
  });
  return emp?.roles || [];
}

export default async function handler(req, res) {
  const method = req.method.toUpperCase();
  const urlParts = req.url.split('?')[0].split('/');
  const lastPart = urlParts[urlParts.length - 1];
  const resource = (req.query?.resource || lastPart || '').toLowerCase();

  // Verificar token y obtener userId
  const caller = authMiddleware(req, res);
  if (!caller) return;

  const userId = caller.id;

  // Roles desde la BD (siempre actualizados)
  const roles   = await getCallerRoles(userId);
  const isAdmin = roles.includes('ADMIN');
  const isSales = roles.includes('SALES') && !isAdmin;

  console.log(`[CRM] ${method} /${resource} | user:${userId} | roles:${JSON.stringify(roles)} | isSales:${isSales}`);

  try {
    // ─── GET ────────────────────────────────────────────────────────────
    if (method === 'GET') {

      if (resource === 'leads') {
        const where = isSales ? { assignedToId: userId } : {};
        const leads = await prisma.lead.findMany({
          where,
          include: { assignedTo: true },
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(leads || []);
      }

      if (resource === 'clients') {
        const where = isSales ? { ownerId: userId } : {};
        const clients = await prisma.client.findMany({
          where,
          include: { owner: { select: { id: true, name: true, avatar: true } } },
          orderBy: { companyName: 'asc' }
        });
        return res.status(200).json(clients || []);
      }

      if (resource === 'deals') {
        const where = isSales ? { assignedToId: userId } : {};
        const deals = await prisma.deal.findMany({
          where,
          include: {
            client: { select: { id: true, companyName: true } },
            assignedTo: { select: { id: true, name: true, avatar: true } },
            _count: { select: { activities: true } }
          },
          orderBy: { updatedAt: 'desc' }
        });
        return res.status(200).json(deals || []);
      }

      if (resource === 'deal-activities') {
        const dealId = req.query.dealId;
        if (!dealId) return res.status(400).json({ error: 'dealId requerido' });
        const activities = await prisma.dealActivity.findMany({
          where: { dealId },
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(activities || []);
      }

      // ── Feed global de actividades (admin y SALES) ────────────────────
      if (resource === 'activity-feed') {
        const { sellerId, dealId: filterDeal, type: filterType, limit = '200' } = req.query;

        const where = {};
        if (filterDeal) where.dealId = filterDeal;
        if (filterType) where.type = filterType;
        // Admin puede filtrar por vendedor; SALES solo ve sus propios tratos
        if (isAdmin && sellerId) where.deal = { assignedToId: sellerId };
        if (!isAdmin)            where.deal = { assignedToId: userId };

        const activities = await prisma.dealActivity.findMany({
          where,
          include: {
            deal: {
              select: {
                id: true, title: true, company: true, stage: true,
                assignedTo: { select: { id: true, name: true, avatar: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit)
        });
        return res.status(200).json(activities || []);
      }

      // ── Seguimientos del vendedor ──────────────────────────────────────
      if (resource === 'seguimientos') {
        const where = isSales
          ? { deal: { assignedToId: userId } }
          : {};
        const seguimientos = await prisma.dealActivity.findMany({
          where,
          include: { deal: { select: { id: true, title: true, company: true, stage: true } } },
          orderBy: { createdAt: 'desc' },
          take: 500
        });
        return res.status(200).json(seguimientos || []);
      }

      // ── Métricas por vendedor ──────────────────────────────────────────
      if (resource === 'sales-metrics') {
        const period = req.query.period || 'month';
        const now = new Date();
        let since;
        if (period === 'week')           since = new Date(now - 7  * 86400000);
        else if (period === 'fortnight') since = new Date(now - 15 * 86400000);
        else                             since = new Date(now - 30 * 86400000);

        // ADMIN ve todos los SALES; SALES solo se ve a sí mismo
        const employeeWhere = isSales
          ? { id: userId }
          : { roles: { has: 'SALES' } };

        const sellers = await prisma.employee.findMany({
          where: employeeWhere,
          select: { id: true, name: true, avatar: true }
        });

        const sellerIds = sellers.map(s => s.id);
        const [allDeals, allQuotes, allLeads] = await Promise.all([
          prisma.deal.findMany({
            where: { assignedToId: { in: sellerIds }, createdAt: { gte: since } },
            select: { id: true, value: true, stage: true, createdAt: true, assignedToId: true }
          }),
          prisma.quote.findMany({
            where: {
              createdAt: { gte: since },
              OR: [{ sellerId: { in: sellerIds } }, { creatorId: { in: sellerIds } }]
            },
            select: { id: true, total: true, status: true, createdAt: true, sellerId: true, creatorId: true }
          }),
          prisma.lead.findMany({
            where: { assignedToId: { in: sellerIds }, createdAt: { gte: since } },
            select: { id: true, estimatedValue: true, stage: true, assignedToId: true }
          }),
        ]);

        const dealIds = allDeals.map(d => d.id);
        const actGroups = dealIds.length > 0
          ? await prisma.dealActivity.groupBy({
              by: ['dealId'],
              where: { dealId: { in: dealIds }, createdAt: { gte: since } },
              _count: { id: true }
            })
          : [];

        const dealsBySeller  = {};
        const quotesBySeller = {};
        const leadsBySeller  = {};
        const actCountBySeller = {};

        allDeals.forEach(d => { (dealsBySeller[d.assignedToId] ??= []).push(d); });

        allQuotes.forEach(q => {
          if (q.sellerId  && sellerIds.includes(q.sellerId))  (quotesBySeller[q.sellerId]  ??= new Map()).set(q.id, q);
          if (q.creatorId && sellerIds.includes(q.creatorId) && q.creatorId !== q.sellerId)
            (quotesBySeller[q.creatorId] ??= new Map()).set(q.id, q);
        });

        allLeads.forEach(l => { (leadsBySeller[l.assignedToId] ??= []).push(l); });

        const dealToSeller = Object.fromEntries(allDeals.map(d => [d.id, d.assignedToId]));
        actGroups.forEach(a => {
          const sid = dealToSeller[a.dealId];
          if (sid) actCountBySeller[sid] = (actCountBySeller[sid] || 0) + a._count.id;
        });

        const metrics = sellers.map((seller) => {
          const deals    = dealsBySeller[seller.id]  || [];
          const quotes   = quotesBySeller[seller.id] ? Array.from(quotesBySeller[seller.id].values()) : [];
          const leads    = leadsBySeller[seller.id]  || [];
          const actCount = actCountBySeller[seller.id] || 0;

          const wonDeals       = deals.filter(d => d.stage === 'CLOSED_WON');
          const lostDeals      = deals.filter(d => d.stage === 'CLOSED_LOST');
          const activeDeals    = deals.filter(d => !['CLOSED_WON','CLOSED_LOST'].includes(d.stage));
          const wonValue       = wonDeals.reduce((s, d) => s + d.value, 0);
          const pipelineValue  = activeDeals.reduce((s, d) => s + d.value, 0);
          const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED');
          const quoteValue     = acceptedQuotes.reduce((s, q) => s + q.total, 0);
          const closeRate      = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

          return {
            seller, period, since,
            deals: deals.length, wonDeals: wonDeals.length,
            lostDeals: lostDeals.length, activeDeals: activeDeals.length,
            wonValue, pipelineValue,
            quotes: quotes.length, acceptedQuotes: acceptedQuotes.length, quoteValue,
            leads: leads.length, closeRate, activities: actCount,
          };
        });

        return res.status(200).json(metrics);
      }
    }

    // ─── POST ───────────────────────────────────────────────────────────
    if (method === 'POST') {
      if (resource === 'leads') {
        const { name, company, email, phone, rfc, address, estimatedValue, source } = req.body;
        const lead = await prisma.lead.create({
          data: {
            name, company, email, phone,
            rfc: rfc || null,
            address: address || null,
            estimatedValue: parseFloat(estimatedValue) || 0,
            source: source || 'Web',
            stage: 'PROSPECT',
            assignedToId: userId
          }
        });
        return res.status(201).json(lead);
      }

      if (resource === 'clients') {
        const { companyName, contactName, email, phone, rfc, address, latitude, longitude } = req.body;
        if (!companyName || !email) return res.status(400).json({ error: 'Faltan campos obligatorios (Empresa/Email)' });
        const client = await prisma.client.create({
          data: {
            companyName,
            contactName: contactName || 'Sin contacto',
            email, phone: phone || '', rfc: rfc || '', address: address || '',
            latitude: parseFloat(latitude) || null,
            longitude: parseFloat(longitude) || null,
            ownerId: userId
          },
          include: { owner: { select: { id: true, name: true, avatar: true } } }
        });
        return res.status(201).json(client);
      }

      if (resource === 'deals') {
        const {
          title, value, company, contactName, contactEmail, contactPhone,
          clientId, stage, probability, expectedClose, source, description, notes
        } = req.body;
        if (!title) return res.status(400).json({ error: 'El título es obligatorio' });

        const STAGE_PROB = {
          QUALIFICATION: 10, NEEDS_ANALYSIS: 20, VALUE_PROPOSITION: 30,
          IDENTIFY_DECISION_MAKERS: 40, PROPOSAL_PRICE_QUOTE: 50,
          PROPOSAL_SENT: 65, NEGOTIATION_1: 75, RECOTIZACION: 80,
          NEGOTIATION_2: 90, CLOSED_WON_PENDING: 95, CLOSED_WON: 100, CLOSED_LOST: 0
        };
        const dealStage       = stage || 'QUALIFICATION';
        const dealProbability = probability !== undefined ? parseInt(probability) : (STAGE_PROB[dealStage] ?? 10);

        const deal = await prisma.deal.create({
          data: {
            title, value: parseFloat(value) || 0,
            company: company || null, contactName: contactName || null,
            contactEmail: contactEmail || null, contactPhone: contactPhone || null,
            clientId: clientId || null,
            assignedToId: userId,
            stage: dealStage, probability: dealProbability,
            expectedClose: expectedClose ? new Date(expectedClose) : null,
            source: source || 'Web', description: description || null, notes: notes || null
          },
          include: {
            client: { select: { id: true, companyName: true } },
            assignedTo: { select: { id: true, name: true, avatar: true } }
          }
        });
        return res.status(201).json(deal);
      }

      if (resource === 'deal-activities') {
        const { dealId, type, content, authorName, status, dueDate } = req.body;
        if (!dealId || !content) return res.status(400).json({ error: 'dealId y content son obligatorios' });
        const activity = await prisma.dealActivity.create({
          data: {
            dealId, type: type || 'NOTE', content,
            authorName: authorName || null,
            status: status || 'PENDING',
            dueDate: dueDate ? new Date(dueDate) : null,
          }
        });
        return res.status(201).json(activity);
      }
    }

    // ─── PUT ────────────────────────────────────────────────────────────
    if (method === 'PUT') {
      const { id, ...data } = req.body;

      if (resource === 'leads') {
        const updateData = {};
        if (data.name           !== undefined) updateData.name           = data.name;
        if (data.company        !== undefined) updateData.company        = data.company || null;
        if (data.email          !== undefined) updateData.email          = data.email;
        if (data.phone          !== undefined) updateData.phone          = data.phone || null;
        if (data.rfc            !== undefined) updateData.rfc            = data.rfc || null;
        if (data.address        !== undefined) updateData.address        = data.address || null;
        if (data.source         !== undefined) updateData.source         = data.source || null;
        if (data.stage          !== undefined) updateData.stage          = data.stage;
        if (data.estimatedValue !== undefined) updateData.estimatedValue = parseFloat(data.estimatedValue) || 0;
        if (data.notes          !== undefined) updateData.notes          = data.notes || null;
        const updated = await prisma.lead.update({
          where: { id }, data: updateData,
          include: { assignedTo: true }
        });
        return res.status(200).json(updated);
      }

      if (resource === 'clients') {
        const updated = await prisma.client.update({
          where: { id },
          data: {
            companyName: data.companyName, contactName: data.contactName,
            email: data.email, phone: data.phone, rfc: data.rfc,
            address: data.address,
            latitude: parseFloat(data.latitude) || null,
            longitude: parseFloat(data.longitude) || null,
            status: data.status
          },
          include: { owner: { select: { id: true, name: true, avatar: true } } }
        });
        return res.status(200).json(updated);
      }

      if (resource === 'deals') {
        const STAGE_PROB = {
          QUALIFICATION: 10, NEEDS_ANALYSIS: 20, VALUE_PROPOSITION: 30,
          IDENTIFY_DECISION_MAKERS: 40, PROPOSAL_PRICE_QUOTE: 50,
          PROPOSAL_SENT: 65, NEGOTIATION_1: 75, RECOTIZACION: 80,
          NEGOTIATION_2: 90, CLOSED_WON_PENDING: 95, CLOSED_WON: 100, CLOSED_LOST: 0
        };
        const STAGE_LABELS = {
          QUALIFICATION: 'Lead / Prospecto', NEEDS_ANALYSIS: 'Acercamiento',
          VALUE_PROPOSITION: 'Contacto decisor', IDENTIFY_DECISION_MAKERS: 'Oportunidad detectada',
          PROPOSAL_PRICE_QUOTE: 'Levantamiento técnico', PROPOSAL_SENT: 'Cotización enviada',
          NEGOTIATION_1: 'Negociación 1', RECOTIZACION: 'Recotización',
          NEGOTIATION_2: 'Negociación 2', CLOSED_WON_PENDING: 'En espera de autorización',
          CLOSED_WON: 'Ganado', CLOSED_LOST: 'Perdido'
        };

        // Leer etapa actual antes de actualizar
        const prevDeal = data.stage !== undefined
          ? await prisma.deal.findUnique({ where: { id }, select: { stage: true } })
          : null;

        const updateData = {};
        if (data.title !== undefined)         updateData.title = data.title;
        if (data.value !== undefined)         updateData.value = parseFloat(data.value) || 0;
        if (data.company !== undefined)       updateData.company = data.company || null;
        if (data.contactName !== undefined)   updateData.contactName = data.contactName || null;
        if (data.contactEmail !== undefined)  updateData.contactEmail = data.contactEmail || null;
        if (data.contactPhone !== undefined)  updateData.contactPhone = data.contactPhone || null;
        if (data.clientId !== undefined)      updateData.clientId = data.clientId || null;
        if (data.source !== undefined)        updateData.source = data.source || null;
        if (data.description !== undefined)   updateData.description = data.description || null;
        if (data.notes !== undefined)         updateData.notes = data.notes || null;
        if (data.expectedClose !== undefined) updateData.expectedClose = data.expectedClose ? new Date(data.expectedClose) : null;
        if (data.closeReason !== undefined) updateData.closeReason = data.closeReason || null;
        if (data.stage !== undefined) {
          updateData.stage = data.stage;
          if (data.probability === undefined) updateData.probability = STAGE_PROB[data.stage] ?? 10;
        }
        if (data.probability !== undefined) updateData.probability = parseInt(data.probability);

        let updated = await prisma.deal.update({
          where: { id }, data: updateData,
          include: {
            client: { select: { id: true, companyName: true } },
            assignedTo: { select: { id: true, name: true, avatar: true } },
            _count: { select: { activities: true } }
          }
        });

        // ── Auto-registrar cambio de etapa ────────────────────────────────
        if (prevDeal && updateData.stage && prevDeal.stage !== updateData.stage) {
          try {
            const isClose = updateData.stage === 'CLOSED_WON' || updateData.stage === 'CLOSED_LOST';
            const reasonText = isClose && data.closeReason ? ` — Razón: ${data.closeReason}` : '';
            await prisma.dealActivity.create({
              data: {
                dealId: id,
                type: 'STAGE_CHANGE',
                content: `Etapa actualizada: ${STAGE_LABELS[prevDeal.stage] || prevDeal.stage} → ${STAGE_LABELS[updateData.stage] || updateData.stage}${reasonText}`,
                authorName: caller.name || 'Sistema',
                status: 'COMPLETED'
              }
            });
          } catch (e) { console.error('[CRM] Stage log error:', e.message); }
        }

        // ── Auto-crear cliente cuando el trato es Ganado ──────────────────
        if (updateData.stage === 'CLOSED_WON' && !updated.clientId) {
          try {
            const emailToUse = updated.contactEmail;
            let client = emailToUse
              ? await prisma.client.findUnique({ where: { email: emailToUse } })
              : null;

            if (!client) {
              client = await prisma.client.create({
                data: {
                  companyName: updated.company || updated.title,
                  contactName: updated.contactName || 'Sin contacto',
                  email: emailToUse || `won-deal-${updated.id}@oleacontrols.mx`,
                  phone: updated.contactPhone || '',
                  ownerId: userId
                }
              });
            }

            updated = await prisma.deal.update({
              where: { id },
              data: { clientId: client.id },
              include: {
                client: { select: { id: true, companyName: true } },
                assignedTo: { select: { id: true, name: true, avatar: true } },
                _count: { select: { activities: true } }
              }
            });
          } catch (e) {
            console.error('[CRM] Auto-client error:', e.message);
          }
        }

        return res.status(200).json(updated);
      }

      if (resource === 'deal-activities') {
        const actUpdate = {};
        if (data.status  !== undefined) actUpdate.status  = data.status;
        if (data.content !== undefined) actUpdate.content = data.content;
        if (data.dueDate !== undefined) actUpdate.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        const updated = await prisma.dealActivity.update({ where: { id }, data: actUpdate });
        return res.status(200).json(updated);
      }
    }

    // ─── DELETE ─────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      if (resource === 'leads') {
        await prisma.lead.delete({ where: { id } });
        return res.status(200).json({ success: true });
      }

      if (resource === 'clients') {
        try {
          const countQuotes = await prisma.quote.count({ where: { clientId: id } });
          const countDeals  = await prisma.deal.count({ where: { clientId: id } });
          if (countQuotes > 0 || countDeals > 0) {
            return res.status(409).json({
              error: 'No se puede eliminar el cliente porque tiene cotizaciones o tratos vinculados.',
              details: { quotes: countQuotes, deals: countDeals }
            });
          }
          await prisma.client.delete({ where: { id } });
          return res.status(200).json({ success: true });
        } catch (err) {
          if (err.code === 'P2003') return res.status(409).json({ error: 'Existen registros vinculados a este cliente.' });
          throw err;
        }
      }

      if (resource === 'deals') {
        await prisma.deal.delete({ where: { id } });
        return res.status(200).json({ success: true });
      }

      if (resource === 'deal-activities') {
        await prisma.dealActivity.delete({ where: { id } });
        return res.status(200).json({ success: true });
      }
    }

    return res.status(405).json({ error: 'Recurso o Método no soportado' });

  } catch (error) {
    console.error('[CRM ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
}
