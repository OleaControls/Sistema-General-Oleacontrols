/**
 * Conexión con el servidor realtime de la oficina.
 *
 * REGLA DE ORO: esto es un acelerador, nunca una dependencia. El servidor vive
 * en una PC de la oficina y se va a caer —apagones, reinicios de Windows, que
 * alguien la desconecte—. Ninguna vista debe romperse por eso: el socket avisa
 * "algo cambió, vuelve a consultar", y si no hay socket, la vista cae a su
 * polling de respaldo. Los datos SIEMPRE se leen por la API.
 */
import { io } from "socket.io-client";

const URL_REALTIME = import.meta.env.VITE_REALTIME_URL || "http://192.168.1.175:3002";

// Interruptor de emergencia: si el servidor da problemas en producción, se pone
// VITE_REALTIME_ENABLED=false y se redespliega. La app queda 100% en polling
// sin tener que tocar una sola vista.
const ACTIVO = import.meta.env.VITE_REALTIME_ENABLED !== 'false';

// El navegador bloquea WebSocket en claro (ws://) desde una página HTTPS
// —mixed content—. Con el servidor en la LAN por http, en producción no
// conectaría nunca: más vale no intentarlo y avisar en consola, que dejar a
// Socket.IO reintentando en vano contra una IP privada.
const MIXED_CONTENT =
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  URL_REALTIME.startsWith('http://');

/** Stub que imita la API de socket.io para que las vistas no tengan que preguntar si existe. */
const stub = {
  connected: false,
  on() {}, off() {}, emit() {}, connect() {}, disconnect() {},
};

let instancia = stub;

if (!ACTIVO) {
  console.info('ℹ️ Realtime desactivado por VITE_REALTIME_ENABLED=false');
} else if (MIXED_CONTENT) {
  console.warn(
    `⚠️ Realtime desactivado: la app corre en HTTPS y ${URL_REALTIME} es http. ` +
    `Hace falta exponer el servidor con HTTPS (Cloudflare Tunnel) para usarlo en producción.`
  );
} else {
  instancia = io(URL_REALTIME, {
    // WebSocket primero y polling de reserva. Con el servidor en la LAN el
    // WebSocket siempre entraba, pero a traves del tunel y desde la red movil
    // de un tecnico hay redes que bloquean el upgrade: sin reserva, el socket
    // no conectaria nunca y no sabriamos por que.
    transports: ["websocket", "polling"],
    // NO conectar al cargar el bundle. En la pantalla de login todavia no hay
    // token, el servidor rechaza el handshake, y Socket.IO trata el rechazo de
    // un middleware como error FATAL: pone socket.active = false y no vuelve a
    // intentarlo jamas. El usuario entraba, el token ya estaba guardado, y el
    // socket seguia muerto hasta que alguien recargaba la pagina.
    // La conexion la abre AuthContext cuando hay sesion (conectarRealtime).
    autoConnect: false,
    // El servidor exige el mismo JWT que la API.
    auth: (cb) => cb({ token: localStorage.getItem('olea_token') }),
    // Reintento indefinido con backoff: cuando vuelva la luz en la oficina, los
    // navegadores que quedaron abiertos se reenganchan solos.
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30_000,
    // Sin esto, Socket.IO se rinde a los 5 intentos (~10s) y ya no vuelve:
    // un apagón de 20 minutos dejaría a todos sin realtime hasta que recarguen.
    reconnectionAttempts: Infinity,
  });

  instancia.on("connect", () => {
    console.log("🟢 Conectado al servidor real-time — Socket ID:", instancia.id);
  });

  instancia.on("disconnect", (motivo) => {
    console.log("🔴 Desconectado del servidor real-time:", motivo);
  });

  // Sin este listener un servidor caído falla en silencio: Socket.IO reintenta
  // solo y la consola no dice nada. Fue exactamente el síntoma que costó
  // diagnosticar la primera vez.
  instancia.on("connect_error", (error) => {
    console.warn(`⚠️ Realtime no disponible (${URL_REALTIME}): ${error.message}`);
  });
}

export const socket = instancia;

/** true si ahora mismo hay socket vivo. Las vistas lo usan para decidir si necesitan polling. */
export const hayRealtime = () => socket.connected;

/**
 * Abre la conexión. La llama AuthContext cuando hay sesión —al entrar y al
 * restaurar una sesión guardada—, nunca las vistas.
 *
 * Sin token no intenta nada: el servidor rechazaría el handshake y ese rechazo
 * es definitivo (ver `autoConnect` arriba), así que un intento a destiempo
 * apaga el realtime hasta la siguiente recarga.
 */
export function conectarRealtime() {
  if (!ACTIVO || MIXED_CONTENT) return;
  if (!localStorage.getItem('olea_token')) return;
  // `active` cubre el intervalo entre connect() y el primer connect: sin esto,
  // dos renders seguidos abrirían dos conexiones.
  if (socket.connected || socket.active) return;
  socket.connect();
}

/** Cierra la conexión al salir, para no quedar contado como conectado. */
export function desconectarRealtime() {
  socket.disconnect();
}

/**
 * Escucha los cambios de una tabla y ejecuta `alCambiar`.
 * Devuelve la función de limpieza, para usarla tal cual en un useEffect.
 *
 *   useEffect(() => suscribirCambios('WorkOrder', recargarOTs), []);
 *
 * `opciones.id` y `opciones.padre` filtran en el navegador, antes de recargar.
 * Es la diferencia entre recargar cuando cambia TU orden y recargar cada vez
 * que alguien toca cualquiera de las de la empresa:
 *
 *   suscribirCambios('Evidence', recargar, { padre: otId })
 */
export function suscribirCambios(tabla, alCambiar, opciones = {}) {
  const manejar = (evento) => {
    if (evento?.tabla !== tabla) return;
    if (opciones.id !== undefined && evento.id !== opciones.id) return;
    if (opciones.padre !== undefined && evento.padre !== opciones.padre) return;
    alCambiar(evento);
  };
  socket.on('cambio', manejar);
  return () => socket.off('cambio', manejar);
}

/**
 * Reporta la posición del técnico. Devuelve true si salió por el socket.
 *
 * El false importa: quien llama debe entonces mandarla por la API. El servidor
 * de la oficina se va a caer —apagones, reinicios— y el rastreo no puede
 * depender de él.
 */
export function enviarUbicacion(lat, lng) {
  if (!socket.connected) return false;
  socket.emit('tech:ubicacion', { lat, lng });
  return true;
}

/**
 * Escucha las posiciones de los técnicos. Solo reciben quienes supervisan; el
 * servidor lo decide por el rol del JWT, no por lo que pida el cliente.
 *
 * `alRecibir` llega con el mapa completo { id: {id, nombre, lat, lng, ts} }:
 *   - al conectar, con la instantánea de todos (el mapa se pinta de una vez)
 *   - después, con cada técnico que se mueve
 *
 * Devuelve la función de limpieza, lista para usar en un useEffect.
 */
export function suscribirUbicaciones(alRecibir) {
  const indexar = (lista) =>
    Object.fromEntries(lista.map(p => [p.id, { ...p, lastUpdate: new Date(p.ts).toISOString() }]));

  const instantanea = (lista) => alRecibir(() => indexar(lista));
  const punto = (p) => alRecibir(previas => ({ ...previas, ...indexar([p]) }));

  socket.on('tech:instantanea', instantanea);
  socket.on('tech:ubicacion', punto);
  return () => {
    socket.off('tech:instantanea', instantanea);
    socket.off('tech:ubicacion', punto);
  };
}

/**
 * Escucha quién está conectado. Solo lo reciben los roles de supervisión; lo
 * decide el servidor por el JWT, no el cliente.
 *
 * `alRecibir` llega con un arreglo de { id, email, roles, desde, aparatos }.
 * `aparatos` es cuántas sesiones tiene abiertas esa persona: el móvil y la PC
 * cuentan como una sola persona, no como dos.
 */
export function suscribirPresencia(alRecibir) {
  socket.on('presencia', alRecibir);
  return () => socket.off('presencia', alRecibir);
}
