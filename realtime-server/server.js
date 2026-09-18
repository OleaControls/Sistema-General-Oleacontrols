// ═══════════════════════════════════════════════════════════════════════════
// OLEA CONTROLS REALTIME
//
// Avisa a las vistas abiertas que algo cambió en la base de datos, para que
// refresquen sin que el usuario tenga que apretar F5.
//
// CÓMO SE ENTERA DE LOS CAMBIOS
// No lo llama nadie: escucha. Mantiene una conexión a Postgres con LISTEN y la
// base le avisa (NOTIFY, disparado por los triggers de
// prisma/migrations-manual/2026-09-18-realtime-notify.sql).
//
// Eso es lo que permite que esta PC viva detrás del NAT de la oficina: la
// conexión SALE hacia Postgres. No hay que abrir puertos en el router ni
// exponer la máquina a internet, y da igual que la API corra en Vercel.
//
// QUÉ MANDA — Y QUÉ NO
// Manda avisos, nunca datos: { tabla, op, id }. El cliente recibe el aviso y
// vuelve a consultar por la API normal. Así, si este servidor se cae (se fue la
// luz, se reinició Windows), la app NO pierde información: sigue funcionando
// con su polling de respaldo, solo que más lenta.
//
//   npm run realtime
// ═══════════════════════════════════════════════════════════════════════════
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

// El .env se busca en dos lugares porque este servidor corre en dos escenarios:
// en la PC dedicada de la oficina lleva su propio .env al lado (solo con lo que
// necesita: base y JWT, sin las llaves de R2), y en la PC de desarrollo usa el
// de la raiz del proyecto. dotenv no pisa lo ya cargado, asi que gana el local.
const aqui = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(aqui, '.env') });
dotenv.config({ path: path.join(aqui, '..', '.env') });

// Sin DATABASE_URL, pg no falla: se conecta a localhost:5432 con el usuario de
// Windows y devuelve un ECONNREFUSED que parece un problema de red. El error
// real es que no se leyo el .env, asi que mas vale decirlo con todas sus letras.
if (!process.env.DATABASE_URL) {
  console.error('');
  console.error('X  No se encontro DATABASE_URL.');
  console.error('   El .env no se leyo. Revisa que exista uno de estos archivos:');
  console.error(`     ${path.join(aqui, '.env')}`);
  console.error(`     ${path.join(aqui, '..', '.env')}`);
  console.error('   Ojo: el Explorador de Windows esconde las extensiones y suele');
  console.error('   guardarlo como ".env.txt". Comprueba con:  type .env');
  console.error('');
  console.error('   Diagnostico completo:  node diagnostico.js');
  console.error('');
  process.exit(1);
}

const PUERTO = parseInt(process.env.REALTIME_PORT || '3002', 10);
const CANAL = 'olea_eventos';
const JWT_SECRET = process.env.JWT_SECRET;

// El 3001 lo ocupa la API Express (server.js). Si algún día alguien levanta los
// dos en esta misma PC, con puertos distintos ambos arrancan.
if (PUERTO === 3001) {
  console.error('❌ El puerto 3001 es de la API Express. Usa otro (3002).');
  process.exit(1);
}

// Orígenes que pueden conectarse. La app en producción vive en Vercel; en
// desarrollo, en la LAN. Se amplía con REALTIME_ORIGINS separado por comas.
const ORIGENES = [
  ...(process.env.REALTIME_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  /\.vercel\.app$/,
];

const servidor = http.createServer((req, res) => {
  // Endpoint de salud: sirve para comprobar desde otra PC que está vivo,
  // sin tener que abrir la app.  http://192.168.1.175:3002/salud
  if (req.url === '/salud') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      escuchandoPostgres: escuchandoPostgres,
      clientes: io?.engine?.clientsCount ?? 0,
      tecnicosEnMapa: ubicaciones.size,
      usuariosConectados: conectados.size,
      desde: arrancadoEn,
    }));
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(servidor, {
  cors: { origin: ORIGENES, credentials: true },
  // Si un cliente no responde en 20s se le corta: un técnico que perdió señal
  // no debe quedar contado como conectado.
  pingTimeout: 20_000,
});

let escuchandoPostgres = false;
const arrancadoEn = new Date().toISOString();

// ── Autenticación ───────────────────────────────────────────────────────────
// El aviso no lleva datos sensibles (solo tabla + id), pero sin esto cualquiera
// en la red de la oficina podría enterarse del ritmo de operación.
io.use((socket, next) => {
  if (!JWT_SECRET) return next(); // sin secreto configurado, no se exige token
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Falta token'));
  try {
    socket.data.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Token inválido'));
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// UBICACIONES DE TECNICOS
//
// Viven en memoria, no en Postgres. Un tecnico reporta su posicion cada pocos
// minutos; con 100 tecnicos eso serian ~20 000 escrituras diarias a la base
// para un dato que a los 5 minutos ya no le sirve a nadie. Aqui se guarda la
// ultima de cada uno y se persiste cada 5 minutos, solo las que cambiaron.
//
// Tener la ultima posicion en memoria resuelve ademas un problema que el
// sondeo tampoco resolvia bien: el supervisor que abre el mapa ve a los 100
// tecnicos de inmediato, en vez de un mapa vacio que se va llenando conforme
// cada uno vuelve a reportar.
// ═══════════════════════════════════════════════════════════════════════════
const SALA_SUPERVISORES = 'supervisores';
const ROLES_SUPERVISION = ['ADMIN', 'SUPERVISOR', 'PROJECT_MANAGER'];
const MS_PERSISTIR = 5 * 60_000;
const MS_CADUCIDAD = 12 * 60 * 60_000; // 12 h sin reportar: fuera del mapa

/** id del tecnico -> { id, nombre, lat, lng, ts, sinGuardar } */
const ubicaciones = new Map();

const esSupervisor = (u) => (u?.roles || []).some(r => ROLES_SUPERVISION.includes(r));

function guardarUbicacion(usuario, datos) {
  const lat = Number(datos?.lat);
  const lng = Number(datos?.lng);
  // Un NaN o un cero pegarian al tecnico en la isla nula, frente a Africa.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  // La identidad sale del JWT, nunca del mensaje: si viniera del cliente,
  // cualquier tecnico podria mover el punto de otro en el mapa del supervisor.
  const punto = {
    id: usuario.id,
    nombre: usuario.email,
    lat, lng,
    ts: Date.now(),
    sinGuardar: true,
  };
  ubicaciones.set(usuario.id, punto);
  return punto;
}

/** Quita del mapa a quien lleva medio dia sin reportar. */
function limpiarCaducadas() {
  const limite = Date.now() - MS_CADUCIDAD;
  for (const [id, p] of ubicaciones) {
    if (p.ts < limite) ubicaciones.delete(id);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESENCIA
//
// Quien esta conectado ahora mismo. Vive solo en memoria: no cuesta ni una
// consulta a Postgres, y es un dato que no tiene sentido conservar —si el
// servidor se reinicia, todos se reconectan y la lista se rehace sola.
// ═══════════════════════════════════════════════════════════════════════════
const MS_GRACIA = 5_000;
const MS_ANUNCIO = 1_000;

/** usuarioId -> { id, email, roles, sockets:Set, desde } */
const conectados = new Map();
/** Salidas en periodo de gracia: usuarioId -> timeout */
const salidas = new Map();

let anuncioPendiente = null;
/**
 * Avisa de la lista, coalescida.
 *
 * A las 8 de la manana entran 50 personas en pocos segundos. Sin esto se
 * mandarian 50 listas casi identicas; asi se manda una.
 */
function anunciarPresencia() {
  if (anuncioPendiente) return;
  anuncioPendiente = setTimeout(() => {
    anuncioPendiente = null;
    io.to(SALA_SUPERVISORES).emit('presencia', [...conectados.values()].map(u => ({
      id: u.id, email: u.email, roles: u.roles, desde: u.desde, aparatos: u.sockets.size,
    })));
  }, MS_ANUNCIO);
}

function entraUsuario(usuario, socketId) {
  if (!usuario?.id) return;

  // Volvio antes de que expirara la gracia: nunca estuvo "fuera".
  const gracia = salidas.get(usuario.id);
  if (gracia) { clearTimeout(gracia); salidas.delete(usuario.id); }

  const ya = conectados.get(usuario.id);
  if (ya) {
    // Misma persona con el movil y la PC abiertos: dos sockets, un usuario.
    ya.sockets.add(socketId);
  } else {
    conectados.set(usuario.id, {
      id: usuario.id, email: usuario.email, roles: usuario.roles || [],
      sockets: new Set([socketId]), desde: Date.now(),
    });
  }
  anunciarPresencia();
}

function saleUsuario(usuario, socketId) {
  const u = conectados.get(usuario?.id);
  if (!u) return;
  u.sockets.delete(socketId);
  if (u.sockets.size) return anunciarPresencia(); // le quedan otros aparatos

  // Periodo de gracia: recargar la pagina desconecta y reconecta en un segundo.
  // Sin esto, cada F5 de cualquiera haria parpadear la lista de todos.
  salidas.set(u.id, setTimeout(() => {
    salidas.delete(u.id);
    conectados.delete(u.id);
    anunciarPresencia();
  }, MS_GRACIA));
}

io.on('connection', (socket) => {
  const usuario = socket.data.usuario;
  const quien = usuario?.email || 'anónimo';
  console.log(`🟢 Conectado: ${quien} (${socket.id}) — total: ${io.engine.clientsCount}`);

  // Solo quien supervisa entra a la sala del mapa. Antes esto era un
  // broadcast a todos: con 100 tecnicos, cada reporte se copiaba 99 veces
  // hacia aparatos que no tienen mapa que pintar.
  // Sala propia de cada persona: permite entregarle algo solo a ella, en todos
  // los aparatos donde tenga la sesion abierta.
  if (usuario?.id) socket.join(`usuario:${usuario.id}`);

  entraUsuario(usuario, socket.id);

  if (esSupervisor(usuario)) {
    socket.join(SALA_SUPERVISORES);
    limpiarCaducadas();
    // Instantanea al entrar: el mapa se pinta completo desde el primer segundo.
    socket.emit('tech:instantanea', [...ubicaciones.values()]);
    anunciarPresencia();
  }

  socket.on('tech:ubicacion', (datos) => {
    if (!usuario?.id) return;
    const punto = guardarUbicacion(usuario, datos);
    if (punto) io.to(SALA_SUPERVISORES).emit('tech:ubicacion', punto);
  });

  socket.on('disconnect', (motivo) => {
    saleUsuario(usuario, socket.id);
    console.log(`🔴 Desconectado: ${quien} (${motivo}) — quedan: ${io.engine.clientsCount}`);
  });
});

// ── Escucha de Postgres ─────────────────────────────────────────────────────
// Conexión dedicada (Client, no Pool): LISTEN vive en UNA sesión concreta, y
// un pool podría devolverla a otra consulta y perder la suscripción.
async function escucharPostgres(intento = 0) {
  // El SSL lo gobierna el sslmode de la DATABASE_URL. Antes se forzaba aqui
  // rejectUnauthorized:false, que cifra pero NO comprueba la identidad del
  // servidor: quien pudiera interceptar el trafico entre esta PC y la base
  // podria presentar su propio certificado. La verificacion completa funciona
  // contra db.prisma.io, asi que no hay motivo para renunciar a ella.
  const cliente = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    keepAlive: true,
  });

  cliente.on('notification', (msg) => {
    try {
      const evento = JSON.parse(msg.payload);

      // Una notificacion tiene dueño: se entrega solo a sus sesiones. Si se
      // difundiera a todos, cada pantalla de la empresa se enteraria de lo que
      // le notifican a cada quien, y ademas se copiaria el mensaje 100 veces
      // para que 99 lo descartaran.
      if (evento.tabla === 'Notificacion' && evento.padre) {
        io.to(`usuario:${evento.padre}`).emit('cambio', evento);
        console.log(`🔔 Notificacion ${evento.op} -> ${evento.padre}`);
      } else {
        io.emit('cambio', evento);
        console.log(`📢 ${evento.tabla} ${evento.op} ${evento.id}`);
      }
    } catch (err) {
      console.error('Aviso ilegible de Postgres:', err.message);
    }
  });

  // El internet de una oficina se cae solo. Sin este reenganche el servidor
  // seguiría "arriba" pero sordo: los clientes conectados y nadie avisándoles.
  cliente.on('error', (err) => {
    escuchandoPostgres = false;
    console.error('⚠️ Se cayó la conexión con Postgres:', err.message);
    cliente.end().catch(() => {});
    reintentar(intento + 1);
  });

  try {
    await cliente.connect();
    await cliente.query(`LISTEN ${CANAL}`);
    escuchandoPostgres = true;
    console.log(`👂 Escuchando cambios de Postgres en el canal "${CANAL}"`);
  } catch (err) {
    escuchandoPostgres = false;
    console.error(`⚠️ No se pudo conectar a Postgres: ${err.message}`);
    console.error('   Para saber en que paso falla:  node diagnostico.js');
    reintentar(intento + 1);
  }
}

function reintentar(intento) {
  // Backoff hasta 30s: si la base está caída, no tiene sentido martillarla.
  const espera = Math.min(1000 * 2 ** intento, 30_000);
  console.log(`   Reintentando en ${espera / 1000}s...`);
  setTimeout(() => escucharPostgres(intento), espera);
}

// -- Persistencia periodica -------------------------------------------------
// Cada 5 minutos baja a Postgres solo lo que cambio. Sirve para dos cosas: que
// el historico siga existiendo, y que si este servidor se reinicia el mapa no
// quede en blanco (la API sigue sirviendo la ultima posicion conocida).
//
// Un pool chico basta: escribe un puñado de filas cada cinco minutos.
const escrituras = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  idleTimeoutMillis: 30_000,
});

async function persistirUbicaciones() {
  const pendientes = [...ubicaciones.values()].filter(p => p.sinGuardar);
  if (!pendientes.length) return;

  try {
    // Una sola sentencia para todas: 100 tecnicos son 1 consulta, no 100.
    await escrituras.query(
      `UPDATE "Employee" AS e
          SET "techLat" = v.lat, "techLng" = v.lng, "techLastSeen" = v.ts
         FROM (SELECT * FROM unnest($1::text[], $2::float8[], $3::float8[], $4::timestamptz[])
                      AS t(id, lat, lng, ts)) AS v
        WHERE e.id = v.id`,
      [
        pendientes.map(p => p.id),
        pendientes.map(p => p.lat),
        pendientes.map(p => p.lng),
        pendientes.map(p => new Date(p.ts)),
      ]
    );
    pendientes.forEach(p => { p.sinGuardar = false; });
    console.log(`> ${pendientes.length} ubicacion(es) guardadas`);
  } catch (err) {
    // No se marcan como guardadas: se reintentan en la siguiente vuelta.
    console.error('!! No se pudieron guardar las ubicaciones:', err.message);
  }
}

setInterval(() => { limpiarCaducadas(); persistirUbicaciones(); }, MS_PERSISTIR);

function ipLocal() {
  for (const redes of Object.values(os.networkInterfaces())) {
    for (const red of redes || []) {
      if (red.family === 'IPv4' && !red.internal) return red.address;
    }
  }
  return 'localhost';
}

servidor.listen(PUERTO, '0.0.0.0', () => {
  console.log('═══════════════════════════════════');
  console.log('   OLEA CONTROLS REALTIME');
  console.log('   Servidor iniciado correctamente');
  console.log(`   IP: ${ipLocal()}`);
  console.log(`   Puerto: ${PUERTO}`);
  console.log('═══════════════════════════════════');
  escucharPostgres();
});

// Apagado ordenado: si el no-break avisa y Windows manda cerrar, se les dice a
// los clientes que se desconecten para que pasen a polling de inmediato en vez
// de esperar el timeout.
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    console.log('\nCerrando servidor realtime...');
    // Si no se guarda aqui, un apagado (o el aviso del no-break) se lleva
    // hasta 5 minutos de posiciones que estaban solo en memoria.
    persistirUbicaciones()
      .catch(() => {})
      .finally(() => io.close(() => servidor.close(() => process.exit(0))));
  });
}
