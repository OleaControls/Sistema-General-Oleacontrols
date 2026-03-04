import prisma from './_lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body

  try {
    const credentials = await prisma.credentials.findFirst({
      where: {
        email,
        password // Idealmente usaría bcrypt aquí, pero seguimos la lógica del cliente
      },
      include: {
        employee: true
      }
    })

    if (credentials) {
      const user = {
        id: credentials.employee.id,
        name: credentials.employee.name,
        email: credentials.employee.email,
        role: credentials.role,
        avatar: credentials.employee.avatar
      }
      return res.status(200).json(user)
    }

    return res.status(401).json({ error: 'Credenciales inválidas' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
