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
      /* La contraseña se valida SOLO contra el hash.

         Antes, si bcrypt fallaba o no coincidía, se volvía a comparar la
         contraseña tal cual contra lo guardado. La intención era no dejar
         fuera a las cuentas viejas, pero el efecto era que el hash dejaba de
         garantizar nada: bastaba con que una fila estuviera en claro para que
         se entrara así, y nada avisaba cuáles estaban en ese estado.

         Las credenciales existentes se hashearon con
         prisma/migrations-manual/hashear-credenciales.mjs (mismas contraseñas,
         ahora con candado) y employees.js ya solo escribe hashes. */
      const isMatch = await comparePassword(password, credentials.password).catch(() => false);

      if (isMatch) {
        if (!credentials.employee) {
          throw new Error('Employee record missing for these credentials')
        }

        /* Dar de baja a un empleado con historial ya no borra sus credenciales
           (se conservan sus OTs, gastos y asistencia), así que el acceso se
           corta aquí: sin este check un empleado INACTIVE seguiría entrando. */
        if (credentials.employee.status === 'INACTIVE') {
          return res.status(403).json({ error: 'Este usuario está dado de baja. Contacta a Recursos Humanos.' })
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
