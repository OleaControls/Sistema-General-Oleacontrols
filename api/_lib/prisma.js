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
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,                      // máximo 1 conexión por instancia serverless
    idleTimeoutMillis: 10_000,   // cierra conexiones ociosas en 10 s
    connectionTimeoutMillis: 10_000,
  })
  const adapter = new PrismaPg(pool)
  global.__prisma = new PrismaClient({ adapter })
}

export default global.__prisma
