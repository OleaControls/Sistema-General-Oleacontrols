import prisma from './prisma.js';
import { PO_SURTEN, pendienteRequisicion } from './compras.js';

/**
 * Cuánto se ha comprado ya de cada renglón de requisición.
 *
 * No hay columna "cantidad surtida" en la base a propósito: se suma aquí desde
 * las partidas de compra. Un contador guardado habría que actualizarlo en cada
 * aprobación, cancelación, reapertura y edición de partidas, y el día que se
 * olvide uno de esos caminos el número queda mintiendo sin que nadie se entere.
 * Sumando al leer no hay nada que se pueda desfasar.
 *
 * Solo cuentan las órdenes de APROBADA en adelante (ver PO_SURTEN): un borrador
 * todavía no compromete nada.
 *
 * @returns {Promise<Map<string, number>>} id de requisición → cantidad surtida
 */
export async function surtidoDe(requestIds) {
  const ids = [...new Set((requestIds || []).filter(Boolean))];
  if (!ids.length) return new Map();

  const filas = await prisma.purchaseOrderItem.groupBy({
    by: ['resourceRequestId'],
    where: {
      resourceRequestId: { in: ids },
      purchaseOrder: { status: { in: PO_SURTEN } },
    },
    _sum: { quantity: true },
  });

  return new Map(filas.map(f => [f.resourceRequestId, f._sum.quantity || 0]));
}

/**
 * Agrega `surtido` y `pendiente` a cada renglón de requisición.
 *
 * Una sola consulta agrupada para toda la lista, no una por renglón: un
 * proyecto con 40 solicitudes son 40 consultas si se hace mal.
 */
export async function conSurtido(requests) {
  if (!Array.isArray(requests) || !requests.length) return requests || [];

  const surtidos = await surtidoDe(requests.map(r => r.id));

  return requests.map(r => {
    const surtido = surtidos.get(r.id) || 0;
    return {
      ...r,
      surtido,
      pendiente: pendienteRequisicion(r.quantity, surtido),
    };
  });
}
