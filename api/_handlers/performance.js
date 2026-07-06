import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── 1. Todos los empleados activos ──────────────────────────────────────
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, name: true, position: true, department: true,
        roles: true, joinDate: true, contractType: true, salary: true,
        avatar: true, vacationBalance: true,
      },
    });

    if (!employees.length) return res.status(200).json({ employees: [], generatedAt: new Date().toISOString() });

    const ids = employees.map(e => e.id);

    // ── 2. Fetch en paralelo sin filtro de fecha (TODO el historial) ─────────
    const [
      attendance,
      ots,
      evaluations,
      expenses,
      techLogs,
      salesReports,
      salesBitacora,
      vacations,
      personalAudits,
      assets,
    ] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { employeeId: { in: ids } },
        select: { employeeId: true, type: true, minutesLate: true, date: true },
      }),
      prisma.workOrder.findMany({
        where: { technicianId: { in: ids } },
        select: {
          id: true, technicianId: true, status: true,
          startedAt: true, finishedAt: true, assignedFunds: true,
          pendingTasks: true, clientSignature: true,
        },
      }),
      prisma.evaluation.findMany({
        where: { targetId: { in: ids } },
        select: { targetId: true, type: true, score1: true, score2: true, score3: true, comment: true, createdAt: true },
      }),
      prisma.expense.findMany({
        where: { employeeId: { in: ids } },
        select: { employeeId: true, amount: true, status: true, category: true },
      }),
      prisma.techAttendanceLog.findMany({
        where: { techId: { in: ids } },
        select: { techId: true, status: true, checkInTime: true, checklistPersonal: true, checklistVehicle: true },
      }),
      prisma.salesDailyReport.findMany({
        where: { sellerId: { in: ids } },
        select: { sellerId: true, llamadas: true, visitas: true, cotizaciones: true, cierres: true, venta: true, efec: true, mensajes: true },
      }),
      prisma.salesBitacora.findMany({
        where: { sellerId: { in: ids } },
        select: { sellerId: true, potencial: true, decisor: true, resultado: true },
      }),
      prisma.vacationRequest.findMany({
        where: { employeeId: { in: ids } },
        select: { employeeId: true, status: true, days: true, type: true },
      }),
      prisma.personalAudit.findMany({
        where: { employeeId: { in: ids } },
        select: { employeeId: true, isLeader: true, didWell: true, didPoor: true },
      }),
      prisma.asset.findMany({
        where: { assignedToId: { in: ids } },
        select: { assignedToId: true, category: true, conditionPercent: true, condition: true, name: true },
      }),
    ]);

    // ── 3. Indexar arrays por empleado ───────────────────────────────────────
    const byEmp = (arr, key) => arr.reduce((m, r) => {
      const k = r[key]; (m[k] ??= []).push(r); return m;
    }, {});

    const attByEmp    = byEmp(attendance,    'employeeId');
    const otsByTech   = byEmp(ots,           'technicianId');
    const evalByTarg  = byEmp(evaluations,   'targetId');
    const expByEmp    = byEmp(expenses,      'employeeId');
    const logsByTech  = byEmp(techLogs,      'techId');
    const salesByEmp  = byEmp(salesReports,  'sellerId');
    const bitByEmp    = byEmp(salesBitacora, 'sellerId');
    const vacByEmp    = byEmp(vacations,     'employeeId');
    const auditByEmp  = byEmp(personalAudits,'employeeId');
    const assetsByEmp = byEmp(assets,        'assignedToId');

    // ── 4. Métricas por empleado ─────────────────────────────────────────────
    const result = employees.map(emp => {

      // ─ Asistencia ──────────────────────────────────────────────────────────
      const attRecs    = attByEmp[emp.id] || [];
      const present    = attRecs.filter(r => r.type === 'PRESENT').length;
      const absent     = attRecs.filter(r => r.type === 'ABSENT').length;
      const late       = attRecs.filter(r => r.type === 'LATE').length;
      const medical    = attRecs.filter(r => r.type === 'MEDICAL').length;
      const permission = attRecs.filter(r => r.type === 'PERMISSION').length;
      const holiday    = attRecs.filter(r => r.type === 'HOLIDAY').length;
      const totalAtt   = attRecs.length;
      const attRate    = totalAtt > 0 ? Math.round(((present + late) / totalAtt) * 100) : null;
      const lateRecs   = attRecs.filter(r => r.minutesLate);
      const avgLate    = lateRecs.length ? Math.round(lateRecs.reduce((s,r)=>s+(r.minutesLate||0),0)/lateRecs.length) : 0;
      const punctuality= totalAtt > 0 ? Math.round((present / totalAtt) * 100) : null;

      // ─ Órdenes de Trabajo ──────────────────────────────────────────────────
      const empOTs       = otsByTech[emp.id] || [];
      const totalOTs     = empOTs.length;
      const compOTs      = empOTs.filter(o => ['COMPLETED','VALIDATED'].includes(o.status)).length;
      const inProgOTs    = empOTs.filter(o => o.status === 'IN_PROGRESS').length;
      const pendOTs      = empOTs.filter(o => ['PENDING','ASSIGNED','ACCEPTED'].includes(o.status)).length;
      const otsWithSig   = empOTs.filter(o => o.clientSignature).length;
      const signRate     = totalOTs > 0 ? Math.round((otsWithSig/totalOTs)*100) : null;
      const otsWithPend  = empOTs.filter(o => {
        try { const p = typeof o.pendingTasks==='string'?JSON.parse(o.pendingTasks):o.pendingTasks; return Array.isArray(p)&&p.length>0; } catch{return false;}
      }).length;
      const otTimes      = empOTs.flatMap(o=>(o.startedAt&&o.finishedAt)?[(new Date(o.finishedAt)-new Date(o.startedAt))/3600000]:[]);
      const avgOTHours   = otTimes.length ? +(otTimes.reduce((s,v)=>s+v,0)/otTimes.length).toFixed(1) : null;
      const compRate     = totalOTs > 0 ? Math.round((compOTs/totalOTs)*100) : null;
      const fundsManaged = empOTs.reduce((s,o)=>s+(o.assignedFunds||0),0);

      // ─ Evaluaciones ────────────────────────────────────────────────────────
      const evals      = evalByTarg[emp.id] || [];
      const totalEvals = evals.length;
      const evalAvg    = totalEvals > 0
        ? +(evals.reduce((s,e)=>{
            const sc = [e.score1,e.score2,e.score3].filter(x=>x!==null&&x!==undefined);
            return s+(sc.length?sc.reduce((a,b)=>a+b,0)/sc.length:0);
          },0)/totalEvals).toFixed(2)
        : null;

      const evalsByType = {};
      ['CUSTOMER_TECH','OPS_TECH','CUSTOMER_SERVICE','CUSTOMER_EXEC'].forEach(t=>{
        const arr = evals.filter(e=>e.type===t);
        if(!arr.length) return;
        evalsByType[t] = +(arr.reduce((s,e)=>{
          const sc=[e.score1,e.score2,e.score3].filter(x=>x!=null);
          return s+(sc.length?sc.reduce((a,b)=>a+b,0)/sc.length:0);
        },0)/arr.length).toFixed(2);
      });

      const recentComments = evals
        .filter(e=>e.comment)
        .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
        .slice(0,3)
        .map(e=>({ type:e.type, comment:e.comment }));

      // ─ Gastos ──────────────────────────────────────────────────────────────
      const exps       = expByEmp[emp.id] || [];
      const totalExp   = exps.reduce((s,e)=>s+(e.amount||0),0);
      const approvedEx = exps.filter(e=>e.status==='APPROVED');
      const rejectedEx = exps.filter(e=>e.status==='REJECTED');
      const pendingEx  = exps.filter(e=>e.status==='PENDING');
      const approvedAmt= approvedEx.reduce((s,e)=>s+(e.amount||0),0);
      const rejectedAmt= rejectedEx.reduce((s,e)=>s+(e.amount||0),0);
      const pendingAmt = pendingEx.reduce((s,e)=>s+(e.amount||0),0);
      const expApprRate= exps.length>0?Math.round((approvedEx.length/exps.length)*100):null;
      const expByCat   = exps.reduce((m,e)=>{ m[e.category]=(m[e.category]||0)+e.amount; return m; },{});

      // ─ Tech Attendance / Checklists ────────────────────────────────────────
      const techL          = logsByTech[emp.id] || [];
      const totalLogs      = techL.length;
      const completeLogs   = techL.filter(l=>l.status==='COMPLETE').length;
      const checklistRate  = totalLogs>0?Math.round((completeLogs/totalLogs)*100):null;
      const withCheckin    = techL.filter(l=>l.checkInTime).length;
      const checkinRate    = totalLogs>0?Math.round((withCheckin/totalLogs)*100):null;

      // ─ Ventas ──────────────────────────────────────────────────────────────
      const salesR     = salesByEmp[emp.id] || [];
      const bitEntries = bitByEmp[emp.id] || [];
      const totalCalls   = salesR.reduce((s,r)=>s+(r.llamadas||0),0);
      const totalVisits  = salesR.reduce((s,r)=>s+(r.visitas||0),0);
      const totalQuotes  = salesR.reduce((s,r)=>s+(r.cotizaciones||0),0);
      const totalCierres = salesR.reduce((s,r)=>s+(r.cierres||0),0);
      const totalSales   = salesR.reduce((s,r)=>s+(r.venta||0),0);
      const totalMsgs    = salesR.reduce((s,r)=>s+(r.mensajes||0),0);
      const totalEfec    = salesR.reduce((s,r)=>s+(r.efec||0),0);
      const convRate     = totalCalls>0?+((totalCierres/totalCalls)*100).toFixed(1):null;
      const potentials   = bitEntries.filter(b=>b.potencial).length;
      const decisors     = bitEntries.filter(b=>b.decisor).length;
      const totalBit     = bitEntries.length;

      // ─ Vacaciones ──────────────────────────────────────────────────────────
      const vacs        = vacByEmp[emp.id] || [];
      const vacApproved = vacs.filter(v=>v.status==='APPROVED').reduce((s,v)=>s+(v.days||0),0);
      const vacPending  = vacs.filter(v=>v.status==='PENDING').length;
      const vacRejected = vacs.filter(v=>v.status==='REJECTED').length;

      // ─ Auditorías ──────────────────────────────────────────────────────────
      const audits      = auditByEmp[emp.id] || [];
      const leaderAudits= audits.filter(a=>a.isLeader).length;

      // ─ Activos ─────────────────────────────────────────────────────────────
      const myAssets     = assetsByEmp[emp.id] || [];
      const avgAssetCond = myAssets.length
        ? Math.round(myAssets.reduce((s,a)=>s+(a.conditionPercent||100),0)/myAssets.length)
        : null;

      // ── Score compuesto (0-100) ──────────────────────────────────────────
      // Pesos: Asistencia 25% · OTs 30% · Evaluaciones 30% · Checklists 10% · Gastos 5%
      const attScore  = attRate;
      const otScore   = compRate;
      const evalScore = evalAvg!==null?Math.round((evalAvg/5)*100):null;
      const clScore   = checklistRate;
      const expScore  = expApprRate;

      const parts = [
        { k:'asistencia',   v:attScore,  w:0.25 },
        { k:'ots',          v:otScore,   w:0.30 },
        { k:'evaluaciones', v:evalScore, w:0.30 },
        { k:'checklists',   v:clScore,   w:0.10 },
        { k:'gastos',       v:expScore,  w:0.05 },
      ].filter(p=>p.v!==null);

      let score = null;
      const scoreComponents = {};
      if(parts.length>0){
        const totalW = parts.reduce((s,p)=>s+p.w,0);
        score = Math.round(parts.reduce((s,p)=>s+(p.v*p.w),0)/totalW);
        parts.forEach(p=>{ scoreComponents[p.k]=p.v; });
      }

      return {
        id: emp.id, name: emp.name, position: emp.position,
        department: emp.department, roles: emp.roles,
        joinDate: emp.joinDate, contractType: emp.contractType,
        salary: emp.salary, avatar: emp.avatar,
        vacationBalance: emp.vacationBalance,
        attendance: { total:totalAtt,present,absent,late,medical,permission,holiday,attRate,punctuality,avgLate },
        ots: { total:totalOTs,completed:compOTs,inProgress:inProgOTs,pending:pendOTs,compRate,signRate,otsWithPending:otsWithPend,avgHours:avgOTHours,fundsManaged },
        evaluations: { total:totalEvals,avg:evalAvg,byType:evalsByType,recentComments },
        expenses: { total:totalExp,approved:approvedAmt,rejected:rejectedAmt,pending:pendingAmt,count:exps.length,approvalRate:expApprRate,byCategory:expByCat },
        checklists: { total:totalLogs,complete:completeLogs,rate:checklistRate,checkinRate },
        sales: { calls:totalCalls,visits:totalVisits,quotes:totalQuotes,closings:totalCierres,revenue:totalSales,messages:totalMsgs,effective:totalEfec,convRate,potentials,decisors,bitacoraEntries:totalBit,reportDays:salesR.length },
        vacations: { approved:vacApproved,pending:vacPending,rejected:vacRejected,balance:emp.vacationBalance },
        assets: { count:myAssets.length,avgCondition:avgAssetCond,list:myAssets.map(a=>({name:a.name,category:a.category,condition:a.condition,conditionPercent:a.conditionPercent})) },
        audits: { count:audits.length,leaderCount:leaderAudits },
        score, scoreComponents,
      };
    });

    result.sort((a,b)=>(b.score??-1)-(a.score??-1));

    return res.status(200).json({ employees: result, total: result.length, generatedAt: new Date().toISOString() });
  } catch(err) {
    console.error('Performance handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
