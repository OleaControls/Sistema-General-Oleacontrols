import dotenv from 'dotenv';
import webpush from 'web-push';
import prisma from './prisma.js';

dotenv.config();

/**
 * Web Push: el aviso que llega al celular o a la PC aunque la app esté
 * cerrada. Lo manda `notificar()`; ningún handler tiene que llamarlo directo.
 *
 * Igual que `notificar()`, NUNCA lanza. Y sin las tres variables VAPID no hace
 * nada: la campana y el socket siguen funcionando igual sin push.
 */

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const configurado = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);

if (configurado) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('[push] Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT: no se mandarán avisos push.');
}

export const clavePublicaPush = configurado ? VAPID_PUBLIC_KEY : null;

/**
 * Manda el aviso a todos los dispositivos de esas personas.
 *
 * Se espera a que salga antes de responder porque en Vercel la función se
 * congela en cuanto responde: un push "en segundo plano" nunca llegaría. El
 * timeout acota ese costo si el servicio de push de algún navegador tarda.
 */
export async function enviarPush(empleadoIds, { titulo, cuerpo, enlace, tag }) {
  if (!configurado) return 0;
  try {
    const ids = [...new Set([].concat(empleadoIds).filter(Boolean))];
    if (!ids.length) return 0;

    const dispositivos = await prisma.suscripcionPush.findMany({
      where: { empleadoId: { in: ids } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (!dispositivos.length) return 0;

    const carga = JSON.stringify({ titulo, cuerpo, enlace, tag });
    const caducadas = [];
    let enviados = 0;

    await Promise.all(dispositivos.map(async d => {
      try {
        await webpush.sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          carga,
          // Un aviso de "te asignaron una OT" sigue sirviendo horas después si
          // el celular estaba apagado; pasado un día ya es ruido.
          { TTL: 60 * 60 * 24, urgency: 'high', timeout: 5000 },
        );
        enviados++;
      } catch (error) {
        // 404/410: el usuario quitó el permiso, desinstaló o el navegador
        // renovó la suscripción. Esa dirección ya no va a volver a servir.
        if (error.statusCode === 404 || error.statusCode === 410) caducadas.push(d.id);
        else console.error('[push] Falló un envío:', error.statusCode || '', error.body || error.message);
      }
    }));

    if (caducadas.length) {
      await prisma.suscripcionPush.deleteMany({ where: { id: { in: caducadas } } });
    }
    return enviados;
  } catch (error) {
    console.error('[push] No se pudo enviar:', error.message);
    return 0;
  }
}
