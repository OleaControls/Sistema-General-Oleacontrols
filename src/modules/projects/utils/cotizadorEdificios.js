// ═══════════════════════════════════════════════════════════════════════════
// COTIZADOR DE EDIFICIOS (implementación)
// A diferencia del cotizador de retail —que cotiza ingeniería de diseño por m²
// con el tabulador de Grupo Forma— aquí se escoge el sistema y se capturan sus
// partidas, que solo sirven para contar dispositivos:
//
//   partida            = descripción + número de dispositivos
//   equipos            = TOTAL de dispositivos × costo por proyecto del sistema
//   subtotal (sistema) = equipos × factor
//   total    (sistema) = subtotal + IVA
//
// Cada sistema cierra su propia cotización con esos tres renglones, de modo que
// se puede vender suelto; la cotización del edificio es la unión de todas: sus
// totales se suman renglón por renglón (equipos, subtotal, IVA y total).
//
// El costo por proyecto se aplica una sola vez sobre el total de dispositivos;
// las partidas no llevan costo propio.
//
// El costo por proyecto es fijo por sistema (lo que se cobra por proyecto de
// ese sistema). El factor de 0.7 es el vigente y sí es editable en la
// calculadora, por si un proyecto se cierra con otro.
// ═══════════════════════════════════════════════════════════════════════════

export const IVA_RATE = 0.16;

// Factor que se aplica al costo total de equipos.
export const DEFAULT_FACTOR = 0.7;

// Costo por proyecto de cada sistema. Fijo: no se edita desde la calculadora.
export const SISTEMAS = [
  { key: 'CCTV', label: 'Cámaras',               unit: 'cámara',      projectCost: 9093 },
  { key: 'CA',   label: 'Control de Acceso',     unit: 'acceso',      projectCost: 13300 },
  { key: 'DI',   label: 'Detección de Incendio', unit: 'dispositivo', projectCost: 1512 },
  { key: 'VZDT', label: 'Voz y Datos',           unit: 'nodo',        projectCost: 22500 },
  { key: 'SA',   label: 'Sonido Ambiental',      unit: 'altavoz',     projectCost: 1200.95 },
];

export const SISTEMA_KEYS = SISTEMAS.map(s => s.key);

export const getSistema = (key) => SISTEMAS.find(s => s.key === key) || SISTEMAS[0];

// Redondeo a centavos, hacia arriba en el empate: 1200.95 × 0.7 = 840.665 → 840.67.
// El +EPSILON cubre los casos en que el error binario deja el valor apenas por
// debajo del medio centavo.
export const round2 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
};

// Los campos numéricos se guardan como texto mientras se escriben: un valor
// vacío o a medio teclear cuenta como 0 en lugar de romper el total.
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/**
 * Cotiza el edificio a partir de las partidas capturadas en cada sistema.
 *
 * @param {object} opts
 * @param {Record<string, Array<{id?:string, description?:string, qty?:number|string}>>} opts.linesBySystem
 *        Partidas por clave de sistema.
 * @param {number} [opts.factor=DEFAULT_FACTOR]
 * @param {number} [opts.ivaRate=IVA_RATE]
 */
export function calcEdificio({
  linesBySystem = {},
  factor = DEFAULT_FACTOR,
  ivaRate = IVA_RATE,
} = {}) {
  const f = num(factor, DEFAULT_FACTOR);

  const systems = SISTEMAS.map(s => {
    // Las cantidades son dispositivos completos: 2.5 cámaras no existe.
    const rows = (linesBySystem[s.key] || []).map(p => ({ ...p, qty: Math.floor(num(p.qty)) }));
    const equipos = rows.reduce((a, r) => a + r.qty, 0);
    // El costo por proyecto multiplica el total del sistema, no cada partida.
    const equipmentCost = round2(equipos * s.projectCost);
    // Cada sistema se cierra como una cotización completa para poder venderlo
    // suelto; el edificio no es más que la suma de estas.
    const subtotal = round2(equipmentCost * f);
    const iva = round2(subtotal * ivaRate);
    return {
      ...s,
      rows,
      partidas: rows.length,
      equipos,
      equipmentCost,
      factor: f,
      subtotal,
      ivaRate,
      iva,
      total: round2(subtotal + iva),
    };
  });

  // Solo los sistemas con dispositivos capturados entran al desglose y a la suma.
  const bySystem = systems.filter(s => s.equipos > 0);
  const sum = (pick) => round2(bySystem.reduce((a, s) => a + pick(s), 0));

  // Se suman los totales ya redondeados de cada sistema —no se recalcula sobre
  // el gran total— para que la cotización unida cuadre contra las sueltas.
  const equipmentCost = sum(s => s.equipmentCost);
  const subtotal = sum(s => s.subtotal);
  const iva = sum(s => s.iva);

  return {
    systems,
    bySystem,
    factor: f,
    equipos: bySystem.reduce((a, s) => a + s.equipos, 0),
    partidas: bySystem.reduce((a, s) => a + s.partidas, 0),
    equipmentCost,
    subtotal,
    ivaRate,
    iva,
    total: sum(s => s.total),
  };
}

export const money = (n) =>
  `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
