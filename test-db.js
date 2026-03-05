import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('--- Iniciando prueba de consulta de OTs ---');
    const ots = await prisma.workOrder.findMany({
      include: {
        technician: { select: { name: true } },
        supervisor: { select: { name: true } },
        creator: { select: { name: true } },
        assignedBy: { select: { name: true } },
        evidences: true,
        expenses: true
      }
    });
    console.log(`✅ Éxito: Se obtuvieron ${ots.length} registros.`);
    
    // Probar el mapeo que hace la API
    ots.map(ot => {
        try {
            return {
                id: ot.otNumber,
                assistantTechs: ot.assistantTechs ? (typeof ot.assistantTechs === 'string' ? JSON.parse(ot.assistantTechs) : ot.assistantTechs) : [],
                creatorName: ot.creator?.name || 'Sistema',
                assignedByName: ot.assignedBy?.name || (ot.technicianId ? (ot.supervisor?.name || 'Supervisor') : null)
            };
        } catch (e) {
            console.error('❌ Error mapeando OT:', ot.otNumber, e.message);
            throw e;
        }
    });
    console.log('✅ Mapeo completado sin errores.');

  } catch (error) {
    console.error('❌ ERROR DETECTADO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
