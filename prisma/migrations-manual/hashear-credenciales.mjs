// ═══════════════════════════════════════════════════════════════════════════
// LE PONE CANDADO (bcrypt) A LAS CONTRASEÑAS GUARDADAS EN CLARO
//
// El login aceptaba dos caminos: comparar contra el hash y, si eso fallaba,
// comparar la contraseña tal cual contra lo guardado. Ese segundo camino era la
// puerta abierta, pero también era el único que funcionaba: TODAS las
// credenciales estaban en texto plano.
//
// Este script cierra la brecha sin sacar a nadie: lee cada contraseña en claro,
// la hashea y la guarda. Las personas siguen entrando con la MISMA contraseña
// de siempre; lo único que cambia es cómo está guardada.
//
//   node prisma/migrations-manual/hashear-credenciales.mjs --ensayo
//   node prisma/migrations-manual/hashear-credenciales.mjs
//
// Se corre ANTES de desplegar el login nuevo, y es compatible con el viejo: el
// login anterior ya intentaba bcrypt primero, así que en cuanto la contraseña
// queda hasheada sigue funcionando con las dos versiones del código. Por eso no
// hay ventana en la que alguien se quede fuera.
//
// Es idempotente: lo que ya empieza con "$2" se deja como está.
// Nunca imprime una contraseña.
// ═══════════════════════════════════════════════════════════════════════════
import prisma from '../../api/_lib/prisma.js';
import { hashPassword, comparePassword } from '../../api/_lib/auth.js';

const ensayo = process.argv.includes('--ensayo');

// bcrypt marca sus hashes con $2a$/$2b$/$2y$. Lo que no empiece así está en claro.
const yaTieneCandado = (v) => String(v || '').startsWith('$2');

const filas = await prisma.credentials.findMany({
  select: { id: true, email: true, password: true },
});

const pendientes = filas.filter(c => !yaTieneCandado(c.password));

console.log(`\ncredenciales: ${filas.length}`);
console.log(`ya con candado: ${filas.length - pendientes.length}`);
console.log(`por hashear: ${pendientes.length}${ensayo ? '  (ensayo: no se escribe nada)' : ''}\n`);

if (pendientes.length === 0) {
  console.log('No hay nada que hacer.\n');
  await prisma.$disconnect();
  process.exit(0);
}

let hechas = 0;
let fallidas = 0;

for (const c of pendientes) {
  const plana = String(c.password || '');

  // Una credencial vacía no se puede hashear a algo con lo que se pueda entrar:
  // se deja como está y se reporta, para que RH le asigne una.
  if (plana.trim() === '') {
    console.log(`  omitida  ${c.email}  (contraseña vacía en la base)`);
    fallidas++;
    continue;
  }

  const hash = await hashPassword(plana);

  // Se comprueba ANTES de escribir: si el hash no valida contra la contraseña
  // original, esa persona se quedaría fuera y preferimos no tocarla.
  const valida = await comparePassword(plana, hash);
  if (!valida) {
    console.log(`  FALLA    ${c.email}  (el hash no valida; se deja sin tocar)`);
    fallidas++;
    continue;
  }

  if (!ensayo) {
    await prisma.credentials.update({ where: { id: c.id }, data: { password: hash } });
  }
  console.log(`  ${ensayo ? 'lista   ' : 'hasheada'} ${c.email}`);
  hechas++;
}

console.log(`\n${ensayo ? 'se hashearían' : 'hasheadas'}: ${hechas}   sin tocar: ${fallidas}`);
if (!ensayo && hechas > 0) {
  console.log('Todos entran con su misma contraseña de siempre.\n');
}

await prisma.$disconnect();
process.exitCode = fallidas > 0 ? 1 : 0;
