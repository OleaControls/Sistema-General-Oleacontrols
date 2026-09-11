/* Reglas de compras — fuente única, usada por el navegador y por la API.
 *
 * El servidor manda: los totales que envía el navegador nunca se guardan tal
 * cual, se recalculan con estas mismas funciones en
 * api/_handlers/purchase-orders.js. El formulario las usa para mostrar en vivo
 * exactamente lo que se va a guardar.
 *
 * Vive en src/ y no en api/_lib/ por el servidor de desarrollo: Vite hace
 * proxy de todo /api al backend en el 3001, así que un módulo servido desde
 * /api/_lib/... se iría al Express y volvería 404. api/_lib/compras.js
 * reexporta este archivo para que los handlers lo importen con su ruta de
 * siempre.
 *
 * Es JS puro, sin dependencias ni APIs de navegador, para poder correr de los
 * dos lados.
 */

// ── Estados ────────────────────────────────────────────────────────────────
export const PO_STATUS_KEYS = [
  'BORRADOR', 'SOLICITADA', 'EN_REVISION', 'APROBADA', 'ENVIADA',
  'RECIBIDA', 'FACTURADA', 'PAGADA', 'RECHAZADA', 'CANCELADA',
];

/** Avance normal. Rechazar y cancelar van por su propia acción. */
export const PO_FLOW = [
  'BORRADOR', 'SOLICITADA', 'EN_REVISION', 'APROBADA',
  'ENVIADA', 'RECIBIDA', 'FACTURADA', 'PAGADA',
];

/** Estado siguiente en el flujo, o null si ya no avanza. */
export function siguienteEstado(status) {
  const i = PO_FLOW.indexOf(status);
  if (i === -1 || i === PO_FLOW.length - 1) return null;
  return PO_FLOW[i + 1];
}

/** Una orden cerrada ya no se edita ni cambia de estado. */
export const PO_CERRADAS = ['PAGADA', 'RECHAZADA', 'CANCELADA'];

/** Las partidas solo se tocan mientras la orden no está autorizada. */
export const PO_EDITABLES = ['BORRADOR', 'SOLICITADA', 'EN_REVISION', 'RECHAZADA'];

// ── Política de autorización ───────────────────────────────────────────────
// Tramos por monto total. El último exige que una de las firmas sea de
// Dirección (ADMIN).
export const TRAMOS_AUTORIZACION = [
  { hasta: 5000,     firmas: 1, requiereDireccion: false, label: 'Hasta $5,000' },
  { hasta: 25000,    firmas: 2, requiereDireccion: false, label: 'De $5,001 a $25,000' },
  { hasta: Infinity, firmas: 2, requiereDireccion: true,  label: 'Más de $25,000' },
];

export function tramoDe(total) {
  const t = Number(total) || 0;
  return TRAMOS_AUTORIZACION.find(x => t <= x.hasta) || TRAMOS_AUTORIZACION[TRAMOS_AUTORIZACION.length - 1];
}

export const firmasRequeridas   = (total) => tramoDe(total).firmas;
export const requiereDireccion  = (total) => tramoDe(total).requiereDireccion;

// ── Cálculo de importes ────────────────────────────────────────────────────

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Redondeo a centavos: sin esto la suma de partidas no cuadra con el total. */
export const centavos = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Calcula una partida. El impuesto se aplica sobre el importe ya descontado,
 * que es como lo emite el SAT y como lo espera el proveedor.
 */
export function calcularPartida(item) {
  const quantity  = num(item.quantity);
  const unitPrice = num(item.unitPrice);
  const discount  = num(item.discount);
  const taxRate   = num(item.taxRate);

  const bruto = centavos(quantity * unitPrice);
  const base  = centavos(Math.max(0, bruto - discount));
  const tax   = centavos(base * taxRate);

  return { quantity, unitPrice, discount, taxRate, base, tax, total: centavos(base + tax) };
}

/**
 * Totales de la orden. `adjustment` es el ajuste manual (puede ser negativo)
 * que cierra diferencias de redondeo contra la cotización del proveedor.
 */
export function calcularTotales(items = [], adjustment = 0) {
  let subtotal = 0, discount = 0, tax = 0;

  for (const it of items) {
    const c = calcularPartida(it);
    subtotal += centavos(c.quantity * c.unitPrice);
    discount += c.discount;
    tax      += c.tax;
  }

  subtotal = centavos(subtotal);
  discount = centavos(discount);
  tax      = centavos(tax);
  const adj = centavos(adjustment);

  return { subtotal, discount, tax, adjustment: adj, total: centavos(subtotal - discount + tax + adj) };
}

// ── Permisos ───────────────────────────────────────────────────────────────
export const ROL_COMPRAS = 'PURCHASING';

const tiene = (roles, r) => Array.isArray(roles) && roles.includes(r);

/** Entrar al módulo. */
export const puedeVerCompras = (roles = []) => tiene(roles, ROL_COMPRAS) || tiene(roles, 'ADMIN');

/** Crear y editar órdenes. */
export const puedeEditarCompras = (roles = []) => tiene(roles, ROL_COMPRAS) || tiene(roles, 'ADMIN');

/**
 * Autorizar. Compras firma como primera autorización; Dirección (ADMIN) firma
 * siempre y es la única que cubre el requisito de los montos altos.
 */
export const puedeAutorizar = (roles = []) => tiene(roles, ROL_COMPRAS) || tiene(roles, 'ADMIN');

/** ¿Esta firma cuenta como Dirección? */
export const esDireccion = (roles = []) => tiene(roles, 'ADMIN');

// ── Etiquetas y colores (solo UI; el servidor no los usa) ──────────────────
export const PO_STATUS = {
  BORRADOR:    { label: 'Borrador',             short: 'Borrador',   cls: 'bg-slate-100 text-slate-600 border-slate-200',       dot: 'bg-slate-400'   },
  SOLICITADA:  { label: 'Solicitada',           short: 'Solicitada', cls: 'bg-blue-50 text-blue-600 border-blue-200',           dot: 'bg-blue-500'    },
  EN_REVISION: { label: 'En revisión',          short: 'Revisión',   cls: 'bg-indigo-50 text-indigo-600 border-indigo-200',     dot: 'bg-indigo-500'  },
  APROBADA:    { label: 'Aprobada',             short: 'Aprobada',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500' },
  ENVIADA:     { label: 'Enviada al proveedor', short: 'Enviada',    cls: 'bg-cyan-50 text-cyan-700 border-cyan-200',           dot: 'bg-cyan-500'    },
  RECIBIDA:    { label: 'Recibida',             short: 'Recibida',   cls: 'bg-teal-50 text-teal-700 border-teal-200',           dot: 'bg-teal-500'    },
  FACTURADA:   { label: 'Facturada',            short: 'Facturada',  cls: 'bg-violet-50 text-violet-700 border-violet-200',     dot: 'bg-violet-500'  },
  PAGADA:      { label: 'Pagada',               short: 'Pagada',     cls: 'bg-green-100 text-green-800 border-green-300',       dot: 'bg-green-600'   },
  RECHAZADA:   { label: 'Rechazada',            short: 'Rechazada',  cls: 'bg-red-50 text-red-600 border-red-200',              dot: 'bg-red-500'     },
  CANCELADA:   { label: 'Cancelada',            short: 'Cancelada',  cls: 'bg-gray-100 text-gray-500 border-gray-200',          dot: 'bg-gray-400'    },
};

export const poStatusMeta = (s) => PO_STATUS[s] || PO_STATUS.BORRADOR;

/** Formato de dinero para pantalla y PDF. */
export const money = (n, currency = 'MXN') =>
  `$${(Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`;

/** Formas de pago del selector. */
export const FORMAS_PAGO = [
  'Transferencia', 'Cheque', 'Efectivo', 'Tarjeta empresarial', 'Crédito 15 días',
  'Crédito 30 días', 'Crédito 60 días',
];

export const MONEDAS = ['MXN', 'USD', 'EUR'];
