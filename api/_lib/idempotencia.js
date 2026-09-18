import prisma from './prisma.js';

const DIAS_RETENCION = 7;

/**
 * Envuelve un handler para que un reintento no repita el efecto.
 *
 * La cola offline reenvía lo que no pudo salir. El caso que hace falta cubrir
 * no es el envío que falló —ese no llegó y hay que repetirlo— sino el que SÍ
 * llegó y se ejecutó, pero cuya respuesta se perdió por el camino: el cliente
 * cree que falló y lo reenvía, y el acta queda duplicada.
 *
 * El cliente manda una clave por intento en `Idempotency-Key`. Si esa clave ya
 * se atendió, aquí no se ejecuta nada: se devuelve tal cual lo que se respondió
 * la primera vez.
 *
 * Solo actúa sobre escrituras y solo si el cliente pide la garantía. Una
 * petición sin cabecera pasa de largo, así que esto no cambia el
 * comportamiento de nada que ya funcione.
 */
export function conIdempotencia(handler) {
  return async (req, res) => {
    const clave = req.headers?.['idempotency-key'];
    const metodo = req.method?.toUpperCase();

    if (!clave || metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') {
      return handler(req, res);
    }

    const ruta = String(req.url || '').slice(0, 300);

    // Reservar la clave. Al ser llave primaria, dos reenvíos simultáneos
    // compiten por insertarla y solo uno gana: el que pierde no ejecuta.
    try {
      await prisma.peticionIdempotente.create({ data: { clave: String(clave), ruta } });
    } catch (error) {
      if (error.code !== 'P2002') {
        // La base falló al reservar. Se ejecuta igual: bloquear el trabajo del
        // técnico por no poder anotar la clave sería peor que el riesgo que
        // esto cubre.
        console.error('[idempotencia] no se pudo reservar la clave:', error.message);
        return handler(req, res);
      }

      const previa = await prisma.peticionIdempotente.findUnique({ where: { clave: String(clave) } });
      if (previa?.estado != null) {
        // Ya se atendió: se repite la misma respuesta sin volver a ejecutar.
        let cuerpo = null;
        try { cuerpo = previa.respuesta ? JSON.parse(previa.respuesta) : null; } catch { /* se va nulo */ }
        return res.status(previa.estado).json(cuerpo);
      }
      // Sigue en vuelo: el cliente reintentará más tarde.
      return res.status(409).json({ error: 'Esta petición ya se está procesando' });
    }

    // Interceptar la respuesta para poder repetirla después.
    let codigo = 200;
    const ponerEstado = res.status.bind(res);
    const responderJson = res.json.bind(res);

    res.status = (c) => { codigo = c; ponerEstado(c); return res; };
    res.json = (cuerpo) => {
      // Un 5xx no se guarda y la clave se libera: fue un fallo del servidor y
      // el reintento debe ejecutarse de verdad. Un 4xx sí se guarda, porque es
      // determinista y repetirlo dará lo mismo.
      const guardar = codigo < 500
        ? prisma.peticionIdempotente.update({
            where: { clave: String(clave) },
            data: { estado: codigo, respuesta: JSON.stringify(cuerpo ?? null), empleadoId: req.auth?.id || null },
          })
        : prisma.peticionIdempotente.delete({ where: { clave: String(clave) } });

      guardar.catch(err => console.error('[idempotencia] no se pudo anotar:', err.message));
      return responderJson(cuerpo);
    };

    try {
      await handler(req, res);
    } catch (error) {
      // Si el handler revienta, la clave se libera para que el reintento sirva
      // de algo.
      await prisma.peticionIdempotente.delete({ where: { clave: String(clave) } }).catch(() => {});
      throw error;
    } finally {
      limpiarDeVezEnCuando();
    }
  };
}

/**
 * Borra las claves viejas. Se dispara al azar en una de cada cien peticiones:
 * no hace falta un cron para una tabla que solo crece con las escrituras
 * encoladas, y así no hay un proceso más que vigilar.
 */
let limpiando = false;
function limpiarDeVezEnCuando() {
  if (limpiando || Math.random() > 0.01) return;
  limpiando = true;
  const limite = new Date(Date.now() - DIAS_RETENCION * 24 * 60 * 60 * 1000);
  prisma.peticionIdempotente
    .deleteMany({ where: { createdAt: { lt: limite } } })
    .then(({ count }) => { if (count) console.log(`[idempotencia] ${count} clave(s) vieja(s) borradas`); })
    .catch(() => {})
    .finally(() => { limpiando = false; });
}
