import prisma from '../_lib/prisma.js'
import { signToken, comparePassword } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body
  const normalizedEmail = email?.toLowerCase().trim()

  try {
    // Búsqueda case-insensitive para tolerar emails guardados con mayúsculas
    const credentials = await prisma.credentials.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: {
        employee: true
      }
    })

    if (credentials) {
      console.log(`[DEBUG] Intentando login para: ${email}`);
      console.log(`[DEBUG] Password en DB: ${credentials.password}`);
      console.log(`[DEBUG] Password recibida: ${password}`);

      let isMatch = false;
      
      try {
        isMatch = await comparePassword(password, credentials.password);
        console.log(`[DEBUG] Resultado Bcrypt: ${isMatch}`);
      } catch (e) {
        isMatch = credentials.password === password;
        console.log(`[DEBUG] Fallback Texto Plano: ${isMatch}`);
      }

      // Segundo intento si el primero fue false (por si acaso la DB tiene texto plano)
      if (!isMatch) {
        isMatch = credentials.password === password;
      }

      if (isMatch) {
        if (!credentials.employee) {
          throw new Error('Employee record missing for these credentials')
        }

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
