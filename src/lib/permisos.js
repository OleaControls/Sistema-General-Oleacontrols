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

  // Prospectores — Comercial. La Asesoría Comercial es el `SALES` de siempre.
  PROS_JEFE:          'PROS_JEFE',
  PROS_PUBLICIDAD:    'PROS_PUBLICIDAD',
  PROS_MERCADOTECNIA: 'PROS_MERCADOTECNIA',
  PROS_PROSPECCION:   'PROS_PROSPECCION',
  PROS_ATENCION:      'PROS_ATENCION',

  // Experienciadores — Clientes y Servicios.
  EXP_JEFE:           'EXP_JEFE',
  EXP_RESIDENCIAL:    'EXP_RESIDENCIAL',
  EXP_COMERCIAL:      'EXP_COMERCIAL',
  EXP_SOPORTE:        'EXP_SOPORTE',
  EXP_ATENCION:       'EXP_ATENCION',
  EXP_SEGUIMIENTO:    'EXP_SEGUIMIENTO',
  EXP_EXPERIENCIA:    'EXP_EXPERIENCIA',

  // Activos — Administración y Finanzas. Compras es el `PURCHASING` de siempre.
  ACT_JEFE:           'ACT_JEFE',
  ACT_FINANZAS:       'ACT_FINANZAS',
  ACT_CONTABILIDAD:   'ACT_CONTABILIDAD',
  ACT_COSTOS:         'ACT_COSTOS',
  ACT_ALMACEN:        'ACT_ALMACEN',
  ACT_RECURSOS:       'ACT_RECURSOS',
};

/* Las cinco áreas de la empresa. Ejecutores todavía usa los roles operativos
 * de antes (Supervisor, Técnico, Gerente de Proyectos). */
export const AREAS = {
  PROSPECTORES:      { nombre: 'Prospectores',      subtitulo: 'Comercial',                             subareas: ['Publicidad', 'Mercadotecnia', 'Asesoría Comercial', 'Prospección', 'Atención a clientes'] },
  EXPERIENCIADORES:  { nombre: 'Experienciadores',  subtitulo: 'Clientes y Servicios',                  subareas: ['Residencial', 'Comercial', 'Soporte', 'Atención al cliente', 'Seguimiento de proyectos', 'Experiencia del cliente'] },
  ACTIVOS:           { nombre: 'Activos',           subtitulo: 'Administración y Finanzas',             subareas: ['Finanzas', 'Contabilidad', 'Costos', 'Compras', 'Almacén', 'Recursos materiales'] },
  EJECUTORES:        { nombre: 'Ejecutores',        subtitulo: 'Ingeniería',                            subareas: ['Procesos', 'Proyectos', 'Sistemas', 'Operaciones'] },
  INSTRUCTORES:      { nombre: 'Instructores',      subtitulo: 'Talento Humano',                        subareas: ['Desarrollo', 'Contratación'] },
};

/* Qué es cada rol, en palabras de la empresa. Lo usan las pantallas para
 * pintar la etiqueta y explicar el rol al asignarlo. */
export const ROL_INFO = {
  [ROLES.ADMIN]:          { label: 'Administrador',            corto: 'Admin',      area: null },
  [ROLES.OPS]:            { label: 'Supervisor de Operaciones', corto: 'Super',     area: 'EJECUTORES' },
  [ROLES.TECH]:           { label: 'Técnico',                  corto: 'Tech',       area: 'EJECUTORES' },
  [ROLES.SALES]:          { label: 'Asesoría Comercial',       corto: 'Asesoría',   area: 'PROSPECTORES', subarea: 'Asesoría Comercial',
                            descripcion: 'Vendedor: embudo, prospectos, clientes, cotizaciones y agenda. Ve solo lo suyo.' },
  [ROLES.PM]:             { label: 'Gerente de Proyectos',     corto: 'Proyectos',  area: 'EJECUTORES' },
  [ROLES.PURCHASING]:     { label: 'Compras',                  corto: 'Compras',    area: 'ACTIVOS', subarea: 'Compras',
                            descripcion: 'Órdenes de compra y proveedores. Captura y autoriza.' },
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

  // ── Prospectores ──
  [ROLES.PROS_JEFE]: {
    label: 'Jefe(a) de Prospectores', corto: 'Pros. Jefe', area: 'PROSPECTORES',
    descripcion: 'Ve todo el CRM del equipo: tratos, prospectos, cotizaciones y métricas de todos los vendedores.',
  },
  [ROLES.PROS_PUBLICIDAD]:    { label: 'Publicidad',    corto: 'Publicidad', area: 'PROSPECTORES', subarea: 'Publicidad',    descripcion: 'Acceso al CRM como vendedor: ve solo sus propios registros.' },
  [ROLES.PROS_MERCADOTECNIA]: { label: 'Mercadotecnia', corto: 'Mercadot.',  area: 'PROSPECTORES', subarea: 'Mercadotecnia', descripcion: 'Acceso al CRM como vendedor: ve solo sus propios registros.' },
  [ROLES.PROS_PROSPECCION]:   { label: 'Prospección',   corto: 'Prospecc.',  area: 'PROSPECTORES', subarea: 'Prospección',   descripcion: 'Acceso al CRM como vendedor: ve solo sus propios registros.' },
  [ROLES.PROS_ATENCION]:      { label: 'Atención a clientes (Comercial)', corto: 'Pros. Atenc.', area: 'PROSPECTORES', subarea: 'Atención a clientes', descripcion: 'Acceso al CRM como vendedor: ve solo sus propios registros.' },

  // ── Experienciadores ──
  [ROLES.EXP_JEFE]: {
    label: 'Jefe(a) de Experienciadores', corto: 'Exp. Jefe', area: 'EXPERIENCIADORES',
    descripcion: 'Supervisa la experiencia del cliente. Clientes, actividad y seguimiento, proyectos (consulta) y agenda de citas.',
  },
  [ROLES.EXP_RESIDENCIAL]: { label: 'Residencial',              corto: 'Residenc.',    area: 'EXPERIENCIADORES', subarea: 'Residencial',              descripcion: 'Clientes, actividad y seguimiento, proyectos (consulta) y agenda de citas.' },
  [ROLES.EXP_COMERCIAL]:   { label: 'Comercial (Servicio)',     corto: 'Exp. Comerc.', area: 'EXPERIENCIADORES', subarea: 'Comercial',                descripcion: 'Clientes, actividad y seguimiento, proyectos (consulta) y agenda de citas.' },
  [ROLES.EXP_SOPORTE]:     { label: 'Soporte',                  corto: 'Soporte',      area: 'EXPERIENCIADORES', subarea: 'Soporte',                  descripcion: 'Clientes, actividad y seguimiento, proyectos (consulta) y agenda de citas.' },
  [ROLES.EXP_ATENCION]:    { label: 'Atención al cliente',      corto: 'Atención',     area: 'EXPERIENCIADORES', subarea: 'Atención al cliente',      descripcion: 'Clientes, actividad y seguimiento, proyectos (consulta) y agenda de citas.' },
  [ROLES.EXP_SEGUIMIENTO]: { label: 'Seguimiento de proyectos', corto: 'Seguim.',      area: 'EXPERIENCIADORES', subarea: 'Seguimiento de proyectos', descripcion: 'Clientes, actividad y seguimiento, proyectos (consulta) y agenda de citas.' },
  [ROLES.EXP_EXPERIENCIA]: { label: 'Experiencia del cliente',  corto: 'Experiencia',  area: 'EXPERIENCIADORES', subarea: 'Experiencia del cliente',  descripcion: 'Clientes, actividad y seguimiento, proyectos (consulta) y agenda de citas.' },

  // ── Activos ──
  [ROLES.ACT_JEFE]: {
    label: 'Jefe(a) de Activos', corto: 'Act. Jefe', area: 'ACTIVOS',
    descripcion: 'Ve todo el área: gastos de toda la empresa, compras, proveedores, almacén y EPP. No autoriza compras ni aprueba gastos.',
  },
  [ROLES.ACT_FINANZAS]:     { label: 'Finanzas',            corto: 'Finanzas',  area: 'ACTIVOS', subarea: 'Finanzas',            descripcion: 'Consulta los gastos de toda la empresa y el control de gastos. No los aprueba.' },
  [ROLES.ACT_CONTABILIDAD]: { label: 'Contabilidad',        corto: 'Contab.',   area: 'ACTIVOS', subarea: 'Contabilidad',        descripcion: 'Consulta los gastos de toda la empresa y el control de gastos. No los aprueba.' },
  [ROLES.ACT_COSTOS]:       { label: 'Costos',              corto: 'Costos',    area: 'ACTIVOS', subarea: 'Costos',              descripcion: 'Consulta los gastos de toda la empresa y el control de gastos. No los aprueba.' },
  [ROLES.ACT_ALMACEN]:      { label: 'Almacén',             corto: 'Almacén',   area: 'ACTIVOS', subarea: 'Almacén',             descripcion: 'EPP e inventario, inventario de tiendas, y consulta de órdenes de compra y proveedores.' },
  [ROLES.ACT_RECURSOS]:     { label: 'Recursos materiales', corto: 'Rec. Mat.', area: 'ACTIVOS', subarea: 'Recursos materiales', descripcion: 'EPP e inventario, inventario de tiendas, y consulta de órdenes de compra y proveedores.' },
};

export const ROLES_RH = [ROLES.HR, ROLES.HR_RECRUITER, ROLES.HR_DEVELOPMENT, ROLES.HR_PAYROLL];

const {
  HR, HR_RECRUITER, HR_DEVELOPMENT, HR_PAYROLL,
  SALES, PURCHASING,
  PROS_JEFE, PROS_PUBLICIDAD, PROS_MERCADOTECNIA, PROS_PROSPECCION, PROS_ATENCION,
  EXP_JEFE, EXP_RESIDENCIAL, EXP_COMERCIAL, EXP_SOPORTE, EXP_ATENCION, EXP_SEGUIMIENTO, EXP_EXPERIENCIA,
  ACT_JEFE, ACT_FINANZAS, ACT_CONTABILIDAD, ACT_COSTOS, ACT_ALMACEN, ACT_RECURSOS,
} = ROLES;

export const ROLES_PROSPECTORES = [PROS_JEFE, SALES, PROS_PUBLICIDAD, PROS_MERCADOTECNIA, PROS_PROSPECCION, PROS_ATENCION];
export const ROLES_EXPERIENCIADORES = [EXP_JEFE, EXP_RESIDENCIAL, EXP_COMERCIAL, EXP_SOPORTE, EXP_ATENCION, EXP_SEGUIMIENTO, EXP_EXPERIENCIA];
export const ROLES_ACTIVOS = [ACT_JEFE, ACT_FINANZAS, ACT_CONTABILIDAD, ACT_COSTOS, PURCHASING, ACT_ALMACEN, ACT_RECURSOS];

/* Jefaturas de área: como la de RH, solo las da la jefatura de RH o ADMIN
 * (si las diera Contratación, cualquiera podría nombrarse jefe). */
export const JEFATURAS = [HR, PROS_JEFE, EXP_JEFE, ACT_JEFE];

/* Roles que heredan a otro rol existente.
 *
 * El CRM entero (menú y API) pregunta por 'SALES': un vendedor ve solo lo
 * suyo. Antes que reescribir esas comprobaciones, los puestos comerciales
 * nuevos "son SALES" para el sistema. El Jefe de Prospectores también lo
 * hereda para ver el módulo, pero con 'crm.ver_todo' se le quita la
 * restricción de "solo lo mío". */
export const HEREDA = {
  [PROS_JEFE]:          [SALES],
  [PROS_PUBLICIDAD]:    [SALES],
  [PROS_MERCADOTECNIA]: [SALES],
  [PROS_PROSPECCION]:   [SALES],
  [PROS_ATENCION]:      [SALES],
};

/** Los roles de la persona más los que heredan. Lo usan el menú y la API. */
export function rolesEfectivos(roles) {
  const lista = (Array.isArray(roles) ? roles : [roles]).filter(Boolean);
  const salida = new Set(lista);
  for (const r of lista) for (const h of HEREDA[r] || []) salida.add(h);
  return [...salida];
}

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

  /* EPP e inventario: se decidió que pertenece a Almacén (área Activos) y
     ahí vive desde que existe el rol. RH deja de llevarlo. */
  'almacen.epp':           [ACT_JEFE, ACT_ALMACEN, ACT_RECURSOS],

  // ── Prospectores ──
  // Entrar al CRM (embudo, prospectos, clientes, actividad). Los puestos de
  // Prospectores lo tienen porque heredan SALES.
  'crm.acceso':            [SALES],
  // Quita la restricción de "solo lo mío" que lleva SALES en el CRM.
  'crm.ver_todo':          [PROS_JEFE],

  // ── Experienciadores ──
  'exp.modulo':            ROLES_EXPERIENCIADORES,
  // CRM de servicio: clientes (ver, crear, editar) y consulta de tratos y
  // actividad. Sin borrar ni mover el embudo de ventas.
  'crm.clientes':          ROLES_EXPERIENCIADORES,
  // Proyectos en consulta: crear y editar sigue siendo del Gerente de Proyectos.
  'proyectos.ver':         ROLES_EXPERIENCIADORES,

  // ── Activos ──
  // Ver los gastos de todos, no solo los propios. Aprobar sigue siendo de
  // Operaciones (SUPERVISOR) y ADMIN.
  'gastos.ver_todo':       [ACT_JEFE, ACT_FINANZAS, ACT_CONTABILIDAD, ACT_COSTOS],
  // Consultar órdenes de compra y proveedores. Capturar y autorizar sigue
  // siendo de Compras (PURCHASING).
  'compras.ver':           [PURCHASING, ACT_JEFE, ACT_ALMACEN, ACT_RECURSOS],
  'almacen.inventario':    [ACT_JEFE, ACT_ALMACEN, ACT_RECURSOS],
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
 * - Los roles de RH y las jefaturas de área solo los da la jefatura de RH (o
 *   ADMIN): si Contratación pudiera, se daría a sí misma el de jefa.
 * - Los roles operativos (técnico, ventas…) los puede dar Contratación, que es
 *   quien da de alta a la gente nueva. */
export function puedeAsignarRol(rolesActor, rol) {
  const actor = Array.isArray(rolesActor) ? rolesActor : [rolesActor];
  if (actor.includes(ROLES.ADMIN)) return true;
  if (rol === ROLES.ADMIN) return false;
  if (ROLES_RH.includes(rol) || JEFATURAS.includes(rol)) return actor.includes(ROLES.HR);
  return puede(actor, 'rh.empleados.alta');
}
