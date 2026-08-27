/* Documentación que un técnico necesita traer vigente para entrar a sitio.
   Este catálogo lo comparten el frontend y `api/_handlers/tech-docs.js`, que
   valida contra las mismas claves. Si se agrega un tipo, basta con sumarlo aquí
   y espejar la clave en el handler. */

export const FIELD_DOC_TYPES = [
  { key: 'DC3',              label: 'DC-3 (constancia de competencias)', required: true  },
  { key: 'IMSS',             label: 'Alta IMSS vigente',                 required: true  },
  { key: 'INE',              label: 'Identificación oficial',            required: true  },
  { key: 'EXAMEN_MEDICO',    label: 'Examen médico',                     required: true  },
  { key: 'POLIZA_SEGURO',    label: 'Póliza de seguro',                  required: false },
  { key: 'CURSO_ALTURAS',    label: 'Curso de trabajo en alturas',       required: false },
  { key: 'CARTA_RESPONSIVA', label: 'Carta responsiva',                  required: false },
];

export const FIELD_DOC_KEYS = FIELD_DOC_TYPES.map(t => t.key);

export const fieldDocLabel = (key) =>
  FIELD_DOC_TYPES.find(t => t.key === key)?.label || key;

/** Días de anticipación con los que un documento empieza a marcarse por vencer. */
export const DIAS_AVISO_VENCIMIENTO = 30;

export const DOC_STATUS = {
  VIGENTE:    { label: 'Vigente',    tone: 'ok',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  POR_VENCER: { label: 'Por vencer', tone: 'warn',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  VENCIDO:    { label: 'Vencido',    tone: 'bad',   cls: 'bg-red-50 text-red-700 border-red-200' },
  FALTANTE:   { label: 'Faltante',   tone: 'bad',   cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

/**
 * Estado de un documento. Un documento sin fecha de vencimiento se considera
 * vigente: hay papeles (como la INE) que no caducan para este propósito.
 * @param {{expiresAt?: string|Date|null}|null|undefined} doc
 */
export function estadoDocumento(doc, hoy = new Date()) {
  if (!doc || !doc.url) return 'FALTANTE';
  if (!doc.expiresAt) return 'VIGENTE';
  const vence = new Date(doc.expiresAt);
  if (Number.isNaN(vence.getTime())) return 'VIGENTE';
  const dias = Math.ceil((vence - hoy) / 86400000);
  if (dias < 0) return 'VENCIDO';
  if (dias <= DIAS_AVISO_VENCIMIENTO) return 'POR_VENCER';
  return 'VIGENTE';
}

/**
 * Resume el expediente de un técnico contra el catálogo.
 * @param {Array} docs documentos del técnico
 * @returns {{items: Array, faltantes: number, vencidos: number, porVencer: number, alerta: boolean}}
 */
export function resumenExpediente(docs = [], hoy = new Date()) {
  const porTipo = new Map();
  // Si hay varios del mismo tipo, gana el de vencimiento más lejano.
  for (const d of docs) {
    const prev = porTipo.get(d.type);
    if (!prev) { porTipo.set(d.type, d); continue; }
    const a = prev.expiresAt ? new Date(prev.expiresAt).getTime() : Infinity;
    const b = d.expiresAt ? new Date(d.expiresAt).getTime() : Infinity;
    if (b > a) porTipo.set(d.type, d);
  }

  const items = FIELD_DOC_TYPES.map(t => {
    const doc = porTipo.get(t.key) || null;
    return { ...t, doc, status: estadoDocumento(doc, hoy) };
  });

  const cuenta = (s) => items.filter(i => i.required && i.status === s).length;
  const faltantes = cuenta('FALTANTE');
  const vencidos  = cuenta('VENCIDO');
  const porVencer = cuenta('POR_VENCER');

  return { items, faltantes, vencidos, porVencer, alerta: faltantes + vencidos > 0 };
}
