import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  const method = req.method?.toUpperCase();

  try {
    // ── GET ────────────────────────────────────────────────────────────────────
    if (method === 'GET') {
      const { id, employeeId } = req.query;

      if (id) {
        const survey = await prisma.survey.findUnique({
          where: { id },
          include: {
            responses: {
              include: {
                // traer nombre del empleado si no es anónima
              },
            },
          },
        });
        if (!survey) return res.status(404).json({ error: 'No encontrada' });

        // Enriquecer respuestas con nombre del empleado si no es anónima
        let responses = survey.responses;
        if (!survey.anonymous) {
          const empIds = [...new Set(responses.flatMap(r => r.employeeId ? [r.employeeId] : []))];
          const emps = empIds.length
            ? await prisma.employee.findMany({ where: { id: { in: empIds } }, select: { id: true, name: true, department: true, avatar: true } })
            : [];
          const empMap = Object.fromEntries(emps.map(e => [e.id, e]));
          responses = responses.map(r => ({ ...r, employee: r.employeeId ? empMap[r.employeeId] : null }));
        }

        return res.status(200).json({ ...survey, responses });
      }

      const surveys = await prisma.survey.findMany({
        orderBy: { createdAt: 'desc' },
        include: { responses: { select: { id: true, employeeId: true } } },
      });

      const totalEmps = await prisma.employee.count({ where: { status: 'ACTIVE' } });

      const result = surveys.map(s => ({
        ...s,
        responsesCount: s.responses.length,
        responseRate:   totalEmps > 0 ? Math.round((s.responses.length / totalEmps) * 100) : 0,
        answeredByMe:   employeeId ? s.responses.some(r => r.employeeId === employeeId) : false,
      }));

      return res.status(200).json({ surveys: result, totalEmployees: totalEmps });
    }

    // ── POST ───────────────────────────────────────────────────────────────────
    if (method === 'POST') {
      const { action } = req.query;

      // Enviar respuesta
      if (action === 'respond') {
        const { surveyId, employeeId, answers } = req.body;
        if (!surveyId || !answers) return res.status(400).json({ error: 'Faltan parámetros' });

        const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
        if (!survey) return res.status(404).json({ error: 'Encuesta no encontrada' });
        if (survey.status !== 'ACTIVE') return res.status(400).json({ error: 'Encuesta cerrada' });

        const empId = survey.anonymous ? null : (employeeId || null);

        let resp;
        if (survey.anonymous) {
          // Encuestas anónimas: siempre crear nueva
          resp = await prisma.surveyResponse.create({ data: { surveyId, employeeId: null, answers } });
        } else {
          // No anónima: un registro por empleado
          resp = await prisma.surveyResponse.upsert({
            where:  { surveyId_employeeId: { surveyId, employeeId: empId || '' } },
            update: { answers },
            create: { surveyId, employeeId: empId, answers },
          });
        }
        return res.status(200).json(resp);
      }

      // Crear encuesta
      const { title, description, status, anonymous, endDate, questions, targetDepts, targetRoles } = req.body;
      if (!title) return res.status(400).json({ error: 'Título requerido' });

      const survey = await prisma.survey.create({
        data: {
          title, description,
          status:      status || 'ACTIVE',
          anonymous:   anonymous !== false,
          endDate:     endDate ? new Date(endDate) : null,
          questions:   Array.isArray(questions) ? questions : [],
          targetDepts: Array.isArray(targetDepts) ? targetDepts : [],
          targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
        },
      });
      return res.status(201).json(survey);
    }

    // ── PUT ────────────────────────────────────────────────────────────────────
    if (method === 'PUT') {
      const { id, ...data } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      if (data.endDate) data.endDate = new Date(data.endDate);
      const updated = await prisma.survey.update({ where: { id }, data });
      return res.status(200).json(updated);
    }

    // ── DELETE ─────────────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      await prisma.survey.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[Surveys]', err);
    return res.status(500).json({ error: err.message });
  }
}
