import prisma from './_lib/prisma'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const employees = await prisma.employee.findMany({
        orderBy: { employeeId: 'asc' }
      })
      return res.status(200).json(employees)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    const { name, email, role, position, department, location, phone, joinDate, password } = req.body
    
    try {
      const employeesCount = await prisma.employee.count()
      const employeeId = `EMP-${String(employeesCount + 1).padStart(3, '0')}`

      const employee = await prisma.employee.create({
        data: {
          employeeId,
          name,
          email,
          role,
          position,
          department,
          location,
          phone,
          joinDate: joinDate ? new Date(joinDate) : undefined,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          credentials: {
            create: {
              email,
              password,
              role
            }
          }
        }
      })
      return res.status(201).json(employee)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'PUT') {
    const { id, ...data } = req.body
    try {
      const employee = await prisma.employee.update({
        where: { id },
        data: {
          ...data,
          joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
          credentials: data.password ? {
            update: {
              password: data.password,
              role: data.role
            }
          } : undefined
        }
      })
      return res.status(200).json(employee)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).end()
}
