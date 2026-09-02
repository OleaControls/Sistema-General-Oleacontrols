import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'
import { uploadToR2, signUrlIfNeeded } from '../_lib/r2.js'

/* Documentación que el técnico necesita vigente para entrar a sitio.
   Espejo de `src/lib/fieldDocs.js`: si allá se agrega un tipo, sumarlo aquí. */
const DOC_TYPES = [
  'IMSS', 'DC3', 'PAGO_SEGURO', 'LISTA_TRABAJADORES', 'INE', 'ESPIROMETRIA',
];

// Quién puede administrar el expediente de cualquier técnico.
const MANAGER_ROLES = ['ADMIN', 'HR', 'SUPERVISOR'];

const rolesDe = (auth) => Array.isArray(auth?.roles) ? auth.roles : [auth?.roles].filter(Boolean);
const esGestor = (auth) => rolesDe(auth).some(r => MANAGER_ROLES.includes(r));

const aFecha = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** IDs de los técnicos involucrados en una OT (líder + apoyos). */
const idsDeApoyo = (v) => (Array.isArray(v) ? v : [])
  .map(x => (typeof x === 'string' ? x : x?.id))
  .filter(Boolean);

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  const { method } = req;
  const { id, employeeId, otId } = req.query;

  try {
    // ── Resumen por OT: el expediente de todos sus técnicos ─────────────────
    if (method === 'GET' && otId) {
      const ot = await prisma.workOrder.findFirst({
        where: { OR: [{ id: otId }, { otNumber: otId }] },
        select: {
          technicianId: true, supervisorId: true,
          assistantTechs: true, supportTechs: true,
        },
      });
      if (!ot) return res.status(404).json({ error: 'OT no encontrada' });

      const techIds = [
        ot.technicianId,
        ...idsDeApoyo(ot.assistantTechs),
        ...idsDeApoyo(ot.supportTechs),
      ].filter(Boolean);

      // Solo quien participa en la orden puede ver el expediente de su cuadrilla.
      const involucrado = esGestor(auth) || ot.supervisorId === auth.id || techIds.includes(auth.id);
      if (!involucrado) return res.status(403).json({ error: 'No participas en esta orden de trabajo' });

      if (techIds.length === 0) return res.status(200).json([]);

      const [tecnicos, docs] = await Promise.all([
        prisma.employee.findMany({
          where: { id: { in: techIds } },
          select: { id: true, name: true, avatar: true },
        }),
        prisma.techFieldDoc.findMany({ where: { employeeId: { in: techIds } } }),
      ]);

      await Promise.all(docs.map(async (d) => { d.url = await signUrlIfNeeded(d.url); }));

      return res.status(200).json(
        tecnicos.map(t => ({ ...t, docs: docs.filter(d => d.employeeId === t.id) }))
      );
    }

    // ── Expediente de un técnico ────────────────────────────────────────────
    if (method === 'GET') {
      const target = employeeId || auth.id;
      // El propio siempre; el de otro solo un gestor.
      if (target !== auth.id && !esGestor(auth)) {
        return res.status(403).json({ error: 'No puedes ver el expediente de otro colaborador' });
      }
      const docs = await prisma.techFieldDoc.findMany({
        where: { employeeId: target },
        orderBy: { createdAt: 'desc' },
      });
      await Promise.all(docs.map(async (d) => { d.url = await signUrlIfNeeded(d.url); }));
      return res.status(200).json(docs);
    }

    // ── Alta ────────────────────────────────────────────────────────────────
    if (method === 'POST') {
      const { employeeId: target, type, url, issuedAt, expiresAt, notes } = req.body || {};
      const dueno = target || auth.id;

      if (dueno !== auth.id && !esGestor(auth)) {
        return res.status(403).json({ error: 'No puedes cargar documentos de otro colaborador' });
      }
      if (!DOC_TYPES.includes(type)) return res.status(400).json({ error: 'Tipo de documento inválido' });
      if (!url) return res.status(400).json({ error: 'Falta el archivo' });

      // El archivo puede llegar como data-URI (se sube aquí) o como URL ya en R2.
      const finalUrl = String(url).startsWith('data:')
        ? await uploadToR2(url, 'tech-field-docs')
        : url;

      const empleado = await prisma.employee.findUnique({
        where: { id: auth.id }, select: { name: true },
      });

      const creado = await prisma.techFieldDoc.create({
        data: {
          employeeId: dueno,
          type,
          url: finalUrl,
          issuedAt:  aFecha(issuedAt),
          expiresAt: aFecha(expiresAt),
          notes: notes ? String(notes).trim() : null,
          uploadedByName: empleado?.name || auth.email || null,
        },
      });
      return res.status(201).json(creado);
    }

    // ── Edición ─────────────────────────────────────────────────────────────
    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Falta el id del documento' });
      const actual = await prisma.techFieldDoc.findUnique({ where: { id }, select: { employeeId: true } });
      if (!actual) return res.status(404).json({ error: 'Documento no encontrado' });
      if (actual.employeeId !== auth.id && !esGestor(auth)) {
        return res.status(403).json({ error: 'No puedes editar este documento' });
      }

      // Solo se tocan los campos que vienen en el cuerpo: mandar uno no borra los demás.
      const data = {};
      const b = req.body || {};
      if (b.type !== undefined) {
        if (!DOC_TYPES.includes(b.type)) return res.status(400).json({ error: 'Tipo de documento inválido' });
        data.type = b.type;
      }
      if (b.url !== undefined && b.url) {
        data.url = String(b.url).startsWith('data:') ? await uploadToR2(b.url, 'tech-field-docs') : b.url;
      }
      if (b.issuedAt  !== undefined) data.issuedAt  = aFecha(b.issuedAt);
      if (b.expiresAt !== undefined) data.expiresAt = aFecha(b.expiresAt);
      if (b.notes     !== undefined) data.notes     = b.notes ? String(b.notes).trim() : null;

      return res.status(200).json(await prisma.techFieldDoc.update({ where: { id }, data }));
    }

    // ── Baja ────────────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Falta el id del documento' });
      const actual = await prisma.techFieldDoc.findUnique({ where: { id }, select: { employeeId: true } });
      if (!actual) return res.status(404).json({ error: 'Documento no encontrado' });
      if (actual.employeeId !== auth.id && !esGestor(auth)) {
        return res.status(403).json({ error: 'No puedes eliminar este documento' });
      }
      await prisma.techFieldDoc.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no soportado' });
  } catch (error) {
    console.error('[TECH-DOCS ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
}
