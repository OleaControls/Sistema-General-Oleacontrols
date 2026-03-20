import prisma from '../_lib/prisma.js'

export default async function handler(req, res) {
  const { method } = req

  if (method === 'GET') {
    const { employeeId } = req.query
    if (!employeeId) return res.status(400).json({ error: 'employeeId es requerido' })

    try {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: { vacationRequests: { orderBy: { createdAt: 'desc' } } }
      })

      if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' })

      // Logic to auto-renew balance if anniversary passed
      const now = new Date()
      const joinDate = new Date(employee.joinDate)
      const lastRenewal = new Date(employee.vacationLastRenewal)
      
      const getYearsOfService = (date, join) => {
        let years = date.getFullYear() - join.getFullYear()
        const m = date.getMonth() - join.getMonth()
        if (m < 0 || (m === 0 && date.getDate() < join.getDate())) {
          years--
        }
        return years
      }

      const yearsNow = getYearsOfService(now, joinDate)
      const yearsLast = getYearsOfService(lastRenewal, joinDate)

      if (yearsNow > yearsLast && yearsNow >= 1) {
        // anniversary passed, renew days
        const newDays = 12 + (yearsNow - 1) * 2
        
        let anniversaryDate = new Date(joinDate)
        anniversaryDate.setFullYear(now.getFullYear())
        if (now < anniversaryDate) {
          anniversaryDate.setFullYear(now.getFullYear() - 1)
        }

        const updatedEmployee = await prisma.employee.update({
          where: { id: employeeId },
          data: {
            vacationBalance: newDays,
            vacationLastRenewal: anniversaryDate
          },
          include: { vacationRequests: { orderBy: { createdAt: 'desc' } } }
        })
        return res.status(200).json(updatedEmployee)
      }

      return res.status(200).json(employee)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (method === 'POST') {
    const { type, employeeId, startDate, endDate, days, reason, manualAdjustment } = req.body

    try {
      if (manualAdjustment) {
        if (!employeeId) return res.status(400).json({ error: 'employeeId es requerido' })
        const parsedDays = parseFloat(days)
        if (isNaN(parsedDays)) return res.status(400).json({ error: 'Días debe ser un número válido' })

        const updated = await prisma.employee.update({
          where: { id: employeeId },
          data: { vacationBalance: parsedDays }
        })
        return res.status(200).json(updated)
      }

      if (!employeeId || !startDate || !endDate || !days) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' })
      }

      const parsedDays = parseInt(days)
      if (isNaN(parsedDays)) return res.status(400).json({ error: 'Días debe ser un número entero' })

      // VALIDACIÓN DE SALDO DISPONIBLE
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' })
      
      if (parsedDays > employee.vacationBalance) {
        return res.status(400).json({ error: `Saldo insuficiente. Tienes ${employee.vacationBalance} días disponibles.` })
      }

      const request = await prisma.vacationRequest.create({
        data: {
          employeeId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          days: parsedDays,
          reason: reason || '',
          type: type || 'ANNUAL',
          status: 'PENDING'
        }
      })
      return res.status(201).json(request)
    } catch (error) {
      console.error('❌ POST /api/vacations error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (method === 'PUT') {
    const { requestId, status } = req.body
    if (!requestId || !status) return res.status(400).json({ error: 'requestId y status son requeridos' })

    try {
      const request = await prisma.vacationRequest.findUnique({
        where: { id: requestId },
        include: { employee: true }
      })

      if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' })

      // Solo descontar si es tipo VACACIONES ANUALES (ANNUAL)
      if (status === 'APPROVED' && request.status !== 'APPROVED' && request.type === 'ANNUAL') {
        console.log(`[Vacations] Descontando ${request.days} días a empleado ${request.employeeId}`)
        await prisma.employee.update({
          where: { id: request.employeeId },
          data: {
            vacationBalance: {
              decrement: parseFloat(request.days)
            }
          }
        })
      }

      const updatedRequest = await prisma.vacationRequest.update({
        where: { id: requestId },
        data: { status }
      })

      return res.status(200).json(updatedRequest)
    } catch (error) {
      console.error('❌ PUT /api/vacations error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Método no permitido' })
}
