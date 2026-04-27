import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

// En serverless cada invocación puede crear una conexión nueva.
// Reutilizamos la instancia global para no agotar el pool de la DB.
if (!global.__prisma) {
  // Vercel serverless: cada instancia mantiene su propio pool, max:1 es correcto.
  // Express / local: subir DB_POOL_MAX (ej: DB_POOL_MAX=5) para mayor concurrencia.
  const poolMax = parseInt(process.env.DB_POOL_MAX || '1', 10);
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: poolMax,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  })
  const adapter = new PrismaPg(pool)
  global.__prisma = new PrismaClient({ adapter })
}

export default global.__prisma
