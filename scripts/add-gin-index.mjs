import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Verificando si el índice ya existe...')

  const existing = await prisma.$queryRaw`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'Employee' AND indexname = 'idx_employee_roles'
  `

  if (existing.length > 0) {
    console.log('El índice idx_employee_roles ya existe. Nada que hacer.')
    return
  }

  console.log('Creando índice GIN en Employee.roles...')
  // CONCURRENTLY no puede correr dentro de una transacción, se usa executeRawUnsafe
  await prisma.$executeRawUnsafe(
    `CREATE INDEX CONCURRENTLY idx_employee_roles ON "Employee" USING GIN (roles)`
  )
  console.log('Índice creado exitosamente.')
}

main()
  .catch(e => { console.error('Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
