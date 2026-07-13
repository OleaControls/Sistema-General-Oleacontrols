import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

// ── Helpers ─────────────────────────────────────────────────────────────────
const pct  = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null);
const avg  = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
const r1   = (n) => (n === null || n === undefined ? null : +n.toFixed(1));

// Parsea checklist JSON (puede venir como string o como objeto)
const parseJson = (v) => {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
};

// Una tarea de checklist se considera "OK" solo si es explícitamente true
const isOk = (v) => v === true;

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Calcula el rango [start, end] (UTC) para el periodo pedido a partir de una fecha de referencia.
// period: 'day' | 'quincena' | 'month' | 'year' | 'all'
function getRange(period, dateStr) {
  if (!period || period === 'all') return null;
  const ref = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(ref)) return null;
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const d = ref.getUTCDate();
  let start, end, label;

  switch (period) {
    case 'day':
      start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
      end   = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
      label = `${d} ${MESES[m]} ${y}`;
      break;
    case 'quincena':
      if (d <= 15) {
        start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        end   = new Date(Date.UTC(y, m, 15, 23, 59, 59, 999));
        label = `1–15 ${MESES[m]} ${y}`;
      } else {
        start = new Date(Date.UTC(y, m, 16, 0, 0, 0, 0));
        end   = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        label = `16–${end.getUTCDate()} ${MESES[m]} ${y}`;
      }
      break;
    case 'month':
      start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
      end   = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      label = `${MESES[m]} ${y}`;
      break;
    case 'year':
      start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      end   = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      label = `${y}`;
      break;
    default:
      return null;
  }
  return { start, end, label };
}

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── 1. Solo técnicos activos ────────────────────────────────────────────
    const techs = await prisma.employee.findMany({
      where: { status: 'ACTIVE', roles: { has: 'TECHNICIAN' } },
      select: { id: true, name: true, position: true, department: true, avatar: true, joinDate: true },
    });

    if (!techs.length) {
      return res.status(200).json({ technicians: [], team: null, total: 0, period: (req.query.period || 'all'), range: { label: '—' }, generatedAt: new Date().toISOString() });
    }

    const ids = techs.map(t => t.id);

    // ── Rango de fechas del periodo solicitado (día/quincena/mes/año/todo) ────
    const period = (req.query.period || 'all').toLowerCase();
    const range  = getRange(period, req.query.date);
    // Filtro por fecha calendario (attendance, logs) y por createdAt (ots, evals, panoramas)
    const dateFilter    = range ? { date:      { gte: range.start, lte: range.end } } : {};
    const createdFilter = range ? { createdAt: { gte: range.start, lte: range.end } } : {};

    // ── 2. Fetch en paralelo (filtrado por periodo) ─────────────────────────
    const [attendance, logs, ots, evaluations, panoramas] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { employeeId: { in: ids }, ...dateFilter },
        select: { employeeId: true, type: true, minutesLate: true, date: true },
      }),
      prisma.techAttendanceLog.findMany({
        where: { techId: { in: ids }, ...dateFilter },
        select: { techId: true, status: true, checkInTime: true, checklistPersonal: true, checklistVehicle: true, date: true },
      }),
      prisma.workOrder.findMany({
        where: { technicianId: { in: ids }, ...createdFilter },
        select: {
          technicianId: true, status: true, createdAt: true,
          scheduledDate: true, startedAt: true, finishedAt: true,
          signature: true, clientSignature: true,
        },
      }),
      prisma.evaluation.findMany({
        where: { targetId: { in: ids }, type: { in: ['CUSTOMER_TECH', 'CUSTOMER_SERVICE', 'OPS_TECH'] }, ...createdFilter },
        select: { targetId: true, type: true, score1: true, score2: true, score3: true, comment: true, improvements: true, createdAt: true },
      }),
      prisma.otPanoramizacion.findMany({
        where: { techId: { in: ids }, ...createdFilter },
        select: { techId: true },
      }),
    ]);

    // ── 3. Indexar por técnico ──────────────────────────────────────────────
    const byKey = (arr, key) => arr.reduce((m, r) => { (m[r[key]] ??= []).push(r); return m; }, {});
    const attBy   = byKey(attendance,  'employeeId');
    const logsBy  = byKey(logs,        'techId');
    const otsBy   = byKey(ots,         'technicianId');
    const evalBy  = byKey(evaluations, 'targetId');
    const panoBy  = byKey(panoramas,   'techId');

    // ── 4. Métricas por técnico ─────────────────────────────────────────────
    const technicians = techs.map(t => {
      // ── PUNTUALIDAD ───────────────────────────────────────────────────────
      const att = attBy[t.id] || [];
      const present    = att.filter(r => r.type === 'PRESENT').length;
      const late       = att.filter(r => r.type === 'LATE').length;
      const absent     = att.filter(r => r.type === 'ABSENT').length;
      const permission = att.filter(r => r.type === 'PERMISSION').length;
      const medical    = att.filter(r => r.type === 'MEDICAL').length;
      // Base para puntualidad = días efectivamente laborables (presente + tarde + falta)
      const workDays   = present + late + absent;
      const punctualityRate = pct(present, workDays);            // % que llegó a tiempo
      const lateRecs   = att.filter(r => r.minutesLate);
      const avgLateMin = lateRecs.length ? Math.round(avg(lateRecs.map(r => r.minutesLate || 0))) : 0;

      const tLogs      = logsBy[t.id] || [];
      const withCheckin= tLogs.filter(l => l.checkInTime).length;
      const checkinRate= pct(withCheckin, tLogs.length);

      // Puntualidad percibida por el cliente (survey q2 de CUSTOMER_TECH / CUSTOMER_SERVICE)
      const clientPunctScores = (evalBy[t.id] || [])
        .filter(e => ['CUSTOMER_TECH', 'CUSTOMER_SERVICE'].includes(e.type) && e.score2 != null)
        .map(e => e.score2);
      const clientPunctuality = r1(avg(clientPunctScores));

      // ── OT: HERRAMIENTAS · CHECKLIST · FIRMAS ─────────────────────────────
      const withPersonal = tLogs.filter(l => parseJson(l.checklistPersonal));
      // Herramientas OK = toolsBasic y toolsSpecial en true
      const toolsOk = withPersonal.filter(l => {
        const c = parseJson(l.checklistPersonal);
        return isOk(c?.toolsBasic) && isOk(c?.toolsSpecial);
      }).length;
      const toolsRate = pct(toolsOk, withPersonal.length);
      // EPP OK (uniforme + equipo de protección)
      const eppOk = withPersonal.filter(l => {
        const c = parseJson(l.checklistPersonal);
        return isOk(c?.uniform) && isOk(c?.epp);
      }).length;
      const eppRate = pct(eppOk, withPersonal.length);
      // Checklist diario completo (status COMPLETE)
      const checklistDone = tLogs.filter(l => l.status === 'COMPLETE').length;
      const checklistRate = pct(checklistDone, tLogs.length);

      const empOTs   = otsBy[t.id] || [];
      const totalOTs = empOTs.length;
      const closedOTs= empOTs.filter(o => ['COMPLETED', 'VALIDATED'].includes(o.status));
      // Firmas: técnico y cliente (sobre OTs cerradas, que es donde deben existir)
      const sigBase       = closedOTs.length || totalOTs;
      const techSignCount = empOTs.filter(o => o.signature).length;
      const cliSignCount  = empOTs.filter(o => o.clientSignature).length;
      const techSignRate  = pct(techSignCount, sigBase);
      const clientSignRate= pct(cliSignCount, sigBase);
      const bothSignRate  = pct(empOTs.filter(o => o.signature && o.clientSignature).length, sigBase);

      const panoramas    = (panoBy[t.id] || []).length;

      // ── ENCUESTAS DE CLIENTE ──────────────────────────────────────────────
      const evals      = evalBy[t.id] || [];
      const clientEvals= evals.filter(e => ['CUSTOMER_TECH', 'CUSTOMER_SERVICE'].includes(e.type));
      const evalAvg = (list) => {
        const perEval = list.map(e => {
          const sc = [e.score1, e.score2, e.score3].filter(x => x != null);
          return sc.length ? avg(sc) : null;
        }).filter(x => x != null);
        return r1(avg(perEval));
      };
      const surveyAvg      = evalAvg(clientEvals);
      const satisfaction   = r1(avg(clientEvals.filter(e => e.score1 != null).map(e => e.score1)));
      const techLevel      = r1(avg(clientEvals.filter(e => e.score3 != null).map(e => e.score3)));
      const recentComments = evals
        .filter(e => e.comment || e.improvements)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3)
        .map(e => ({ type: e.type, text: e.comment || e.improvements, date: e.createdAt }));
      // Cobertura de encuestas: OTs cerradas que recibieron respuesta del cliente
      const surveyCoverage = pct(clientEvals.length, closedOTs.length || totalOTs);

      // ── TIEMPO DE RESOLUCIÓN ──────────────────────────────────────────────
      // Horas de ejecución en sitio (startedAt → finishedAt)
      const execHours = empOTs
        .filter(o => o.startedAt && o.finishedAt)
        .map(o => (new Date(o.finishedAt) - new Date(o.startedAt)) / 3600000)
        .filter(h => h >= 0);
      const avgExecHours = r1(avg(execHours));
      // Días de resolución total (creación → cierre) — mide tiempo de atención de la asignación
      const resolveDays = empOTs
        .filter(o => o.finishedAt)
        .map(o => (new Date(o.finishedAt) - new Date(o.createdAt)) / 86400000)
        .filter(d => d >= 0);
      const avgResolveDays = r1(avg(resolveDays));
      const completedCount = closedOTs.length;

      // ── SCORE COMPUESTO (0-100) ──────────────────────────────────────────
      // Puntualidad 35% · Cumplimiento OT (herramientas+checklist+firmas) 30% ·
      // Encuestas 25% · Tiempo de resolución 10%
      const otComplianceParts = [toolsRate, checklistRate, clientSignRate].filter(x => x != null);
      const otCompliance = otComplianceParts.length ? Math.round(avg(otComplianceParts)) : null;
      const surveyScore  = surveyAvg != null ? Math.round((surveyAvg / 5) * 100) : null;
      // Resolución: normalizamos contra 8h de referencia (más rápido = mejor)
      const resolveScore = avgExecHours != null ? Math.max(0, Math.min(100, Math.round((8 / Math.max(avgExecHours, 0.5)) * 100 > 100 ? 100 : (8 / Math.max(avgExecHours, 0.5)) * 100))) : null;

      const scoreParts = [
        { v: punctualityRate, w: 0.35 },
        { v: otCompliance,    w: 0.30 },
        { v: surveyScore,     w: 0.25 },
        { v: resolveScore,    w: 0.10 },
      ].filter(p => p.v != null);
      let score = null;
      if (scoreParts.length) {
        const totalW = scoreParts.reduce((s, p) => s + p.w, 0);
        score = Math.round(scoreParts.reduce((s, p) => s + p.v * p.w, 0) / totalW);
      }

      return {
        id: t.id, name: t.name, position: t.position, department: t.department,
        avatar: t.avatar, joinDate: t.joinDate,
        puntualidad: {
          daysRegistered: workDays, present, late, absent, permission, medical,
          rate: punctualityRate, avgLateMin, checkinRate, checkins: withCheckin, logDays: tLogs.length,
          clientPunctuality,
        },
        ot: {
          totalLogs: tLogs.length,
          toolsRate, eppRate, checklistRate, checklistDone,
          totalOTs, closedOTs: completedCount,
          techSignRate, clientSignRate, bothSignRate,
          techSignCount, clientSignCount: cliSignCount,
          panoramas,
        },
        encuestas: {
          total: clientEvals.length, avg: surveyAvg, satisfaction,
          puntualidad: clientPunctuality, tecnico: techLevel,
          coverage: surveyCoverage, recentComments,
        },
        resolucion: {
          completed: completedCount, avgExecHours, avgResolveDays,
          samplesExec: execHours.length, samplesResolve: resolveDays.length,
        },
        subscores: { puntualidad: punctualityRate, ot: otCompliance, encuestas: surveyScore, resolucion: resolveScore },
        score,
      };
    });

    technicians.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

    // ── 5. KPIs de equipo ───────────────────────────────────────────────────
    const collect = (sel) => technicians.map(sel).filter(x => x != null);
    const team = {
      techCount:          technicians.length,
      avgPunctuality:     r1(avg(collect(t => t.puntualidad.rate))),
      avgToolsRate:       r1(avg(collect(t => t.ot.toolsRate))),
      avgChecklistRate:   r1(avg(collect(t => t.ot.checklistRate))),
      avgSignatureRate:   r1(avg(collect(t => t.ot.clientSignRate))),
      totalSurveys:       technicians.reduce((s, t) => s + t.encuestas.total, 0),
      avgSurveyScore:     r1(avg(collect(t => t.encuestas.avg))),
      avgExecHours:       r1(avg(collect(t => t.resolucion.avgExecHours))),
      totalClosedOTs:     technicians.reduce((s, t) => s + t.ot.closedOTs, 0),
      avgScore:           r1(avg(collect(t => t.score))),
      topPerformer:       technicians.find(t => t.score != null)?.name || null,
    };

    return res.status(200).json({
      technicians, team, total: technicians.length,
      period,
      range: range
        ? { start: range.start.toISOString(), end: range.end.toISOString(), label: range.label }
        : { label: 'Todo el historial' },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[tech-kpis] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
