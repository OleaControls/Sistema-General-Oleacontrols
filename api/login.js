import prisma from './_lib/prisma.js'
import { signToken, comparePassword } from './_lib/auth.js'

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

    if (credentials) {
      // Intentar comparar con bcrypt. Si la contraseña en DB no es un hash, fallará.
      // Puedes migrar tus contraseñas a hashes usando hashPassword de _lib/auth.js
      const isMatch = await comparePassword(password, credentials.password)
        .catch(() => credentials.password === password) // Fallback temporal para texto plano

      if (isMatch) {
        const user = {
          id: credentials.employee.id,
          name: credentials.employee.name,
          email: credentials.email,
          roles: credentials.roles,
          avatar: credentials.employee.avatar
        }

        // Generar el token
        const token = signToken(user)

        return res.status(200).json({
          ...user,
          token
        })
      }
    }

    return res.status(401).json({ error: 'Credenciales inválidas' })
  } catch (error) {
    console.error('Login Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
