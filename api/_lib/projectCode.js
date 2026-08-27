/* Folio de proyecto PROY-AAAA-NNN.
   Vive aparte porque lo generan dos handlers: el alta manual desde el módulo de
   proyectos y el alta automática de una OT de tienda (api/_handlers/ots.js). */

/**
 * Siguiente folio libre del año en curso.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} [salto] desplazamiento para reintentar tras una colisión
 */
export async function nextProjectCode(prisma, salto = 0) {
  const year = new Date().getFullYear();
  const prefix = `PROY-${year}-`;
  const last = await prisma.project.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  const n = (last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1) + salto;
  return `${prefix}${String(n).padStart(3, '0')}`;
}

/**
 * Crea un proyecto reintentando si otra petición se quedó con el folio.
 * `datos` no debe traer `code`: lo pone esta función.
 */
export async function createProjectWithCode(prisma, datos) {
  for (let intento = 0; intento < 20; intento++) {
    try {
      return await prisma.project.create({
        data: { ...datos, code: await nextProjectCode(prisma, intento) },
      });
    } catch (err) {
      if (err.code !== 'P2002') throw err; // P2002 = folio duplicado
    }
  }
  // Respaldo que nunca colisiona, por si el reintento se agota.
  return prisma.project.create({
    data: { ...datos, code: `PROY-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}` },
  });
}

export default nextProjectCode;
