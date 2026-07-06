import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

// ── ISR simplificado (tabla 2024 SAT, quincena → mensual equiv.) ─────────────
const ISR_TABLE = [
  { lim: 746.04,     tasa: 0.0192, cuota:   0       },
  { lim: 6332.05,    tasa: 0.0640, cuota:  14.32    },
  { lim: 11128.01,   tasa: 0.1088, cuota:  371.83   },
  { lim: 12935.82,   tasa: 0.1600, cuota:  893.63   },
  { lim: 15487.71,   tasa: 0.1792, cuota: 1182.88   },
  { lim: 31236.49,   tasa: 0.2136, cuota: 1640.18   },
  { lim: 49233.00,   tasa: 0.2352, cuota: 5004.12   },
  { lim: 93993.90,   tasa: 0.3000, cuota: 9236.89   },
  { lim: 125325.20,  tasa: 0.3200, cuota: 22665.17  },
  { lim: Infinity,   tasa: 0.3400, cuota: 32691.18  },
];

function calcISR(grossMonthly) {
  for (const row of ISR_TABLE) {
    if (grossMonthly <= row.lim) {
      const base   = grossMonthly - (ISR_TABLE[ISR_TABLE.indexOf(row) - 1]?.lim ?? 0);
      return row.cuota + base * row.tasa;
    }
  }
  return 0;
}

// ── Días según tipo de período ────────────────────────────────────────────────
const PERIOD_DAYS = { SEMANAL: 7, QUINCENAL: 15, MENSUAL: 30 };
const MONTHLY_FACTOR = { SEMANAL: 4.33, QUINCENAL: 2, MENSUAL: 1 };

function calcItem({ employee, type, absenceDays = 0, overtimeHours = 0, bonuses = [], extraDeductions = [] }) {
  const monthlySalary  = employee.salary || 0;
  const periodDays     = PERIOD_DAYS[type]     || 15;
  const factor         = MONTHLY_FACTOR[type]  || 2;
  const baseSalary     = monthlySalary / factor;

  const dailyRate      = baseSalary / periodDays;
  const absenceDeduct  = dailyRate * absenceDays;
  const hourlyRate     = dailyRate / 8;
  const overtimePay    = hourlyRate * 1.5 * overtimeHours;
  const bonusTotal     = bonuses.reduce((s, b) => s + (b.amount || 0), 0);
  const grossPay       = Math.max(0, baseSalary - absenceDeduct + overtimePay + bonusTotal);

  // IMSS cuota obrera (simplifcado 6.75%)
  const imss           = grossPay * 0.0675;
  // ISR: convertir a mensual, calcular, dividir por factor
  const monthlyGross   = grossPay * factor;
  const isrMonthly     = calcISR(monthlyGross);
  const isr            = isrMonthly / factor;
  // INFONAVIT: trabajador no paga directamente (lo paga el patrón); en UI se puede mostrar como 0
  const infonavit      = 0;

  const extraDeductTotal = extraDeductions.reduce((s, d) => s + (d.amount || 0), 0);
  const totalDeductions  = imss + isr + infonavit + extraDeductTotal;
  const netPay           = Math.max(0, grossPay - totalDeductions);

  return {
    baseSalary: round(baseSalary),
    absenceDays,
    absenceDeduct: round(absenceDeduct),
    overtimeHours,
    overtimePay: round(overtimePay),
    bonuses,
    bonusTotal: round(bonusTotal),
    grossPay: round(grossPay),
    imss: round(imss),
    isr: round(isr),
    infonavit,
    extraDeductions,
    totalDeductions: round(totalDeductions),
    netPay: round(netPay),
  };
}

const round = (n) => Math.round(n * 100) / 100;

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  const method = req.method?.toUpperCase();

  try {
    // ── GET ────────────────────────────────────────────────────────────────────
    if (method === 'GET') {
      const { id } = req.query;

      if (id) {
        const period = await prisma.payrollPeriod.findUnique({
          where: { id },
          include: { items: { orderBy: { employeeName: 'asc' } } },
        });
        if (!period) return res.status(404).json({ error: 'Período no encontrado' });
        return res.status(200).json(period);
      }

      const periods = await prisma.payrollPeriod.findMany({
        orderBy: { startDate: 'desc' },
        include: { _count: { select: { items: true } } },
      });
      return res.status(200).json({ periods });
    }

    // ── POST ───────────────────────────────────────────────────────────────────
    if (method === 'POST') {
      const { action } = req.query;

      // Aprobar período
      if (action === 'approve') {
        const { id } = req.body;
        const updated = await prisma.payrollPeriod.update({
          where: { id }, data: { status: 'APPROVED', updatedAt: new Date() }
        });
        return res.status(200).json(updated);
      }

      // Marcar como pagada
      if (action === 'pay') {
        const { id } = req.body;
        const updated = await prisma.payrollPeriod.update({
          where: { id }, data: { status: 'PAID', updatedAt: new Date() }
        });
        return res.status(200).json(updated);
      }

      // Actualizar ítem individual (ajustes manuales)
      if (action === 'update-item') {
        const { itemId, absenceDays, overtimeHours, bonuses, extraDeductions, notes } = req.body;
        const item = await prisma.payrollItem.findUnique({ where: { id: itemId } });
        if (!item) return res.status(404).json({ error: 'Ítem no encontrado' });

        const period = await prisma.payrollPeriod.findUnique({ where: { id: item.periodId } });
        const empSnap = {
          salary: item.baseSalary * (MONTHLY_FACTOR[period.type] || 2), // reconstruir mensual
        };

        const calc = calcItem({
          employee: empSnap,
          type: period.type,
          absenceDays:     absenceDays     ?? item.absenceDays,
          overtimeHours:   overtimeHours   ?? item.overtimeHours,
          bonuses:         bonuses         ?? item.bonuses,
          extraDeductions: extraDeductions ?? item.extraDeductions,
        });

        const updated = await prisma.payrollItem.update({
          where: { id: itemId },
          data: { ...calc, notes: notes ?? item.notes },
        });

        // Recalcular totales del período
        await recalcPeriodTotals(item.periodId);

        return res.status(200).json(updated);
      }

      // ── Crear período y generar ítems ───────────────────────────────────────
      const { name, type, startDate, endDate, notes } = req.body;
      if (!name || !startDate || !endDate) return res.status(400).json({ error: 'Nombre y fechas requeridos' });

      // Empleados activos con salario
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, position: true, department: true, salary: true },
      });

      const empType = type || 'QUINCENAL';

      const period = await prisma.payrollPeriod.create({
        data: {
          name, type: empType,
          startDate: new Date(startDate),
          endDate:   new Date(endDate),
          status: 'DRAFT',
          notes,
          employeeCount: employees.length,
          items: {
            create: employees.map(emp => {
              const c = calcItem({ employee: emp, type: empType });
              return {
                employeeId:   emp.id,
                employeeName: emp.name,
                employeePos:  emp.position  || '',
                employeeDept: emp.department || '',
                ...c,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Recalcular totales
      await recalcPeriodTotals(period.id);

      const fresh = await prisma.payrollPeriod.findUnique({
        where: { id: period.id },
        include: { items: { orderBy: { employeeName: 'asc' } } },
      });

      return res.status(201).json(fresh);
    }

    // ── PUT ────────────────────────────────────────────────────────────────────
    if (method === 'PUT') {
      const { id, ...data } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate)   data.endDate   = new Date(data.endDate);
      const updated = await prisma.payrollPeriod.update({ where: { id }, data });
      return res.status(200).json(updated);
    }

    // ── DELETE ─────────────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      await prisma.payrollPeriod.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[Payroll]', err);
    return res.status(500).json({ error: err.message });
  }
}

async function recalcPeriodTotals(periodId) {
  const items = await prisma.payrollItem.findMany({ where: { periodId } });
  const totalGross      = items.reduce((s, i) => s + i.grossPay,      0);
  const totalDeductions = items.reduce((s, i) => s + i.totalDeductions, 0);
  const totalNet        = items.reduce((s, i) => s + i.netPay,        0);
  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      totalGross:      round(totalGross),
      totalDeductions: round(totalDeductions),
      totalNet:        round(totalNet),
      employeeCount:   items.length,
    },
  });
}
