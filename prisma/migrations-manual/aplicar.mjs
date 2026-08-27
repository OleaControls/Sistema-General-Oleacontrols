// ═══════════════════════════════════════════════════════════════════════════
// APLICADOR DE MIGRACIONES MANUALES
//
// Existe porque este proyecto no usa `prisma migrate` (no hay carpeta
// migrations/): el esquema se sincroniza con `db push`, que compara y ajusta
// sin preguntar. Hay cambios que `db push` no puede hacer bien —renombrar una
// tabla conservando sus filas, por ejemplo: él la ve sobrante y la borra— y
// esos van en un .sql que se corre ANTES.
//
// Se conecta con el mismo cliente de Prisma que la aplicación, así que no hace
// falta tener psql instalado.
//
//   node prisma/migrations-manual/aplicar.mjs 2026-08-26-coppel-a-tiendas.sql
//   node prisma/migrations-manual/aplicar.mjs <archivo> --ensayo
//
// `--ensayo` imprime las sentencias y no ejecuta nada.
//
// Todo corre dentro de una transacción: o pasa completo, o no pasa nada.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../../api/_lib/prisma.js';

const aquí = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const ensayo = args.includes('--ensayo');
const nombre = args.find(a => !a.startsWith('--'));

if (!nombre) {
  console.error('Falta el archivo. Ej: node prisma/migrations-manual/aplicar.mjs 2026-08-26-coppel-a-tiendas.sql');
  process.exit(1);
}

const archivo = path.resolve(aquí, nombre);
if (!fs.existsSync(archivo)) {
  console.error(`No existe ${archivo}`);
  process.exit(1);
}

/**
 * Parte el archivo en sentencias.
 *
 * No sirve un `split(';')` a secas: los bloques `DO $$ ... END $$;` llevan
 * punto y coma adentro y quedarían cortados a la mitad. Aquí se ignora todo lo
 * que esté entre marcadores `$$`, y se descartan comentarios de línea.
 */
function sentencias(sql) {
  const fuera = [];
  let actual = '';
  let dentroDeBloque = false;

  for (const línea of sql.split('\n')) {
    const limpia = línea.trim();
    if (!dentroDeBloque && (limpia.startsWith('--') || limpia === '')) continue;

    // Un número impar de `$$` en la línea abre o cierra el bloque.
    const marcadores = (línea.match(/\$\$/g) || []).length;
    if (marcadores % 2 === 1) dentroDeBloque = !dentroDeBloque;

    actual += línea + '\n';

    if (!dentroDeBloque && limpia.endsWith(';')) {
      const s = actual.trim();
      // BEGIN/COMMIT los pone la transacción de Prisma, no el archivo.
      if (!/^(BEGIN|COMMIT)\s*;$/i.test(s)) fuera.push(s);
      actual = '';
    }
  }
  if (actual.trim()) fuera.push(actual.trim());
  return fuera;
}

const sql = fs.readFileSync(archivo, 'utf8');
const lista = sentencias(sql);

console.log(`\n${nombre}`);
console.log(`${lista.length} sentencias${ensayo ? ' (ensayo: no se ejecuta nada)' : ''}\n`);

if (ensayo) {
  lista.forEach((s, i) => {
    console.log(`── ${i + 1} ${'─'.repeat(60)}`);
    console.log(s);
  });
  await prisma.$disconnect();
  process.exit(0);
}

try {
  await prisma.$transaction(async (tx) => {
    for (const [i, s] of lista.entries()) {
      const título = s.split('\n')[0].slice(0, 68);
      process.stdout.write(`  ${String(i + 1).padStart(2)}/${lista.length}  ${título}`);
      await tx.$executeRawUnsafe(s);
      console.log('   ok');
    }
  }, { timeout: 120_000 });

  console.log('\nMigración aplicada. Ahora sí corre `npx prisma db push`.\n');
} catch (e) {
  console.error('\nFALLÓ — no se aplicó nada, la transacción se revirtió.');
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
