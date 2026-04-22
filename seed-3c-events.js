/**
 * seed-3c-events.js
 * Crea todos los eventos de mantenimiento de Residencial Tres Cumbres (3C)
 * Uso: node seed-3c-events.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Función helper: convierte "DD/MM/YYYY" → Date a mediodía ────────────────
const d = (str) => {
  const [day, month, year] = str.split('/').map(Number);
  return new Date(year, month - 1, day, 9, 0, 0); // 09:00 am
};

// ── Datos de eventos ─────────────────────────────────────────────────────────
const EVENTS_DATA = [
  // ══ TORRE A ══════════════════════════════════════════════════════════════

  // Torre A — Interfones
  ...['06/04/2026','14/05/2026','11/06/2026','16/07/2026','13/08/2026','10/09/2026',
      '15/10/2026','12/11/2026','10/12/2026','14/01/2027','11/02/2027','11/03/2027']
    .map(fecha => ({ title: 'Mantenimiento Interfones — Torre A', fecha, color: '#3b82f6' })),

  // Torre A — Sensores de humo
  ...['31/03/2026','21/05/2026','18/06/2026','23/07/2026','20/08/2026','17/09/2026',
      '22/10/2026','19/11/2026','17/12/2026','21/01/2027','18/02/2027','18/03/2027']
    .map(fecha => ({ title: 'Mantenimiento Sensores de Humo — Torre A', fecha, color: '#ef4444' })),

  // ══ TORRE B ══════════════════════════════════════════════════════════════

  // Torre B — Interfones
  ...['02/04/2026','15/05/2026','12/06/2026','17/07/2026','14/08/2026','11/09/2026',
      '16/10/2026','13/11/2026','11/12/2026','15/01/2027','12/02/2027','12/03/2027']
    .map(fecha => ({ title: 'Mantenimiento Interfones — Torre B', fecha, color: '#8b5cf6' })),

  // Torre B — Sensores de humo
  ...['01/04/2026','22/05/2026','19/06/2026','24/07/2026','21/08/2026','18/09/2026',
      '23/10/2026','20/11/2026','18/12/2026','22/01/2027','18/02/2027','19/03/2027']
    .map(fecha => ({ title: 'Mantenimiento Sensores de Humo — Torre B', fecha, color: '#ef4444' })),

  // ══ TORRE C ══════════════════════════════════════════════════════════════

  // Torre C — Interfones
  ...['28/04/2026','27/05/2026','25/06/2026','29/07/2026','26/08/2026','25/09/2026',
      '28/10/2026','25/11/2026','14/12/2026','27/01/2027','24/02/2027','24/03/2027']
    .map(fecha => ({ title: 'Mantenimiento Interfones — Torre C', fecha, color: '#10b981' })),

  // Torre C — Sensores de humo (sin duplicado 29/08)
  ...['29/04/2026','28/05/2026','26/06/2026','30/07/2026','27/08/2026',
      '29/10/2026','26/11/2026','15/12/2026','28/01/2027','25/02/2027','25/03/2027']
    .map(fecha => ({ title: 'Mantenimiento Sensores de Humo — Torre C', fecha, color: '#ef4444' })),

  // Torre C — Cámaras de vigilancia (sin duplicado 30/08)
  ...['30/04/2026','29/05/2026','30/06/2026','31/07/2026','28/08/2026',
      '30/10/2026','27/11/2026','16/12/2026','29/01/2027','26/02/2027','26/03/2027']
    .map(fecha => ({ title: 'Revisión Cámaras de Vigilancia — Torre C', fecha, color: '#f59e0b' })),

  // Torre C — Control de acceso peatonal (sótanos)
  ...['28/07/2026','04/11/2026','23/03/2027']
    .map(fecha => ({ title: 'Mantenimiento Control Acceso Peatonal — Sótanos Torre C', fecha, color: '#6366f1' })),
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Buscando cliente Residencial Tres Cumbres...');

  // Buscar el cliente — prueba varias formas de nombre
  const client = await prisma.oTClient.findFirst({
    where: {
      OR: [
        { name: { contains: 'Tres Cumbres', mode: 'insensitive' } },
        { name: { contains: '3C', mode: 'insensitive' } },
        { storeName: { contains: 'Tres Cumbres', mode: 'insensitive' } },
      ]
    }
  });

  if (!client) {
    console.error('❌ No se encontró el cliente Residencial Tres Cumbres.');
    console.log('   Clientes disponibles:');
    const all = await prisma.oTClient.findMany({ select: { id: true, name: true, storeName: true } });
    all.forEach(c => console.log(`   · [${c.id}] ${c.name} — ${c.storeName || ''}`));
    process.exit(1);
  }

  console.log(`✅ Cliente encontrado: ${client.name} (id: ${client.id})`);
  console.log(`📅 Creando ${EVENTS_DATA.length} eventos...\n`);

  // Buscar un Employee con rol SUPERVISOR o ADMIN para asignar los eventos
  const adminUser = await prisma.employee.findFirst({
    where: {
      OR: [
        { roles: { has: 'ADMIN' } },
        { roles: { has: 'SUPERVISOR' } },
        { roles: { has: 'OPS' } },
      ]
    }
  });

  if (!adminUser) {
    console.error('❌ No se encontró ningún empleado admin/supervisor.');
    const all = await prisma.employee.findMany({ select: { id: true, name: true, roles: true }, take: 5 });
    console.log('Empleados disponibles:', all);
    process.exit(1);
  }

  console.log(`👤 Asignando eventos al empleado: ${adminUser.name} (${adminUser.id})\n`);

  let created = 0;
  let errors = 0;

  for (const ev of EVENTS_DATA) {
    try {
      await prisma.calendarEvent.create({
        data: {
          title: ev.title,
          description: '',
          type: 'MAINTENANCE',
          startDate: d(ev.fecha),
          allDay: false,
          color: ev.color,
          userId: adminUser.id,
          otClientId: client.id,
        }
      });
      created++;
      process.stdout.write(`  ✓ ${ev.fecha}  ${ev.title}\n`);
    } catch (err) {
      errors++;
      console.error(`  ✗ ${ev.fecha} ${ev.title}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Completado: ${created} eventos creados, ${errors} errores.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
