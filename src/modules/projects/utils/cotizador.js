// ═══════════════════════════════════════════════════════════════════════════
// COTIZADOR DE PROYECTOS (ingeniería de diseño)
// Motor de cálculo portado desde el libro Excel
// "FORMA-AJAGC-PP_COTIZADOR DE PROYECTOS.xls" (Grupo Forma, octubre 2006).
//
// El Excel original tiene una hoja por sistema (IE - DI, IE - VZDT, IE - SA,
// IE - CA-I-CCTV) y en cada una tres calculadoras independientes, una por
// rango de área. Aquí se unifica en un solo input: el rango se deduce del área.
//
// Fórmula original (celda F15/F16/F17 de cada hoja):
//     = ROUNDUP( k * 1000 * LN(area) , -1 )
//
// donde k depende del sistema y del rango de área, y ROUNDUP(_, -1) redondea
// hacia arriba a la decena de pesos.
// ═══════════════════════════════════════════════════════════════════════════

// El archivo de 2006 declara 15% de IVA; se actualiza a la tasa vigente.
export const IVA_RATE = 0.16;

// Actualización por inflación que se aplica por omisión al precio base de 2006.
// 150 → el subtotal es 2.5× el tabulador original. Se usa solo como valor
// inicial de la calculadora: cada partida guarda el factor con el que se cotizó,
// así que las partidas históricas conservan el suyo.
export const DEFAULT_UPDATE_FACTOR = 150;

// Rangos de área soportados por el tabulador, de mayor a menor.
// Tomados de la validación de la columna E:
//   =IF(AND(D15>250.99999999, D15<500.0000019), "Área Correcta", ...)
export const BANDS = [
  { key: 'A', min: 251, max: 500, label: '251 a 500 m²' },
  { key: 'B', min: 151, max: 250, label: '151 a 250 m²' },
  { key: 'C', min: 60,  max: 150, label: '060 a 150 m²' },
];

export const AREA_MIN = 60;
export const AREA_MAX = 500;

// Nota que en el Excel aparece como párrafo suelto debajo del punto
// "Planos preliminares (anteproyecto)".
const NOTA_PLANOS =
  'El número de planos por definir en los proyectos arquitectónicos, el precio ' +
  'asume que las instalaciones estarán comprendidas en un solo nivel; incluyendo ' +
  'tapancos o techumbres y áreas menores a altura definida sobre el nivel ' +
  'principal, los anteriores no serán considerados como un segundo nivel.';

// Puntos 4, 5 y 6 son idénticos en las cuatro hojas.
const CIERRE_COMUN = [
  { text: 'Memoria Descriptiva.' },
  { text: 'Entrega de proyecto final. En ambos formatos: digital e impreso.' },
  {
    text:
      'Dos visitas a obra en total para aclaración de dudas sobre el proyecto ' +
      'elaborado por sus servidores, al ejecutarse la misma. El precio No incluye ' +
      'viáticos al tratarse de obra foránea.',
  },
];

const juntasYPlanos = () => [
  { text: 'Juntas de coordinación de proyecto (2).' },
  { text: 'Planos preliminares (anteproyecto).', note: NOTA_PLANOS },
];

// ── Sistemas cotizables ────────────────────────────────────────────────────
// Los coeficientes `k` salen literalmente de las fórmulas de cada hoja.
// Los botones "EXTINCIÓN DE INCENDIO" y "ELÉCTRICO" de la portada del Excel
// no tienen hoja de cálculo, por eso no aparecen aquí.
export const SYSTEMS = {
  DI: {
    key: 'DI',
    sheet: 'IE - DI',
    label: 'Detección de Incendio',
    subtitle: 'Alarma contra incendio',
    coef: { A: 0.75, B: 0.67, C: 0.60 },
    intro: [
      'Incluye la elaboración de las ingenierías y memorias de cálculo para los locales comerciales.',
      // El Excel original dice aquí "sistema sonoro": es copy-paste de la hoja
      // IE - SA. Se corrige porque este párrafo se imprime en el PDF al cliente.
      'Consistente en el diseño del sistema de detección de incendio, planos de distribución de equipos, cableado y tuberías para el correcto desempeño del sistema.',
    ],
    scopes: [
      ...juntasYPlanos(),
      {
        text:
          'Diseño del sistema basado en desempeño, funcionalidad y aplicación, ' +
          'detectores de humo, flama, temperatura, incremento, según se requiera; ' +
          'dispositivos audibles, visuales, de inicio, planos de distribución de ' +
          'equipos, cableado y tuberías, detalles de fijación e instalación de equipos.',
      },
      ...CIERRE_COMUN,
    ],
  },

  VZDT: {
    key: 'VZDT',
    sheet: 'IE - VZDT',
    label: 'Voz y Datos',
    subtitle: 'Telefonía y red de datos',
    coef: { A: 0.92, B: 0.73, C: 0.51 },
    intro: [
      'Incluye la elaboración de las ingenierías y memorias de cálculo para los locales comerciales para el proyecto de telefonía y datos.',
      'Consistente en el diseño del sistema en la elaboración, diseño, cálculo de la ductería y cableado para los sistemas de voz (telefonía) y red de datos del local comercial.',
    ],
    scopes: [
      ...juntasYPlanos(),
      {
        text:
          'Diseño de líneas telefónicas y red de datos para salidas directas, ' +
          'extensiones, líneas públicas (nodos), cuarto de telecomunicaciones y ' +
          'fibra óptica (en caso de ser necesario) comprendidos en cableado ' +
          'estructurado certificado.',
      },
      ...CIERRE_COMUN,
    ],
  },

  SA: {
    key: 'SA',
    sheet: 'IE - SA',
    label: 'Sonido Ambiental',
    subtitle: 'Sistema sonoro',
    coef: { A: 0.77, B: 0.6429, C: 0.61 },
    intro: [
      'Incluye la elaboración de las ingenierías y memorias de cálculo para los locales comerciales.',
      'Consistente en el diseño del sistema sonoro, planos de distribución de equipos, cableado y tuberías para el correcto desempeño del sistema.',
    ],
    scopes: [
      ...juntasYPlanos(),
      {
        text:
          'Diseño del sistema sonoro, diagrama de bloques funcional, planos de ' +
          'distribución de equipos, cableado y tuberías, detalles de fijación e ' +
          'instalación de equipos.',
      },
      ...CIERRE_COMUN,
    ],
  },

  CAICCTV: {
    key: 'CAICCTV',
    sheet: 'IE - CA-I-CCTV',
    label: 'Control de Acceso, Intrusión y CCTV',
    subtitle: 'Seguridad integral',
    coef: { A: 0.89, B: 0.81, C: 0.70 },
    intro: [
      'Incluye la elaboración de las ingenierías, memoria descriptiva y de cálculo, el cual comprende: A) CIRCUITO CERRADO DE TELEVISIÓN, B) CONTROL DE ACCESO y C) SISTEMA DE INTRUSIÓN local o remoto, para los locales comerciales.',
      'Consistente en la elaboración, diseño, cálculo de la ductería, cableado y especificación de equipo, según condiciones proyectadas y depuradas, para la funcionalidad de los locales.',
    ],
    scopes: [
      ...juntasYPlanos(),
      {
        text:
          'Diseño del sistema de seguridad integral al igual que el despliegue de ' +
          'cada dispositivo con el objetivo de salvaguardar vidas, prevenir robo, ' +
          'robo por empleados, asalto, identificación de empleados, y/o reducir o ' +
          'evitar cualquier vulnerabilidad en seguridad, tanto en el interior como ' +
          'en el exterior del inmueble.',
      },
      ...CIERRE_COMUN,
    ],
  },
};

export const SYSTEM_KEYS = Object.keys(SYSTEMS);

// ── Helpers de cálculo ─────────────────────────────────────────────────────

// Equivalente a ROUNDUP(n, -1) de Excel: sube a la decena.
// El epsilon evita que el ruido binario de LN() empuje un valor exacto
// (p. ej. 3000.0000000001) a la decena siguiente.
export function roundUpTo10(n) {
  return Math.ceil((n - 1e-9) / 10) * 10;
}

// Rango que corresponde al área, o null si cae fuera del tabulador (60–500 m²).
export function bandFor(area) {
  return BANDS.find(b => area >= b.min && area <= b.max) || null;
}

// Rango más cercano, usado solo cuando se pide extrapolar fuera de tabulador.
function nearestBand(area) {
  return area < AREA_MIN ? BANDS[BANDS.length - 1] : BANDS[0];
}

/**
 * Calcula el precio de la ingeniería de diseño para un sistema y un área.
 *
 * @param {object}  opts
 * @param {string}  opts.systemKey  Clave en SYSTEMS (DI, VZDT, SA, CAICCTV).
 * @param {number}  opts.area       Área en m².
 * @param {number} [opts.updateFactor=0]  % de actualización sobre el precio
 *                                        base de 2006 (ej. 35 → +35%). La UI
 *                                        arranca en DEFAULT_UPDATE_FACTOR.
 * @param {number} [opts.ivaRate=IVA_RATE]
 * @param {boolean}[opts.allowExtrapolation=false]  Permite calcular fuera de
 *                                        60–500 m² usando el rango más cercano.
 *                                        El resultado se marca `extrapolated`.
 * @returns {object} resultado con `error` si no se pudo calcular.
 */
export function calcQuote({
  systemKey,
  area,
  updateFactor = 0,
  ivaRate = IVA_RATE,
  allowExtrapolation = false,
}) {
  const system = SYSTEMS[systemKey];
  if (!system) return { error: 'Sistema no válido.' };

  const m2 = Number(area);
  if (!Number.isFinite(m2) || m2 <= 0) {
    return { error: 'Ingresa un área válida en m².' };
  }

  let band = bandFor(m2);
  let extrapolated = false;

  if (!band) {
    if (!allowExtrapolation) {
      return {
        error:
          `El tabulador solo cubre de ${AREA_MIN} a ${AREA_MAX} m². ` +
          'Un área fuera de ese rango requiere cotización especial.',
        outOfRange: true,
      };
    }
    band = nearestBand(m2);
    extrapolated = true;
  }

  const k = system.coef[band.key];

  // Fórmula del Excel, tal cual.
  const raw = k * 1000 * Math.log(m2);
  const basePrice = roundUpTo10(raw);

  // Actualización sobre el precio base de 2006. Se vuelve a redondear a la
  // decena para mantener la convención del tabulador.
  const factor = 1 + Number(updateFactor || 0) / 100;
  const subtotal = roundUpTo10(basePrice * factor);

  const iva = subtotal * ivaRate;
  const total = subtotal + iva;

  return {
    systemKey,
    systemLabel: system.label,
    area: m2,
    band: band.key,
    bandLabel: band.label,
    coefficient: k,
    raw,
    basePrice,
    updateFactor: Number(updateFactor || 0),
    subtotal,
    ivaRate,
    iva,
    total,
    extrapolated,
    error: null,
  };
}

// Texto legible de la fórmula aplicada, para mostrar en la UI y en el PDF.
export function formulaText(result) {
  if (!result || result.error) return '';
  const { coefficient, area, raw, basePrice } = result;
  return `ROUNDUP(${coefficient} × 1000 × ln(${area}), -1) = ROUNDUP(${raw.toFixed(2)}) = ${basePrice}`;
}

export const money = (n) =>
  `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
