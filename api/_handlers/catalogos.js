import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

/**
 * Los catálogos que una vista necesita para arrancar, en una sola petición.
 *
 * POR QUÉ EXISTE
 * Abrir la vista de OTs disparaba cuatro llamadas: clientes de OT, plantillas,
 * empleados y el listado de OTs. Cada una es una invocación de Vercel y al
 * menos una operación de Prisma, y tres de las cuatro devuelven catálogos que
 * no cambian en toda la jornada. Aquí se sirven juntas: tres peticiones pasan
 * a ser una, y las tres consultas viajan en un solo viaje a la base.
 *
 * El listado de OTs NO va aquí a propósito: lleva paginación y filtros, cambia
 * con cada interacción y tiene que poder recargarse solo.
 *
 * QUÉ DEVUELVE DE EMPLEADOS
 * Solo los técnicos, y solo lo que hace falta para pintar un desplegable de
 * asignación. Es un recorte más estrecho que el de `/api/employees`, que ya
 * oculta los datos personales a quien no es RH: por aquí no sale nada que no
 * saliera antes.
 */
export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const [otClients, templates, tecnicos] = await Promise.all([
      prisma.oTClient.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.oTTemplate.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
      /* Sin filtro de `status`: la vista venía mostrando también a los técnicos
         dados de baja en los desplegables, y cambiarlo aquí los haría
         desaparecer de golpe. Se manda `status` para que el cliente decida. */
      prisma.employee.findMany({
        where: { roles: { hasSome: ['TECHNICIAN', 'Tech'] } },
        select: { id: true, name: true, roles: true, avatar: true, status: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return res.status(200).json({ otClients, templates, tecnicos });
  } catch (error) {
    console.error('[catalogos GET]', error);
    return res.status(500).json({ error: error.message });
  }
}
