import prisma from '../api/_lib/prisma.js'

async function main() {
  console.log('🌱 Starting seed process (Multiple Roles Support)...')

  // Inicializar Categorías por defecto
  const initialCategories = [
    "Técnico Junior",
    "Técnico Senior",
    "Supervisor de Obra",
    "Líder de Cuadrilla",
    "Gerente de Operaciones",
    "Director General",
    "Analista de RH",
    "Ejecutivo de Ventas",
    "Coordinador CRM"
  ]

  for (const cat of initialCategories) {
    await prisma.category.upsert({
      where: { name: cat },
      update: {},
      create: { name: cat }
    })
  }

  // Inicializar Empleados y sus Credenciales con ARRAYS de roles
  const initialEmployees = [
    {
      employeeId: "EMP-001",
      name: "Roberto Olea",
      roles: ["ADMIN", "HR"], // Ahora es un array
      position: "Director General",
      department: "Administración Central",
      email: "roberto@oleacontrols.com",
      phone: "+52 442 000 0000",
      location: "CDMX, MX",
      password: "olea2026"
    },
    {
      employeeId: "EMP-002",
      name: "Ana Admin",
      roles: ["HR"], // Ahora es un array
      position: "Gerente de Capital Humano",
      department: "Recursos Humanos",
      email: "ana@oleacontrols.com",
      phone: "+52 442 987 6543",
      location: "CDMX, MX",
      password: "olea2026"
    }
  ]

  for (const emp of initialEmployees) {
    const { password, roles, ...empData } = emp
    await prisma.employee.upsert({
      where: { email: emp.email },
      update: {
        roles: roles
      },
      create: {
        ...empData,
        roles: roles,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`,
        credentials: {
          create: {
            email: emp.email,
            password: password,
            roles: roles
          }
        }
      }
    })
  }

  console.log('✅ Seed finished successfully.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
