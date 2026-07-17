import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { withAccelerate } from '@prisma/extension-accelerate'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

// Detecta el tipo de conexión (Prisma 7):
//  - Accelerate / Prisma Postgres pooled ("prisma://" o "prisma+postgres://")
//    → se pasa como `accelerateUrl`; el pooling lo administra Prisma (miles de
//    conexiones, ideal para serverless — no se abre un pool TCP propio).
//  - Postgres TCP normal ("postgres://" / "postgresql://") → driver adapter con
//    pool local (pooler de Neon/Supabase o conexión directa/local).
const isAccelerate = DB_URL.startsWith('prisma://') || DB_URL.startsWith('prisma+postgres://')

// Reutilizamos la instancia global para no recrear el cliente en cada invocación.
if (!global.__prisma) {
  if (isAccelerate) {
    global.__prisma = new PrismaClient({ accelerateUrl: DB_URL }).$extends(withAccelerate())
  } else {
    // Vercel serverless: muchas instancias concurrentes, cada una con su pool →
    // forzamos max:1 para no agotar el límite de conexiones de la base de datos.
    // Servidor siempre encendido (Express/VPS): un solo proceso, conviene un pool
    // mayor (DB_POOL_MAX, por defecto 10) para servir varios usuarios a la vez.
    const isServerless = !!process.env.VERCEL;
    const poolMax = isServerless ? 1 : parseInt(process.env.DB_POOL_MAX || '10', 10);
    const pool = new pg.Pool({
      connectionString: DB_URL,
      ssl: { rejectUnauthorized: false },
      max: poolMax,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 15_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    })
    global.__prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  }
}

export default global.__prisma
