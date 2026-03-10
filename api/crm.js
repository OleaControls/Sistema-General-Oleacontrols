import prisma from './_lib/prisma.js'

export default async function handler(req, res) {
  const method = req.method.toUpperCase();
  // Buscamos 'resource' en params (Express) o en query (Vercel/Vite)
  const resource = (req.params?.resource || req.query?.resource || '').toLowerCase();

  console.log(`[CRM API] ${method} request for resource: "${resource}"`);

  try {
    // --- LÓGICA DE GET ---
    if (method === 'GET') {
      if (resource === 'leads') {
        const leads = await prisma.lead.findMany({ include: { assignedTo: true }, orderBy: { createdAt: 'desc' } });
        return res.status(200).json(leads || []);
      }
      if (resource === 'clients') {
        const clients = await prisma.client.findMany({ orderBy: { companyName: 'asc' } });
        return res.status(200).json(clients || []);
      }
    }

    // --- LÓGICA DE POST ---
    if (method === 'POST') {
      if (resource === 'leads') {
        const { name, company, email, phone, estimatedValue, source } = req.body;
        const lead = await prisma.lead.create({
          data: { 
            name, company, email, phone, 
            estimatedValue: parseFloat(estimatedValue) || 0, 
            source: source || 'Web',
            stage: 'PROSPECT'
          }
        });
        return res.status(201).json(lead);
      }

      if (resource === 'clients') {
        const { companyName, contactName, email, phone, rfc, address, latitude, longitude } = req.body;
        
        if (!companyName || !email) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (Empresa/Email)' });
        }

        const client = await prisma.client.create({
          data: {
            companyName,
            contactName: contactName || 'Sin contacto',
            email,
            phone: phone || '',
            rfc: rfc || '',
            address: address || '',
            latitude: parseFloat(latitude) || null,
            longitude: parseFloat(longitude) || null
          }
        });
        return res.status(201).json(client);
      }
    }

    // --- LÓGICA DE PUT ---
    if (method === 'PUT') {
        const { id, ...data } = req.body;
        if (resource === 'leads') {
            const updated = await prisma.lead.update({ where: { id }, data: { stage: data.stage } });
            return res.status(200).json(updated);
        }
        if (resource === 'clients') {
            const updated = await prisma.client.update({
                where: { id },
                data: {
                    companyName: data.companyName,
                    contactName: data.contactName,
                    email: data.email,
                    phone: data.phone,
                    rfc: data.rfc,
                    address: data.address,
                    latitude: parseFloat(data.latitude) || null,
                    longitude: parseFloat(data.longitude) || null,
                    status: data.status
                }
            });
            return res.status(200).json(updated);
        }
    }

    // --- LÓGICA DE DELETE ---
    if (method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'ID requerido' });

        if (resource === 'leads') {
            await prisma.lead.delete({ where: { id } });
            return res.status(200).json({ success: true });
        }
        if (resource === 'clients') {
            // Nota: Podría fallar si tiene OTs o Cotizaciones vinculadas (Integridad Referencial)
            await prisma.client.delete({ where: { id } });
            return res.status(200).json({ success: true });
        }
    }

    // Si nada coincide, devolvemos 405 con más info
    return res.status(405).json({ 
        error: 'Recurso o Método no soportado', 
        details: `Resource: ${resource}, Method: ${method}` 
    });

  } catch (error) {
    console.error("CRM API ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
