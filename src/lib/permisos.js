/* Roles, áreas y permisos — fuente única, usada por el navegador y por la API.
 *
 * Antes cada pantalla y cada handler tenía su propia lista escrita a mano
 * (`['ADMIN','HR','SUPERVISOR']`), y el menú y la API se desincronizaban: una
 * vista escondida en el menú seguía abierta en el servidor. Aquí se define una
 * sola vez qué puede hacer cada rol; el menú (AppShell) y los handlers
 * preguntan con `puede(roles, 'permiso')`.
 *
 * Vive en src/ por la misma razón que src/lib/compras.js: en desarrollo Vite
 * hace proxy de /api al Express, así que un módulo en api/_lib nunca llegaría
 * al navegador. api/_lib/permisos.js lo reexporta. Por eso aquí no se usan
 * alias '@/': el servidor no los entiende.
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  OPS: 'SUPERVISOR',
  TECH: 'TECHNICIAN',
  SALES: 'SALES',
  PM: 'PROJECT_MANAGER',
  PURCHASING: 'PURCHASING',
  COLLABORATOR: 'COLLABORATOR',

  // Talento Humano. `HR` conserva su valor para no tocar a quien ya lo tiene:
  // es la jefatura del área.
  HR: 'HR',
  HR_RECRUITER: 'HR_RECRUITER',
  HR_DEVELOPMENT: 'HR_DEVELOPMENT',
  HR_PAYROLL: 'HR_PAYROLL',
};

/* Las cinco áreas de la empresa. Por ahora solo Talento Humano tiene roles
 * propios; las demás se irán llenando conforme se migren. */
export const AREAS = {
  PROSPECTORES:      { nombre: 'Prospectores',      subtitulo: 'Área Comercial',                        subareas: ['Publicidad', 'Asesoras', 'Mercadotecnia'] },
  EXPERIENCIADORES:  { nombre: 'Experienciadores',  subtitulo: 'Experiencia de Servicio al Cliente',    subareas: ['Residencial', 'Comercial'] },
  ACTIVOS:           { nombre: 'Activos',           subtitulo: 'Administración y Finanzas',             subareas: ['Costos', 'Almacén', 'Compras', 'Contabilidad'] },
  EJECUTORES:        { nombre: 'Ejecutores',        subtitulo: 'Ingeniería',                            subareas: ['Procesos', 'Proyectos', 'Sistemas', 'Operaciones'] },
  INSTRUCTORES:      { nombre: 'Instructores',      subtitulo: 'Talento Humano',                        subareas: ['Desarrollo', 'Contratación'] },
};

/* Qué es cada rol, en palabras de la empresa. Lo usan las pantallas para
 * pintar la etiqueta y explicar el rol al asignarlo. */
export const ROL_INFO = {
  [ROLES.ADMIN]:          { label: 'Administrador',            corto: 'Admin',      area: null },
  [ROLES.OPS]:            { label: 'Supervisor de Operaciones', corto: 'Super',     area: 'EJECUTORES' },
  [ROLES.TECH]:           { label: 'Técnico',                  corto: 'Tech',       area: 'EJECUTORES' },
  [ROLES.SALES]:          { label: 'Ventas',                   corto: 'Ventas',     area: 'PROSPECTORES' },
  [ROLES.PM]:             { label: 'Gerente de Proyectos',     corto: 'Proyectos',  area: 'EJECUTORES' },
  [ROLES.PURCHASING]:     { label: 'Compras',                  corto: 'Compras',    area: 'ACTIVOS' },
  [ROLES.COLLABORATOR]:   { label: 'Colaborador',              corto: 'Colab',      area: null },

  [ROLES.HR]: {
    label: 'Jefe(a) de Talento Humano', corto: 'RH Jefe', area: 'INSTRUCTORES',
    descripcion: 'Supervisa toda el área. Aprueba la nómina, autoriza bajas y asigna roles.',
  },
  [ROLES.HR_RECRUITER]: {
    label: 'Contratación', corto: 'RH Contrat.', area: 'INSTRUCTORES', subarea: 'Contratación',
    descripcion: 'Vacantes y candidatos, alta de empleados, expediente, contratos y documentos de campo.',
  },
  [ROLES.HR_DEVELOPMENT]: {
    label: 'Desarrollo', corto: 'RH Desarr.', area: 'INSTRUCTORES', subarea: 'Desarrollo',
    descripcion: 'Capacitación, evaluación de desempeño, KPIs, incentivos, clima laboral y comunicados.',
  },
  [ROLES.HR_PAYROLL]: {
    label: 'Nómina y Personal', corto: 'RH Nómina', area: 'INSTRUCTORES', subarea: 'Contratación',
    descripcion: 'Asistencia, incidencias y vacaciones. Calcula la nómina; no la aprueba.',
  },
};

export const ROLES_RH = [ROLES.HR, ROLES.HR_RECRUITER, ROLES.HR_DEVELOPMENT, ROLES.HR_PAYROLL];

const { HR, HR_RECRUITER, HR_DEVELOPMENT, HR_PAYROLL } = ROLES;

/* Permiso → roles que lo tienen. ADMIN los tiene todos sin listarlo.
 *
 * Separación de funciones en la nómina: quien la captura (HR_PAYROLL) no puede
 * aprobarla ni marcarla pagada. */
export const PERMISOS = {
  // Módulo en general
  'rh.dashboard':          ROLES_RH,
  'rh.organigrama':        ROLES_RH,

  // Expediente: ver trae sueldo, banco, CURP y RFC.
  'rh.expediente.ver':     [HR, HR_RECRUITER, HR_PAYROLL],
  'rh.expediente.editar':  [HR, HR_RECRUITER],
  'rh.empleados.alta':     [HR, HR_RECRUITER],
  'rh.empleados.baja':     [HR],
  // Cambiar sueldo o datos bancarios de alguien que ya está dado de alta.
  'rh.sueldos.editar':     [HR, HR_PAYROLL],

  // Contratación
  'rh.reclutamiento':      [HR, HR_RECRUITER],
  'rh.docs_campo':         [HR, HR_RECRUITER],

  // Nómina y personal
  'rh.asistencia':         [HR, HR_PAYROLL],
  'rh.nomina.ver':         [HR, HR_PAYROLL],
  'rh.nomina.capturar':    [HR, HR_PAYROLL],
  'rh.nomina.aprobar':     [HR],

  // Desarrollo
  'rh.desempeno':          [HR, HR_DEVELOPMENT],
  'rh.capacitacion':       [HR, HR_DEVELOPMENT],
  'rh.clima':              [HR, HR_DEVELOPMENT],

  // Jefatura
  'rh.reportes':           [HR],
  'rh.configuracion':      [],

  /* EPP e inventario: se decidió que pertenece a Almacén (área Activos).
     Mientras ese rol no exista, lo sigue llevando la jefatura de RH para que
     nadie pierda acceso; al crear el rol de Almacén se cambia solo esta
     línea. */
  'almacen.epp':           [HR],
};

/** ¿Alguno de estos roles tiene el permiso? */
export function puede(roles, permiso) {
  const lista = Array.isArray(roles) ? roles : [roles];
  if (lista.includes(ROLES.ADMIN)) return true;
  const permitidos = PERMISOS[permiso];
  if (!permitidos) return false; // un permiso mal escrito niega, no abre
  return lista.some(r => permitidos.includes(r));
}

/** Roles con el permiso, ADMIN incluido. Para listas de menú. */
export function rolesCon(permiso) {
  return [ROLES.ADMIN, ...(PERMISOS[permiso] || [])];
}

/* ¿Puede este usuario dar o quitar ese rol?
 *
 * - ADMIN solo lo da un ADMIN.
 * - Los roles de RH solo los da la jefatura (o ADMIN): si Contratación
 *   pudiera, se daría a sí misma el de jefa.
 * - Los roles operativos (técnico, ventas…) los puede dar Contratación, que es
 *   quien da de alta a la gente nueva. */
export function puedeAsignarRol(rolesActor, rol) {
  const actor = Array.isArray(rolesActor) ? rolesActor : [rolesActor];
  if (actor.includes(ROLES.ADMIN)) return true;
  if (rol === ROLES.ADMIN) return false;
  if (ROLES_RH.includes(rol)) return actor.includes(ROLES.HR);
  return puede(actor, 'rh.empleados.alta');
}
