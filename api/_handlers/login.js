import prisma from '../_lib/prisma.js'
import { signToken, comparePassword } from '../_lib/auth.js'

// Cinco intentos deja margen de sobra a quien se equivoca de verdad; quince
// minutos vuelven inviable adivinar por fuerza bruta sin que un empleado
// bloqueado tenga que esperar a que alguien lo rescate.
const MAX_INTENTOS = 5
const MS_BLOQUEO = 15 * 60 * 1000

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
      /* Cuenta bloqueada por intentos fallidos.
         Se comprueba ANTES de verificar la contraseña: si no, quien adivina
         seguiría obteniendo la respuesta de bcrypt y el bloqueo no frenaría
         nada. Ver prisma/migrations-manual/2026-09-28-freno-fuerza-bruta.sql */
      if (credentials.bloqueadoHasta && credentials.bloqueadoHasta > new Date()) {
        const minutos = Math.ceil((credentials.bloqueadoHasta - new Date()) / 60000)
        return res.status(429).json({
          error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} minuto(s).`
        })
      }

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

        // Entró bien: se borra el rastro de los intentos fallidos previos, para
        // que un despistado de ayer no arrastre el contador hasta bloquearse.
        if (credentials.intentosFallidos > 0 || credentials.bloqueadoHasta) {
          await prisma.credentials.update({
            where: { id: credentials.id },
            data: { intentosFallidos: 0, bloqueadoHasta: null }
          }).catch(() => {}) // que un fallo al limpiar no impida entrar
        }

        // Generar el token
        const token = signToken(user)

        return res.status(200).json({
          ...user,
          token
        })
      }

      /* Contraseña incorrecta: se cuenta. A partir del quinto fallo la cuenta
         queda bloqueada 15 minutos, y cada fallo posterior vuelve a correr el
         reloj. Cinco deja margen de sobra a quien se equivoca de verdad, y
         convierte adivinar por fuerza bruta en algo inviable. */
      const fallidos = credentials.intentosFallidos + 1
      await prisma.credentials.update({
        where: { id: credentials.id },
        data: {
          intentosFallidos: fallidos,
          bloqueadoHasta: fallidos >= MAX_INTENTOS
            ? new Date(Date.now() + MS_BLOQUEO)
            : null
        }
      }).catch(() => {}) // el freno es una mejora, no puede tumbar el login
    }

    /* Mismo 401 y mismo texto exista o no la cuenta: si el mensaje cambiara,
       este endpoint serviría además para averiguar qué correos son empleados. */
    return res.status(401).json({ error: 'Credenciales inválidas' })
  } catch (error) {
    console.error('Login Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
