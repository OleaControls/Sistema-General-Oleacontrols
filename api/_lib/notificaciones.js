import prisma from './prisma.js';

/**
 * Crea notificaciones. Lo usan los handlers de todos los módulos.
 *
 * NUNCA lanza. Una notificación es un accesorio: si falla su escritura, la OT
 * igual se asignó y el gasto igual se aprobó. Tumbar la petición principal
 * porque no se pudo avisar sería cambiar un problema chico por uno grande.
 *
 * El aviso en tiempo real no se manda desde aquí: lo dispara el trigger de la
 * tabla. Así también avisan las notificaciones que se creen desde un script,
 * un seed o psql, sin que nadie tenga que acordarse.
 *
 *   await notificar({
 *     para: ot.technicianId,
 *     modulo: 'OTS',
 *     tipo: 'OT_ASIGNADA',
 *     titulo: `Nueva orden: ${ot.otNumber}`,
 *     cuerpo: ot.title,
 *     enlace: `/ots/${ot.id}`,
 *   });
 *
 * `para` acepta un id o un arreglo de ids.
 */
export async function notificar({ para, modulo, tipo, titulo, cuerpo, enlace }) {
  try {
    const destinatarios = [...new Set([].concat(para).filter(Boolean))];
    if (!destinatarios.length || !titulo) return 0;

    const { count } = await prisma.notificacion.createMany({
      data: destinatarios.map(destinatarioId => ({
        destinatarioId,
        modulo: modulo || 'GENERAL',
        tipo: tipo || 'AVISO',
        titulo,
        cuerpo: cuerpo || null,
        enlace: enlace || null,
      })),
      // Un destinatario que ya no existe no debe tumbar el aviso a los demás.
      skipDuplicates: true,
    });
    return count;
  } catch (error) {
    console.error('[notificar] No se pudo crear la notificación:', error.message);
    return 0;
  }
}

/**
 * Avisa a todos los que tengan alguno de esos roles.
 * Útil para "hay una requisición esperando aprobación" y similares.
 */
export async function notificarARoles(roles, datos) {
  try {
    const gente = await prisma.employee.findMany({
      where: { status: 'ACTIVE', roles: { hasSome: [].concat(roles) } },
      select: { id: true },
    });
    if (!gente.length) return 0;
    return notificar({ ...datos, para: gente.map(e => e.id) });
  } catch (error) {
    console.error('[notificarARoles]', error.message);
    return 0;
  }
}
