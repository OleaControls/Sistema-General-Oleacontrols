import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Generar SKU desde nombre ────────────────────────────────────────────────
function toSKU(name, index) {
  const base = name
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map(w => w.slice(0, 4))
    .join('-');
  return `${base}-${String(index).padStart(3, '0')}`;
}

async function main() {
  const xlsxPath = join(__dirname, '../public/productos_y_precios_extraidos.xlsx');
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const dataRows = rows.slice(1).filter(r => r[0] && r[0].toString().trim());

  console.log(`📦 ${dataRows.length} productos en el Excel\n`);

  let created = 0, updated = 0, errors = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const [name, price] = dataRows[i];
    if (!name || typeof name !== 'string' || !name.trim()) continue;

    const cleanName = name.trim();
    const priceNum  = typeof price === 'number' ? price : parseFloat(price) || 0;
    const sku       = toSKU(cleanName, i + 1);

    try {
      // Buscar por nombre exacto (insensible a mayúsculas)
      const existing = await prisma.product.findFirst({
        where: { name: { equals: cleanName, mode: 'insensitive' } }
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { price: priceNum, status: 'ACTIVE' }
        });
        updated++;
      } else {
        // Intentar crear; si el SKU colisiona, añadir sufijo
        let finalSku = sku;
        const skuExists = await prisma.product.findUnique({ where: { sku } });
        if (skuExists) finalSku = `${sku}-${Date.now().toString().slice(-4)}`;

        await prisma.product.create({
          data: {
            sku: finalSku,
            name: cleanName,
            price: priceNum,
            currency: 'MXN',
            unit: 'PZA',
            status: 'ACTIVE',
          }
        });
        created++;
      }

      process.stdout.write(`[${i+1}/${dataRows.length}] ${cleanName.slice(0, 55).padEnd(55)}\r`);
    } catch (e) {
      console.error(`\n❌ Error fila ${i+1}: "${cleanName}" → ${e.message}`);
      errors++;
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Creados:      ${created}`);
  console.log(`↺  Actualizados: ${updated}`);
  console.log(`❌ Errores:      ${errors}`);
  console.log('═══════════════════════════════════════');

  const total = await prisma.product.count();
  console.log(`📊 Total en BD:  ${total} productos`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async e => {
  console.error('\n', e.message);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
