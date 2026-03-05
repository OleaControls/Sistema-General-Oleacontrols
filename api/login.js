import prisma from './_lib/prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body

  try {
    const credentials = await prisma.credentials.findUnique({
      where: { email },
      include: {
        employee: true
      }
    })

    if (credentials && credentials.password === password) {
      const user = {
        id: credentials.employee.id,
        name: credentials.employee.name,
        email: credentials.email,
        roles: credentials.roles, // Ahora es un array
        avatar: credentials.employee.avatar
      }
      return res.status(200).json(user)
    }

    return res.status(401).json({ error: 'Credenciales inválidas' })
  } catch (error) {
    console.error('Login Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
