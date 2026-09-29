import prisma from '../_lib/prisma.js'
import { uploadToR2, signUrlIfNeeded } from '../_lib/r2.js'
import { authMiddleware, hashPassword } from '../_lib/auth.js'
import { puede, puedeAsignarRol } from '../_lib/permisos.js'

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  /* Autorizacion.
   *
   * Hasta ahora este handler solo comprobaba que el token fuera valido, y no
   * volvia a mirar quien era. Cualquier usuario autenticado podia leer el
   * expediente completo de cualquier otro —salario, cuenta bancaria, RFC,
   * CURP, domicilio— y, peor, escribirlo: mandando `roles` en un PUT, un
   * tecnico podia darse ADMIN a si mismo desde la consola del navegador.
   *
   * El listado se deja abierto porque medio sistema lo necesita (asignar una
   * OT, elegir un vendedor, el organigrama), pero quien no es RH lo recibe sin
   * los datos personales.
   */
  //
  // Quien puede qué sale de src/lib/permisos.js. Ver el expediente completo
  // (sueldo, banco, CURP) es de Contratación, Nómina y la jefatura; Desarrollo
  // recibe la ficha pública como el resto.
  const misRoles = auth.roles || [];
  const esRH = puede(misRoles, 'rh.expediente.ver');

  // Lo que puede editar cualquiera de su propia ficha. Son datos de contacto:
  // nada que decida su sueldo, su acceso o su situacion laboral.
  const CAMPOS_PROPIOS = [
    'avatar', 'phone', 'address',
    'emergencyContactName', 'emergencyContactPhone',
    'telegramChatId', 'birthPlace', 'nationality', 'maritalStatus',
  ];

  // Vista reducida para quien no es RH: lo justo para pintar un nombre, una
  // foto y saber a quien asignarle trabajo.
  const CAMPOS_PUBLICOS = {
    id: true, employeeId: true, name: true, email: true, roles: true,
    avatar: true, position: true, department: true, status: true,
    location: true, reportsTo: true, joinDate: true,
  };

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
    
    // Subir todos los documentos en paralelo (uploads independientes por campo)
    await Promise.all(docFields.map(async (field) => {
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
    }));
    return updatedBody;
  };

  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      // SI SE PIDE UN EMPLEADO ESPECÍFICO (Detalle completo)
      if (id) {
          // El expediente completo lleva salario y cuenta bancaria. Quien no es
          // RH solo puede verlo entero si es el suyo; del resto ve la ficha
          // publica, que es lo que necesitan las vistas de CRM y Operaciones.
          if (!esRH && id !== auth.id) {
            const ficha = await prisma.employee.findUnique({
              where: { id }, select: CAMPOS_PUBLICOS,
            });
            if (!ficha) return res.status(404).json({ error: 'Empleado no encontrado' });
            return res.status(200).json(ficha);
          }

          const employee = await prisma.employee.findUnique({
              where: { id },
              include: {
                // Limitar a las 24 solicitudes más recientes, no todas
                vacationRequests: { orderBy: { createdAt: 'desc' }, take: 24 }
              }
          });

          if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });

          const docFields = [
            'avatar', 'ine', 'curp', 'rfc', 'nss', 'birthCertificate', 'proofOfResidency', 'cv', 'ineDoc',
            'contractSigned', 'privacyPolicySigned', 'internalRulesSigned', 'imssHigh',
            'studyCertificate', 'degreeOrProfessionalId', 'diplomasOrCourses', 'laborCertifications', 'recommendationLetter',
            'performanceEvaluations', 'receivedTraining', 'administrativeActs', 'disciplinaryReports', 'permitsOrLicenses',
            'resignationLetter', 'settlementOrLiquidation', 'imssLow', 'laborConstancy'
          ];

          // Firmar todas las URLs en paralelo en lugar de secuencialmente (una sola pasada)
          await Promise.all(
            docFields.map(async (f) => {
              if (employee[f] && typeof employee[f] === 'string' && employee[f].includes('r2.dev')) {
                employee[f] = await signUrlIfNeeded(employee[f]);
              }
            })
          );

          return res.status(200).json(employee);
      }

      // LISTADO GENERAL
      // Abierto a todos —asignar una OT o pintar el organigrama lo necesitan—
      // pero sin datos personales para quien no es RH. Antes este listado
      // repartia la CURP, el RFC, el NSS y las ligas a los documentos de toda
      // la plantilla a cualquiera que tuviera sesion.
      if (!esRH) {
        const ficha = await prisma.employee.findMany({
          orderBy: { employeeId: 'asc' },
          select: CAMPOS_PUBLICOS,
        });
        return res.status(200).json(ficha);
      }

      const employees = await prisma.employee.findMany({
        orderBy: { employeeId: 'asc' },
        select: {
            id: true, employeeId: true, name: true, email: true,
            roles: true, avatar: true, position: true, department: true,
            status: true, location: true, phone: true, reportsTo: true,
            telegramChatId: true, joinDate: true, contractType: true,
            vacationBalance: true,
            vacationRequests: { orderBy: { createdAt: 'desc' }, take: 12 },
            // Campos de documentos (solo indicador de existencia para el expediente)
            ineDoc: true, curp: true, rfc: true, nss: true,
            birthCertificate: true, proofOfResidency: true, cv: true,
            contractSigned: true, privacyPolicySigned: true,
            internalRulesSigned: true, imssHigh: true,
            studyCertificate: true, degreeOrProfessionalId: true,
            diplomasOrCourses: true, laborCertifications: true,
            recommendationLetter: true, performanceEvaluations: true,
            receivedTraining: true, administrativeActs: true,
            disciplinaryReports: true, permitsOrLicenses: true,
            resignationLetter: true, settlementOrLiquidation: true,
            imssLow: true, laborConstancy: true,
        }
      });

      return res.status(200).json(employees);
    } catch (error) {
      console.error('❌ GET EMPLOYEES ERROR:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    // Dar de alta a alguien crea tambien sus credenciales de acceso.
    if (!puede(misRoles, 'rh.empleados.alta')) {
      return res.status(403).json({ error: 'Solo Contratación o la jefatura de RH pueden dar de alta empleados' });
    }

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

      const normalizedEmail = email.trim().toLowerCase();

      // 1. Limpieza preventiva de duplicados huérfanos en Credenciales
      // (A veces quedan correos registrados sin empleado asociado por errores previos)
      await prisma.credentials.deleteMany({
          where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
      });

      // 2. Verificar si el email ya existe en empleados
      const existingEmail = await prisma.employee.findUnique({ where: { email: normalizedEmail } });
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
      // Contratación da de alta a la gente, pero no puede crear una cuenta con
      // un rol que ella misma no puede asignar (RH, ADMIN).
      const noAsignables = finalRoles.filter(r => !puedeAsignarRol(misRoles, r));
      if (noAsignables.length) {
        return res.status(403).json({ error: 'No puedes asignar estos roles', roles: noAsignables });
      }
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
          email: normalizedEmail,
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

      // 6. Crear Credenciales por separado.
      // La contraseña se guarda hasheada: en la base nunca hay texto plano, ni
      // siquiera la de arranque. Si no se captura una, se pone la de siempre y
      // el empleado la cambia al entrar.
      await prisma.credentials.create({
          data: {
              email: normalizedEmail,
              password: await hashPassword(password || 'olea2026'),
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

      /* Autorizacion por campo, segun lo que CAMBIA.
       *
       * La pantalla de RH manda el expediente entero en cada guardado, asi que
       * mirar solo que claves vienen no sirve: Nomina no podria corregir un
       * sueldo porque el formulario tambien trae el nombre, sin tocarlo. Se
       * compara contra lo guardado y cada campo que cambia se revisa contra su
       * permiso:
       *
       * - Datos de contacto propios: cualquiera, en su propia ficha.
       * - Sueldo y banco: Nomina y jefatura (un alta nueva los trae en el POST).
       * - Acceso (correo, contraseña, roles) y baja/reactivacion: solo sobre
       *   alguien cuyos roles uno mismo podria asignar. Sin esto Contratacion
       *   podria cambiarle la contraseña a la jefa o a un ADMIN y entrar como
       *   ella. Y cada rol que se agrega o quita tiene que ser asignable.
       * - Todo lo demas del expediente: Contratacion y jefatura.
       *
       * La lista blanca de campos propios sigue siendo lo que impide que alguien
       * se de ADMIN a si mismo con un PUT a su propia ficha.
       */
      const actual = await prisma.employee.findUnique({ where: { id } });
      if (!actual) return res.status(404).json({ error: 'Empleado no encontrado' });

      const normal = (v) => {
        if (v === undefined || v === null) return '';
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (Array.isArray(v)) return [...v].sort().join(',');
        const t = String(v).trim();
        return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : t;
      };
      const mismoValor = (a, b) => {
        const na = normal(a), nb = normal(b);
        if (na === nb) return true;
        // '15000' del formulario contra 15000 guardado
        return na !== '' && nb !== '' && isFinite(na) && isFinite(nb) && Number(na) === Number(nb);
      };

      const CAMPOS_SUELDO = ['salary', 'bankName', 'bankAccount', 'paymentType'];
      const CAMPOS_ACCESO = ['email', 'password', 'roles', 'status'];
      const CAMPOS_EXPEDIENTE = [
        'employeeId', 'name', 'avatar', 'position', 'department', 'location', 'phone',
        'reportsTo', 'birthDate', 'joinDate', 'birthPlace', 'nationality', 'maritalStatus',
        'address', 'emergencyContactName', 'emergencyContactPhone',
        'ine', 'curp', 'rfc', 'nss', 'birthCertificate', 'proofOfResidency', 'cv', 'ineDoc',
        'contractSigned', 'privacyPolicySigned', 'internalRulesSigned', 'imssHigh',
        'studyCertificate', 'degreeOrProfessionalId', 'diplomasOrCourses',
        'laborCertifications', 'recommendationLetter', 'performanceEvaluations',
        'receivedTraining', 'administrativeActs', 'disciplinaryReports',
        'permitsOrLicenses', 'resignationLetter', 'settlementOrLiquidation',
        'imssLow', 'laborConstancy', 'contractType', 'workSchedule', 'telegramChatId',
      ];

      const cambia = (campo) => {
        if (!Object.prototype.hasOwnProperty.call(body, campo)) return false;
        if (campo === 'password') return !!(body.password && String(body.password).trim());
        // Un arreglo de roles vacio se ignora mas abajo; no cuenta como cambio.
        if (campo === 'roles' && !(Array.isArray(body.roles) && body.roles.length)) return false;
        // El correo se guarda en minusculas; 'Ana@...' no es un cambio.
        if (campo === 'email') return normal(body.email).toLowerCase() !== normal(actual.email).toLowerCase();
        return !mismoValor(body[campo], actual[campo]);
      };

      const esPropia = id === auth.id;
      const puedoTocarSuCuenta = (actual.roles || []).every(r => puedeAsignarRol(misRoles, r));
      const denegados = [];

      for (const campo of [...CAMPOS_EXPEDIENTE, ...CAMPOS_SUELDO, ...CAMPOS_ACCESO]) {
        if (!cambia(campo)) continue;
        let ok;
        if (esPropia && CAMPOS_PROPIOS.includes(campo)) ok = true;
        else if (CAMPOS_SUELDO.includes(campo)) ok = puede(misRoles, 'rh.sueldos.editar');
        else if (campo === 'status') ok = puede(misRoles, 'rh.empleados.baja') && puedoTocarSuCuenta;
        else if (campo === 'roles') {
          const antes = actual.roles || [];
          const despues = body.roles;
          const tocados = [
            ...despues.filter(r => !antes.includes(r)),
            ...antes.filter(r => !despues.includes(r)),
          ];
          ok = puede(misRoles, 'rh.expediente.editar') && puedoTocarSuCuenta
            && tocados.every(r => puedeAsignarRol(misRoles, r));
        }
        else if (CAMPOS_ACCESO.includes(campo)) ok = puede(misRoles, 'rh.expediente.editar') && puedoTocarSuCuenta;
        else ok = puede(misRoles, 'rh.expediente.editar');
        if (!ok) denegados.push(campo);
      }

      if (denegados.length) {
        return res.status(403).json({
          error: esPropia && !esRH
            ? 'No puedes modificar estos campos de tu propia ficha'
            : 'Tu rol no permite modificar estos campos',
          campos: denegados,
        });
      }

      /* Actualizacion parcial: solo se toca lo que viene en la peticion.
       *
       * Antes este bloque escribia TODOS los campos con `campo || null`. Como
       * la pantalla de RH manda solo lo que edita —al subir un documento manda
       * ese documento y poco mas—, cada guardado borraba los otros 26 campos
       * del expediente. Y `status: status || 'ACTIVE'` volvia a dar de alta a
       * quien estaba dado de baja.
       *
       * La regla ahora es la presencia de la clave: si el campo no viene, no se
       * toca; si viene vacio, se limpia a proposito. Es ademas lo que hace
       * seguro reintentar una peticion vieja, que es justo lo que hara la cola
       * offline: sin esto, un reintento de hace horas pisaria lo ya corregido.
       */
      const presente = (campo) => Object.prototype.hasOwnProperty.call(body, campo);
      const limpio   = (v) => (v === '' || v === null ? null : v);

      const updateData = {};

      // Texto libre y documentos: aqui el vacio si significa "borrar".
      const CAMPOS_OPCIONALES = [
        'position', 'department', 'location', 'phone',
        'birthPlace', 'nationality', 'maritalStatus', 'address',
        'emergencyContactName', 'emergencyContactPhone',
        'ine', 'curp', 'rfc', 'nss', 'birthCertificate', 'proofOfResidency', 'cv', 'ineDoc',
        'contractSigned', 'privacyPolicySigned', 'internalRulesSigned', 'imssHigh',
        'studyCertificate', 'degreeOrProfessionalId', 'diplomasOrCourses',
        'laborCertifications', 'recommendationLetter', 'performanceEvaluations',
        'receivedTraining', 'administrativeActs', 'disciplinaryReports',
        'permitsOrLicenses', 'resignationLetter', 'settlementOrLiquidation',
        'imssLow', 'laborConstancy',
        'contractType', 'workSchedule',
        'bankName', 'bankAccount', 'paymentType',
        'telegramChatId',
      ];
      for (const campo of CAMPOS_OPCIONALES) {
        if (presente(campo)) updateData[campo] = limpio(body[campo]);
      }

      // Identificadores: vaciarlos dejaria al empleado sin nombre o sin correo,
      // asi que un valor vacio se ignora en vez de escribirse.
      for (const campo of ['employeeId', 'name', 'email', 'avatar']) {
        if (presente(campo) && body[campo]) updateData[campo] = body[campo];
      }

      // Un arreglo vacio es truthy en JavaScript: sin comprobar la longitud,
      // mandar roles: [] dejaria al empleado sin ningun rol y sin acceso.
      if (presente('roles') && Array.isArray(roles) && roles.length > 0) {
        updateData.roles = roles;
      }

      // Dar de baja o reactivar es una decision explicita, nunca el efecto
      // secundario de guardar otra cosa.
      if (presente('status') && status) updateData.status = status;

      // Nadie puede ser su propio jefe.
      if (presente('reportsTo')) {
        updateData.reportsTo =
          (reportsTo && String(reportsTo).trim() !== '' && reportsTo !== id) ? reportsTo : null;
      }

      if (presente('salary')) {
        const s = parseFloat(salary);
        updateData.salary = (salary === '' || salary === null || isNaN(s)) ? null : s;
      }

      // birthDate admite nulo; joinDate no (es obligatorio en el esquema), asi
      // que solo se escribe cuando trae una fecha valida.
      if (presente('birthDate')) {
        const d = birthDate ? new Date(birthDate) : null;
        updateData.birthDate = (d && !isNaN(d.getTime())) ? d : null;
      }
      if (presente('joinDate') && joinDate) {
        const d = new Date(joinDate);
        if (!isNaN(d.getTime())) updateData.joinDate = d;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No hay nada que actualizar' });
      }

      // 1. Actualizar datos del empleado
      const updatedEmployee = await prisma.employee.update({
        where: { id },
        data: updateData
      });

      // 2. Actualizar o crear credenciales de forma independiente
      if (email) {
          const normalizedUpdEmail = email.trim().toLowerCase();
          // Igual que en el alta: nunca se escribe la contraseña en claro.
          // Al editar, solo se toca si de verdad viene una nueva.
          const nuevaPass = password && password.trim() !== '' ? password.trim() : null;
          await prisma.credentials.upsert({
            where: { employeeId: id },
            create: {
              email: normalizedUpdEmail,
              password: await hashPassword(nuevaPass || 'olea2026'),
              roles: roles || ['COLLABORATOR'],
              employeeId: id
            },
            update: {
              email: normalizedUpdEmail,
              // Mismo cuidado que arriba: [] es truthy, y sin comprobar la
              // longitud un guardado sin roles dejaria al empleado sin acceso.
              roles: (Array.isArray(roles) && roles.length > 0) ? roles : undefined,
              ...(nuevaPass ? { password: await hashPassword(nuevaPass) } : {})
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
    if (!puede(misRoles, 'rh.empleados.baja')) {
      return res.status(403).json({ error: 'Solo la jefatura de RH puede dar de baja empleados' });
    }

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID requerido' });

    try {
      /* Un empleado con historial NO se borra: sus OTs, gastos, ventas y
         asistencia quedarían huérfanos o se perderían. Antes se intentaba el
         borrado duro y Postgres lo rechazaba por llave foránea, devolviendo un
         500 con un mensaje ilegible. Ahora se revisa primero y, si hay
         historial, se da de baja (status INACTIVE) conservando todo.

         Las llaves de RELACIONES son los nombres de relación del modelo
         Employee en schema.prisma; si ahí se agrega una relación nueva hay que
         sumarla aquí. `credentials` se omite a propósito: es el acceso al
         sistema, no historial, y se borra junto con el empleado. */
      const RELACIONES = {
        techOTs:             'OTs como técnico',
        supervisorOTs:       'OTs como supervisor',
        createdOTs:          'OTs creadas',
        assignedOTs:         'OTs asignadas',
        panoramizaciones:    'panoramizaciones',
        expenses:            'gastos',
        assignedLeads:       'leads asignados',
        assignedDeals:       'negociaciones asignadas',
        quotesCreated:       'cotizaciones creadas',
        quotesSold:          'cotizaciones vendidas',
        ownedClients:        'clientes a su cargo',
        salesBitacora:       'registros de bitácora de ventas',
        salesReports:        'reportes diarios de ventas',
        salesPortfolio:      'registros de cartera de ventas',
        evaluationsReceived: 'evaluaciones recibidas',
        evaluationsGiven:    'evaluaciones realizadas',
        assets:              'activos o EPP asignados',
        calendarEvents:      'eventos de calendario',
        attendanceRecords:   'registros de asistencia',
        techAttendance:      'registros de jornada',
        techGoals:           'metas diarias',
        goalsSet:            'metas asignadas a otros',
        vacationRequests:    'solicitudes de vacaciones',
        fieldDocs:           'documentos de campo',
      };

      const employee = await prisma.employee.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: Object.fromEntries(Object.keys(RELACIONES).map(k => [k, true])) },
        },
      });
      if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });

      const historial = Object.entries(RELACIONES)
        .map(([rel, label]) => ({ label, n: employee._count[rel] || 0 }))
        .filter(x => x.n > 0);

      if (historial.length > 0) {
        await prisma.employee.update({ where: { id }, data: { status: 'INACTIVE' } });
        // Solo los 3 rubros con más registros: el detalle completo va en `historial`.
        const top = [...historial].sort((a, b) => b.n - a.n).slice(0, 3);
        const detalle = top.map(x => `${x.n} ${x.label}`).join(', ');
        const resto = historial.length - top.length;
        return res.status(200).json({
          softDeleted: true,
          message: `${employee.name} se dio de baja. No se eliminó porque tiene historial (${detalle}${resto > 0 ? ` y ${resto} rubro${resto > 1 ? 's' : ''} más` : ''}); esos registros se conservan.`,
          historial,
        });
      }

      // Sin historial: se puede borrar de verdad.
      await prisma.credentials.deleteMany({ where: { employeeId: id } });
      await prisma.employee.delete({ where: { id } });

      return res.status(200).json({
        softDeleted: false,
        message: `${employee.name} se eliminó permanentemente.`,
      });
    } catch (error) {
      console.error('❌ DELETE ERROR:', error);
      // Red de seguridad: si quedó alguna relación no contemplada arriba,
      // se da de baja igualmente en vez de devolver un 500 sin explicación.
      if (error.code === 'P2003') {
        try {
          await prisma.employee.update({ where: { id }, data: { status: 'INACTIVE' } });
          return res.status(200).json({
            softDeleted: true,
            message: 'El empleado se dio de baja: tiene registros ligados que no se pueden eliminar.',
          });
        } catch { /* cae al error genérico */ }
      }
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
