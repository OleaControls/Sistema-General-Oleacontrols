// ═══════════════════════════════════════════════════════════════════════════
// REGLAS DE NEGOCIO DEL SISTEMA GENERAL
// Catálogos y reglas que comparten Proyectos, Asignaciones y Supervisión, para
// que el tipo de proyecto, la prioridad y la anticipación signifiquen lo mismo
// en todas las pantallas.
//
// El flujo que sostienen estas reglas:
//   CLIENTE → PROYECTO → TIPO → ZONA → ASIGNACIÓN → TÉCNICO → RECURSOS →
//   ACTIVIDAD → EVIDENCIA → SUPERVISIÓN → CIERRE
// ═══════════════════════════════════════════════════════════════════════════

// ── Tipo operativo del proyecto ────────────────────────────────────────────
// Distinto del embudo comercial (serviceType). Manda los días de anticipación
// con los que hay que dejar asignado el trabajo.
export const PROJECT_TYPES = {
  TIENDA: {
    label: 'Tienda', leadDays: 3,
    cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500',
    hint: 'Atención recurrente a una sucursal.',
  },
  MANTENIMIENTO: {
    label: 'Mantenimiento', leadDays: 5,
    cls: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500',
    hint: 'Preventivo o correctivo programado.',
  },
  IMPLEMENTACION: {
    label: 'Implementación', leadDays: 10,
    cls: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500',
    hint: 'Obra nueva: requiere material y cuadrilla.',
  },
  DISENO: {
    label: 'Diseño', leadDays: 15,
    cls: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', dot: 'bg-fuchsia-500',
    hint: 'Ingeniería de diseño previa a la obra.',
  },
};
export const PROJECT_TYPE_KEYS = Object.keys(PROJECT_TYPES);
export const normalizeType = (t) => (PROJECT_TYPES[t] ? t : 'IMPLEMENTACION');
export const typeMeta = (t) => PROJECT_TYPES[normalizeType(t)];

// ── Prioridad ──────────────────────────────────────────────────────────────
export const PRIORITIES = {
  BAJA:    { label: 'Baja',    rank: 0, cls: 'bg-gray-50 text-gray-500 border-gray-200',        dot: 'bg-gray-400' },
  MEDIA:   { label: 'Media',   rank: 1, cls: 'bg-blue-50 text-blue-600 border-blue-200',        dot: 'bg-blue-500' },
  ALTA:    { label: 'Alta',    rank: 2, cls: 'bg-orange-50 text-orange-600 border-orange-200',  dot: 'bg-orange-500' },
  CRITICA: { label: 'Crítica', rank: 3, cls: 'bg-red-50 text-red-600 border-red-200',           dot: 'bg-red-500' },
};
export const PRIORITY_KEYS = Object.keys(PRIORITIES);
export const normalizePriority = (p) => (PRIORITIES[p] ? p : 'MEDIA');
export const priorityMeta = (p) => PRIORITIES[normalizePriority(p)];

// Prioridad de las OT (LOW/MEDIUM/HIGH/URGENT) leída con el mismo lenguaje.
const OT_PRIORITY_ALIAS = { LOW: 'BAJA', MEDIUM: 'MEDIA', HIGH: 'ALTA', URGENT: 'CRITICA' };
export const otPriorityMeta = (p) => priorityMeta(OT_PRIORITY_ALIAS[p] || p);

// ── Actividad de la asignación ─────────────────────────────────────────────
export const ACTIVITIES = {
  INSTALACION:   { label: 'Instalación' },
  MANTENIMIENTO: { label: 'Mantenimiento' },
  VISITA:        { label: 'Visita' },
  DIAGNOSTICO:   { label: 'Diagnóstico' },
  ITERACION:     { label: 'Iteración' },
  SUPERVISION:   { label: 'Supervisión' },
  CAPACITACION:  { label: 'Capacitación' },
  ENTREGA:       { label: 'Entrega' },
};
export const ACTIVITY_KEYS = Object.keys(ACTIVITIES);
export const activityLabel = (a) => ACTIVITIES[a]?.label || a || '—';

// ── Zonas ──────────────────────────────────────────────────────────────────
// El catálogo es abierto: la zona se escribe y el sistema aprende las que ya
// se usaron. Así no hay que mantener un alta de zonas antes de operar.
export const zonesFrom = (...lists) => {
  const set = new Set();
  for (const list of lists) {
    for (const item of list || []) {
      const z = (item?.zone || '').trim();
      if (z) set.add(z);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
};

// ── Fechas ─────────────────────────────────────────────────────────────────
const DAY = 86400000;

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Días naturales entre dos fechas (negativo = ya pasó).
export const daysBetween = (from, to) =>
  Math.round((startOfDay(to) - startOfDay(from)) / DAY);

export const daysUntil = (date) => (date ? daysBetween(new Date(), new Date(date)) : null);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—';

export const fmtDateLong = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// "en 3 días" / "hace 2 días" / "hoy"
export const relDays = (n) => {
  if (n === null || n === undefined) return '—';
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  return n > 0 ? `en ${n} días` : `hace ${Math.abs(n)} días`;
};

// ── Regla de anticipación de asignaciones ──────────────────────────────────
// Cada tipo de proyecto exige dejar el trabajo asignado con cierta antelación.
// `leadDays` del proyecto gana sobre el del tipo, para los casos negociados.
export const leadDaysFor = (project) => {
  const own = Number(project?.leadDays);
  return Number.isFinite(own) && own > 0 ? own : typeMeta(project?.projectType).leadDays;
};

// Fecha contra la que se mide: el compromiso con el cliente; si no hay, el
// arranque planeado.
export const targetDateOf = (project) => project?.dueDate || project?.startDate || project?.endDate || null;

export const WINDOW_STATUS = {
  ASIGNADO:  { label: 'Asignado',        cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', rank: 0 },
  EN_TIEMPO: { label: 'En tiempo',       cls: 'bg-gray-50 text-gray-500 border-gray-200',          rank: 1 },
  SIN_FECHA: { label: 'Sin fecha',       cls: 'bg-gray-50 text-gray-400 border-gray-200',          rank: 2 },
  POR_ABRIR: { label: 'Por abrir',       cls: 'bg-blue-50 text-blue-600 border-blue-200',          rank: 3 },
  URGENTE:   { label: 'Asignar ya',      cls: 'bg-amber-50 text-amber-700 border-amber-200',       rank: 4 },
  VENCIDO:   { label: 'Fuera de tiempo', cls: 'bg-red-50 text-red-600 border-red-200',             rank: 5 },
};

/**
 * ¿Este proyecto ya debería tener asignaciones?
 *
 * @param {object} project  Proyecto con projectType, dueDate/startDate,
 *                          leadDays y openAssignments (del panel).
 * @returns {{status:string, lead:number, daysLeft:number|null, opensIn:number|null, target:Date|null}}
 */
export function assignmentWindow(project) {
  const lead = leadDaysFor(project);
  const target = targetDateOf(project);
  const asignadas = Number(project?.openAssignments || 0);

  if (!target) {
    return { status: asignadas > 0 ? 'ASIGNADO' : 'SIN_FECHA', lead, daysLeft: null, opensIn: null, target: null };
  }

  const daysLeft = daysUntil(target);
  if (asignadas > 0) return { status: 'ASIGNADO', lead, daysLeft, opensIn: null, target: new Date(target) };
  if (daysLeft < 0)  return { status: 'VENCIDO',  lead, daysLeft, opensIn: null, target: new Date(target) };
  // Dentro de la ventana y sin nadie asignado: es lo que el gerente debe mover hoy.
  if (daysLeft <= lead) return { status: 'URGENTE', lead, daysLeft, opensIn: 0, target: new Date(target) };
  return { status: 'POR_ABRIR', lead, daysLeft, opensIn: daysLeft - lead, target: new Date(target) };
}

// Ordena poniendo primero lo que exige acción del gerente.
export const byWindowUrgency = (a, b) => {
  const wa = assignmentWindow(a), wb = assignmentWindow(b);
  const ra = WINDOW_STATUS[wa.status]?.rank ?? 0;
  const rb = WINDOW_STATUS[wb.status]?.rank ?? 0;
  if (ra !== rb) return rb - ra;
  return (wa.daysLeft ?? 9999) - (wb.daysLeft ?? 9999);
};

// Proyecto próximo a vencer: quedan `within` días o menos para el compromiso
// y todavía no está cerrado.
export const isDueSoon = (project, within = 7) => {
  const target = targetDateOf(project);
  if (!target) return false;
  if (Number(project?.progress) >= 100) return false;
  const d = daysUntil(target);
  return d !== null && d <= within;
};

// Teléfono listo para marcar desde el navegador o el celular.
export const telHref = (phone) => {
  const clean = String(phone || '').replace(/[^\d+]/g, '');
  return clean ? `tel:${clean}` : null;
};
