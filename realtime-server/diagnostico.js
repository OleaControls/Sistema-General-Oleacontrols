// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTICO DE CONEXION
//
// "No se pudo conectar a Postgres" puede ser cinco cosas distintas y el mensaje
// de pg no las distingue. Esto prueba la cadena paso por paso y dice cual de
// los eslabones se rompio.
//
//   node diagnostico.js
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import net from 'node:net';
import dns from 'node:dns/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const ok = (m) => console.log('  [OK]  ' + m);
const mal = (m) => console.log('  [MAL] ' + m);
const pista = (m) => console.log('         -> ' + m);

console.log('\n=== DIAGNOSTICO DEL SERVIDOR REALTIME ===\n');

// ── 1. El archivo .env ──────────────────────────────────────────────────────
console.log('1. Archivo .env');
const candidatos = [path.join(aqui, '.env'), path.join(aqui, '..', '.env')];
let encontrado = null;
for (const c of candidatos) {
  if (fs.existsSync(c)) { encontrado = c; ok('encontrado: ' + c); break; }
}
if (!encontrado) {
  mal('no existe en ninguna de estas rutas:');
  candidatos.forEach(c => pista(c));
  // El sospechoso numero uno: Windows esconde las extensiones al copiar.
  const sueltos = fs.readdirSync(aqui).filter(f => f.toLowerCase().startsWith('.env'));
  if (sueltos.length) {
    pista('PERO hay estos archivos parecidos: ' + sueltos.join(', '));
    pista('Si ves ".env.txt", renombralo:   ren .env.txt .env');
  }
  process.exit(1);
}
dotenv.config({ path: encontrado });

// ── 2. Las variables ────────────────────────────────────────────────────────
console.log('\n2. Variables');
const url = process.env.DATABASE_URL;
if (!url) {
  mal('DATABASE_URL vacia o ausente dentro del .env');
  pista('Abrelo y comprueba que la linea empiece exactamente con DATABASE_URL=');
  process.exit(1);
}
ok(`DATABASE_URL presente (${url.length} caracteres)`);

if (!process.env.JWT_SECRET) {
  mal('JWT_SECRET ausente: el servidor arranca pero rechazara todos los sockets');
} else {
  ok(`JWT_SECRET presente (${process.env.JWT_SECRET.length} caracteres)`);
}

if (url.startsWith('prisma://') || url.startsWith('prisma+postgres://')) {
  mal('Es una URL de Accelerate. LISTEN no funciona sobre su pooler (es HTTP).');
  pista('Necesitas la URL directa postgres:// de tu proveedor.');
  process.exit(1);
}

let u;
try {
  u = new URL(url);
  ok(`servidor: ${u.hostname}   puerto: ${u.port || 5432}   base: ${u.pathname.slice(1)}`);
} catch {
  mal('La DATABASE_URL no tiene forma de URL valida');
  pista('Suele ser que se copio cortada o con comillas de mas.');
  process.exit(1);
}

// ── 3. DNS ──────────────────────────────────────────────────────────────────
console.log('\n3. Resolucion DNS');
try {
  const { address } = await dns.lookup(u.hostname);
  ok(`${u.hostname} resuelve a ${address}`);
} catch (e) {
  mal(`no se pudo resolver ${u.hostname} (${e.code})`);
  pista('Esta PC no tiene internet, o el nombre del servidor esta mal escrito.');
  process.exit(1);
}

// ── 4. TCP ──────────────────────────────────────────────────────────────────
console.log('\n4. Conexion TCP');
const puerto = parseInt(u.port || '5432', 10);
const tcp = await new Promise((res) => {
  const s = new net.Socket();
  s.setTimeout(8000);
  s.on('connect', () => { s.destroy(); res('ok'); });
  s.on('timeout', () => { s.destroy(); res('timeout'); });
  s.on('error', (e) => { s.destroy(); res(e.code); });
  s.connect(puerto, u.hostname);
});
if (tcp === 'ok') {
  ok(`puerto ${puerto} alcanzable`);
} else {
  mal(`no se pudo abrir TCP al puerto ${puerto} (${tcp})`);
  pista('El firewall de la oficina bloquea la salida al puerto ' + puerto + ',');
  pista('o tu proveedor solo permite IPs autorizadas y falta la de esta oficina.');
  pista('Comprueba tu IP publica en https://ifconfig.me y agregala en el panel.');
  process.exit(1);
}

// ── 5. Postgres + LISTEN ────────────────────────────────────────────────────
console.log('\n5. Postgres');
const cli = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await cli.connect();
  ok('autenticacion correcta');
  await cli.query('LISTEN olea_eventos');
  ok('LISTEN aceptado');

  // ¿Estan puestos los triggers? Sin ellos el servidor escucha y nunca recibe.
  const { rows } = await cli.query(
    `SELECT tgrelid::regclass::text AS tabla FROM pg_trigger WHERE tgname = 'trg_olea_realtime'`
  );
  if (rows.length) {
    ok(`triggers instalados en: ${rows.map(r => r.tabla).join(', ')}`);
  } else {
    mal('NO hay triggers: el servidor va a escuchar y no recibira ningun aviso');
    pista('Corre, desde la PC de desarrollo:');
    pista('node prisma/migrations-manual/aplicar.mjs 2026-09-18-realtime-notify.sql');
  }
  console.log('\n=== TODO LISTO: ya puedes correr  npm start ===\n');
} catch (e) {
  mal(`Postgres rechazo la conexion: ${e.message}`);
  if (/password|autenti|authent/i.test(e.message)) {
    pista('Usuario o contrasena incorrectos: la URL se copio incompleta o cortada.');
  } else if (/does not exist/i.test(e.message)) {
    pista('El nombre de la base no existe en esa URL.');
  } else if (/SSL|self signed/i.test(e.message)) {
    pista('Problema de certificado SSL con el proveedor.');
  }
  process.exit(1);
} finally {
  await cli.end().catch(() => {});
}
