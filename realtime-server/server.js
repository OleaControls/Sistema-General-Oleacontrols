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

io.on('connection', (socket) => {
  const quien = socket.data.usuario?.email || 'anónimo';
  console.log(`🟢 Conectado: ${quien} (${socket.id}) — total: ${io.engine.clientsCount}`);

  // GPS de técnicos: NO pasa por Postgres a propósito. Es un dato efímero que
  // se emite cada pocos segundos; guardarlo en la base en cada latido la
  // saturaría, y perder un punto no tiene consecuencia.
  socket.on('tech:ubicacion', (datos) => {
    socket.broadcast.emit('tech:ubicacion', { ...datos, socketId: socket.id });
  });

  socket.on('disconnect', (motivo) => {
    console.log(`🔴 Desconectado: ${quien} (${motivo}) — quedan: ${io.engine.clientsCount}`);
  });
});

// ── Escucha de Postgres ─────────────────────────────────────────────────────
// Conexión dedicada (Client, no Pool): LISTEN vive en UNA sesión concreta, y
// un pool podría devolverla a otra consulta y perder la suscripción.
async function escucharPostgres(intento = 0) {
  const cliente = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
  });

  cliente.on('notification', (msg) => {
    try {
      const evento = JSON.parse(msg.payload);
      io.emit('cambio', evento);
      console.log(`📢 ${evento.tabla} ${evento.op} ${evento.id}`);
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
    reintentar(intento + 1);
  }
}

function reintentar(intento) {
  // Backoff hasta 30s: si la base está caída, no tiene sentido martillarla.
  const espera = Math.min(1000 * 2 ** intento, 30_000);
  console.log(`   Reintentando en ${espera / 1000}s...`);
  setTimeout(() => escucharPostgres(intento), espera);
}

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
    io.close(() => servidor.close(() => process.exit(0)));
  });
}
