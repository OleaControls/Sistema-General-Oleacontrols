import prisma from './_lib/prisma.js'
import { uploadToR2 } from './_lib/r2.js'

export default async function handler(req, res) {
  // Helper para procesar múltiples documentos a R2
  const processDocs = async (body) => {
    const docFields = [
      'avatar', 'ine', 'curp', 'rfc', 'nss', 'birthCertificate', 'proofOfResidency', 'cv', 'ineDoc',
      'contractSigned', 'privacyPolicySigned', 'internalRulesSigned', 'imssHigh',
      'studyCertificate', 'degreeOrProfessionalId', 'diplomasOrCourses', 'laborCertifications', 'recommendationLetter',
      'performanceEvaluations', 'receivedTraining', 'administrativeActs', 'disciplinaryReports', 'permitsOrLicenses',
      'resignationLetter', 'settlementOrLiquidation', 'imssLow', 'laborConstancy'
    ];

    const updatedBody = { ...body };
    console.log(`[R2] Iniciando procesamiento de ${docFields.length} campos para documentos.`);
    
    for (const field of docFields) {
      const value = updatedBody[field];
      if (value && typeof value === 'string' && value.startsWith('data:')) {
        try {
          console.log(`[R2] Subiendo archivo detectado en campo: ${field}`);
          const url = await uploadToR2(value, 'hr-documents');
          updatedBody[field] = url;
          console.log(`[R2] Éxito: ${field} -> ${url}`);
        } catch (e) {
          console.error(`[R2] Error crítico subiendo ${field}:`, e.message);
        }
      }
    }
    return updatedBody;
  };

  if (req.method === 'GET') {
// ...
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
    try {
      const body = await processDocs(req.body);
      const { 
          name, email, roles, position, department, location, phone, joinDate, password, reportsTo, employeeId,
          birthDate, birthPlace, nationality, maritalStatus, address, emergencyContactName, emergencyContactPhone,
          ine, curp, rfc, nss, birthCertificate, proofOfResidency, cv, ineDoc,
          contractSigned, privacyPolicySigned, internalRulesSigned, imssHigh,
          studyCertificate, degreeOrProfessionalId, diplomasOrCourses, laborCertifications, recommendationLetter,
          performanceEvaluations, receivedTraining, administrativeActs, disciplinaryReports, permitsOrLicenses,
          resignationLetter, settlementOrLiquidation, imssLow, laborConstancy,
          contractType, workSchedule, salary,
          bankName, bankAccount, paymentType
      } = body
      if (!name || !email) {
        return res.status(400).json({ error: 'Nombre y Email son obligatorios' });
      }

      // 1. Limpieza preventiva de duplicados huérfanos en Credenciales
      // (A veces quedan correos registrados sin empleado asociado por errores previos)
      await prisma.credentials.deleteMany({
          where: { email: email.trim() }
      });

      // 2. Verificar si el email ya existe en empleados
      const existingEmail = await prisma.employee.findUnique({ where: { email: email.trim() } });
      if (existingEmail) {
          return res.status(400).json({ error: `El correo ${email} ya pertenece a otro empleado (${existingEmail.name}).` });
      }

      // 3. Manejar el employeeId (Número de empleado)
      let finalEmployeeId = employeeId;
      if (!finalEmployeeId || finalEmployeeId.trim() === "") {
          const lastEmp = await prisma.employee.findFirst({
              orderBy: { employeeId: 'desc' },
              where: { employeeId: { startsWith: 'EMP-' } }
          });
          
          if (lastEmp) {
              const lastNum = parseInt(lastEmp.employeeId.replace('EMP-', '')) || 0;
              finalEmployeeId = `EMP-${String(lastNum + 1).padStart(3, '0')}`;
          } else {
              finalEmployeeId = 'EMP-001';
          }
      }

      // Verificar si el ID ya existe (por si acaso el autogenerador chocó con uno manual)
      const existingId = await prisma.employee.findUnique({ where: { employeeId: finalEmployeeId } });
      if (existingId) {
          // Si choca, forzamos un ID único con timestamp para no detener el proceso
          finalEmployeeId = `${finalEmployeeId}-${Date.now().toString().slice(-4)}`;
      }

      // 4. Formatear datos
      const finalRoles = Array.isArray(roles) ? roles : (roles ? [roles] : ['COLLABORATOR']);
      let finalJoinDate = new Date();
      if (joinDate) {
          const d = new Date(joinDate);
          if (!isNaN(d.getTime())) finalJoinDate = d;
      }
      let finalBirthDate = null;
      if (birthDate) {
          const d = new Date(birthDate);
          if (!isNaN(d.getTime())) finalBirthDate = d;
      }
      let finalSalary = (salary && !isNaN(parseFloat(salary))) ? parseFloat(salary) : null;

      // 5. Crear Empleado (Sin la relación anidada para evitar errores de validación de Prisma)
      const employee = await prisma.employee.create({
        data: {
          employeeId: finalEmployeeId,
          name,
          email: email.trim(),
          roles: finalRoles,
          position: position || null,
          department: department || null,
          location: location || null,
          phone: phone || null,
          reportsTo: (reportsTo && reportsTo.trim() !== "") ? reportsTo : null,
          joinDate: finalJoinDate,
          birthDate: finalBirthDate,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          birthPlace: birthPlace || null,
          nationality: nationality || null,
          maritalStatus: maritalStatus || null,
          address: address || null,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
          ine: ine || null,
          curp: curp || null,
          rfc: rfc || null,
          nss: nss || null,
          birthCertificate: birthCertificate || null,
          proofOfResidency: proofOfResidency || null,
          cv: cv || null,
          ineDoc: ineDoc || null,
          contractSigned: contractSigned || null,
          privacyPolicySigned: privacyPolicySigned || null,
          internalRulesSigned: internalRulesSigned || null,
          imssHigh: imssHigh || null,
          studyCertificate: studyCertificate || null,
          degreeOrProfessionalId: degreeOrProfessionalId || null,
          diplomasOrCourses: diplomasOrCourses || null,
          laborCertifications: laborCertifications || null,
          recommendationLetter: recommendationLetter || null,
          performanceEvaluations: performanceEvaluations || null,
          receivedTraining: receivedTraining || null,
          administrativeActs: administrativeActs || null,
          disciplinaryReports: disciplinaryReports || null,
          permitsOrLicenses: permitsOrLicenses || null,
          resignationLetter: resignationLetter || null,
          settlementOrLiquidation: settlementOrLiquidation || null,
          imssLow: imssLow || null,
          laborConstancy: laborConstancy || null,
          contractType: contractType || null,
          workSchedule: workSchedule || null,
          salary: finalSalary,
          bankName: bankName || null,
          bankAccount: bankAccount || null,
          paymentType: paymentType || null
        }
      });

      // 6. Crear Credenciales por separado
      await prisma.credentials.create({
          data: {
              email: email.trim(),
              password: password || 'olea2026',
              roles: finalRoles,
              employeeId: employee.id
          }
      });

      return res.status(201).json(employee);
    } catch (error) {
      console.error('❌ POST ERROR:', error)
      let errorMessage = error.message || 'Error interno al crear empleado';
      
      if (error.code === 'P2002') {
          const targets = error.meta?.target || [];
          errorMessage = `Conflicto de duplicidad: El valor de ${targets.join(', ') || 'un campo único'} ya existe en el sistema.`;
      }

      return res.status(500).json({ error: errorMessage, details: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = await processDocs(req.body);
      const { 
          id, password, roles, email, name, position, department, location, phone, joinDate, reportsTo, status, employeeId,
          birthDate, birthPlace, nationality, maritalStatus, address, emergencyContactName, emergencyContactPhone,
          ine, curp, rfc, nss, birthCertificate, proofOfResidency, cv, ineDoc,
          contractSigned, privacyPolicySigned, internalRulesSigned, imssHigh,
          studyCertificate, degreeOrProfessionalId, diplomasOrCourses, laborCertifications, recommendationLetter,
          performanceEvaluations, receivedTraining, administrativeActs, disciplinaryReports, permitsOrLicenses,
          resignationLetter, settlementOrLiquidation, imssLow, laborConstancy,
          contractType, workSchedule, salary,
          bankName, bankAccount, paymentType
      } = body
      
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      const updateData = {
        employeeId: employeeId || undefined,
        name: name || undefined,
        email: email || undefined,
        roles: roles || undefined,
        avatar: body.avatar || undefined,
        position: position || null,
        department: department || null,
        location: location || null,
        phone: phone || null,
        status: status || 'ACTIVE',
        reportsTo: (reportsTo && reportsTo.trim() !== "" && reportsTo !== id) ? reportsTo : null,
        
        birthPlace: birthPlace || null,
        nationality: nationality || null,
        maritalStatus: maritalStatus || null,
        address: address || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,

        // Documentos
        ine: ine || null,
        curp: curp || null,
        rfc: rfc || null,
        nss: nss || null,
        birthCertificate: birthCertificate || null,
        proofOfResidency: proofOfResidency || null,
        cv: cv || null,
        ineDoc: ineDoc || null,
        contractSigned: contractSigned || null,
        privacyPolicySigned: privacyPolicySigned || null,
        internalRulesSigned: internalRulesSigned || null,
        imssHigh: imssHigh || null,
        studyCertificate: studyCertificate || null,
        degreeOrProfessionalId: degreeOrProfessionalId || null,
        diplomasOrCourses: diplomasOrCourses || null,
        laborCertifications: laborCertifications || null,
        recommendationLetter: recommendationLetter || null,
        performanceEvaluations: performanceEvaluations || null,
        receivedTraining: receivedTraining || null,
        administrativeActs: administrativeActs || null,
        disciplinaryReports: disciplinaryReports || null,
        permitsOrLicenses: permitsOrLicenses || null,
        resignationLetter: resignationLetter || null,
        settlementOrLiquidation: settlementOrLiquidation || null,
        imssLow: imssLow || null,
        laborConstancy: laborConstancy || null,

        // Laborales
        contractType: contractType || null,
        workSchedule: workSchedule || null,

        // Nómina
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        paymentType: paymentType || null,
      };

      // Validar salario
      if (salary !== undefined && salary !== null && salary !== '') {
          const s = parseFloat(salary);
          if (!isNaN(s)) updateData.salary = s;
      } else {
          updateData.salary = null;
      }

      // Validar fechas
      if (joinDate) {
          const d = new Date(joinDate);
          if (!isNaN(d.getTime())) updateData.joinDate = d;
      }
      if (birthDate) {
          const d = new Date(birthDate);
          if (!isNaN(d.getTime())) updateData.birthDate = d;
      } else {
          updateData.birthDate = null;
      }

      // 1. Actualizar datos del empleado
      const updatedEmployee = await prisma.employee.update({
        where: { id },
        data: updateData
      });

      // 2. Actualizar o crear credenciales de forma independiente
      if (email) {
          await prisma.credentials.upsert({
            where: { employeeId: id },
            create: {
              email: email,
              password: password || 'olea2026',
              roles: roles || ['COLLABORATOR'],
              employeeId: id
            },
            update: {
              email: email,
              roles: roles || undefined,
              ...(password && password.trim() !== "" ? { password } : {})
            }
          });
      }

      return res.status(200).json(updatedEmployee);
    } catch (error) {
      console.error('❌ PUT ERROR:', error);
      // Devolver error más descriptivo
      let errorMessage = error.message || 'Error interno al actualizar empleado';
      
      if (error.code === 'P2002') {
          errorMessage = `El ${error.meta.target.join(', ')} ya está en uso por otro empleado.`;
      } else if (error.name === 'PrismaClientValidationError') {
          errorMessage = `Error de validación en los campos enviados: ${error.message.split('\n').pop()}`;
      }

      return res.status(500).json({ 
          error: errorMessage,
          details: error.message 
      });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID requerido' });

    try {
      // 1. Eliminar credenciales asociadas primero (por la relación)
      await prisma.credentials.deleteMany({
        where: { employeeId: id }
      });

      // 2. Eliminar al empleado
      await prisma.employee.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Empleado eliminado exitosamente' });
    } catch (error) {
      console.error('❌ DELETE ERROR:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
