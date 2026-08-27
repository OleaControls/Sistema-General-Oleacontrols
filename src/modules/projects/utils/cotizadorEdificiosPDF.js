import { money } from './cotizadorEdificios';
import { renderQuotePDF, fmtMXN, vigenciaDias, slug } from './cotizacionLayout';

// PDF del cotizador de edificios (Proyectos › Implementación).
// Usa el MISMO formato que el cotizador del CRM: el dibujo vive en
// cotizacionLayout.js y aquí solo se traduce el cálculo del edificio a la forma
// de una cotización (conceptos, subtotal, IVA y total).
//
// El mapeo al recuadro de totales:
//   Subtotal        = Σ (dispositivos × precio unitario ya con el factor)
//   Impuesto (IVA)  = IVA sobre ese subtotal
//   INVERSIÓN TOTAL = subtotal + IVA
// Lo que se cobra es el diseño del proyecto por equipo, así que el factor va
// dentro del precio unitario y no como un renglón de promoción aparte: la
// suma de la tabla es el subtotal, y el total es subtotal + IVA, sin ajustes
// intermedios que el cliente tenga que interpretar.

// Folio de la calculadora: no vive en base de datos, así que se arma con la
// fecha y la hora para que dos cotizaciones del mismo día no se confundan.
function folio(systemLabel) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const sello = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  return systemLabel ? `EDIF-${slug(systemLabel).toUpperCase()}-${sello}` : `EDIF-${sello}`;
}

/**
 * Genera el PDF de la cotización de un edificio.
 *
 * @param {object} result  Salida de `calcEdificio`.
 * @param {object} [opts]
 * @param {string} [opts.building]     Nombre del edificio (va como proyecto).
 * @param {string} [opts.client]       Cliente.
 * @param {string} [opts.creatorName]  Quién la elabora.
 * @param {string} [opts.systemKey]    Exporta solo ese sistema, para venderlo suelto.
 * @param {string} [opts.terms]        Términos y condiciones; vacío = los de por omisión.
 * @param {string} [opts.observations] Observaciones; vacío = el desglose por sistema.
 * @param {boolean} [opts.download=true]
 * @param {boolean} [opts.returnDataUri=false]
 */
export async function generateEdificioPDF(result, {
  building = '',
  client = '',
  creatorName = '',
  systemKey = null,
  terms: termsInput = '',
  observations: observationsInput = '',
  download = true,
  returnDataUri = false,
} = {}) {
  const systems = systemKey
    ? result.systems.filter(s => s.key === systemKey && s.equipos > 0)
    : result.bySystem;

  if (systems.length === 0) {
    throw new Error(systemKey
      ? 'Este sistema no tiene dispositivos capturados.'
      : 'No hay dispositivos capturados para exportar.');
  }

  const solo = systems.length === 1 && !!systemKey;

  // Los totales se suman de los sistemas que se están imprimiendo: al exportar
  // uno solo, la hoja cuadra contra su propia cotización.
  const sum = (k) => systems.reduce((a, s) => a + (s[k] || 0), 0);
  const subtotal = sum('subtotal');
  const iva = sum('iva');
  const total = sum('total');
  const equipos = sum('equipos');

  // Un renglón por partida capturada. La columna de descripción dice solo el
  // sistema y el número de partida ("Cámaras — partida 1"): el detalle del
  // cálculo vive en Observaciones, no dentro de la tabla.
  //
  // El precio unitario se saca del subtotal del sistema entre sus dispositivos
  // —no de projectCost × factor— para que la suma de la columna Total dé
  // exactamente el subtotal del recuadro. Multiplicar y redondear por separado
  // dejaba diferencias de centavos entre la tabla y los totales.
  const items = [];
  for (const s of systems) {
    const unitPrice = s.equipos ? s.subtotal / s.equipos : 0;
    s.rows.forEach((r, i) => {
      if (!r.qty) return;
      items.push({
        serial: s.key,
        name: `${s.label} — partida ${i + 1}`,
        qty: r.qty,
        price: unitPrice,
      });
    });
  }

  // Desglose por sistema: cada uno es una cotización cerrada que se puede
  // entregar suelta, y el edificio es la suma de todas.
  //
  // Ojo con los caracteres: el PDF usa las fuentes estándar de jsPDF, que
  // codifican en WinAnsi. La flecha "→" no existe ahí y al imprimirse se
  // convierte en DOS glifos, así que el renglón sale más ancho de lo que se
  // midió al partirlo y se desborda de la hoja. Con "=" y "·" no pasa.
  const desglose = systems.map(s => {
    const unit = s.equipos ? s.subtotal / s.equipos : 0;
    return `• ${s.label}: ${s.equipos} ${s.unit}${s.equipos === 1 ? '' : 's'} × ${money(unit)} `
      + `= ${money(s.subtotal)} + I.V.A. ${money(s.iva)} = ${money(s.total)}`;
  });

  const observationsDefault = [
    solo
      ? `Cotización del sistema ${systems[0].label}. Puede integrarse con los demás sistemas del edificio en una sola cotización.`
      : `El edificio se cotiza por sistema y la suma de los ${systems.length} sistemas da el total. Cada sistema se puede entregar como cotización independiente:`,
    ...desglose,
    '',
    `Subtotal ${money(subtotal)} + I.V.A. ${money(iva)} = ${money(total)}.`,
  ].join('\n');

  // Renglones cortos a propósito: los términos se imprimen en la columna
  // angosta que queda a la izquierda del recuadro de totales, y una línea
  // larga se parte a media frase.
  const termsDefault = [
    'Precios en moneda nacional, vigentes a la fecha de emisión de esta cotización.',
    `Precios más ${(result.ivaRate * 100).toFixed(0)}% de I.V.A.`,
    'Se cobra el diseño del proyecto por cada equipo del sistema.',
    `El precio unitario ya incluye el factor ${result.factor}.`,
    'No incluye obra civil, canalización mayor ni viáticos en obra foránea.',
  ].join('\n');

  // Lo que se capture en la calculadora manda; si se deja vacío se imprime el
  // texto de por omisión, que se recalcula con el factor y el IVA vigentes.
  const terms = termsInput.trim() || termsDefault;
  const observations = observationsInput.trim() || observationsDefault;

  const quote = {
    quoteNumber: folio(solo ? systems[0].label : null),
    createdAt: new Date(),
    validUntil: vigenciaDias(30),
    templateType: 'PRESUPUESTO',
    client: { companyName: client.trim() || 'Cliente' },
    contactName: '',
    projectName: building.trim()
      ? (solo ? `${building.trim()} — ${systems[0].label}` : building.trim())
      : (solo ? `Cotizador de edificios — ${systems[0].label}` : 'Cotizador de edificios'),
    creator: { name: creatorName || '—' },
    seller: { name: creatorName || 'No asignado' },
    requirements: solo
      ? `${systems[0].label}: ${equipos} ${systems[0].unit}${equipos === 1 ? '' : 's'} de implementación.`
      : `Implementación de ${systems.length} sistema(s) con ${equipos} dispositivos en total (${systems.map(s => s.label).join(', ')}).`,
    terms,
    observations,
    benefits: '',
    items,
    subtotal,
    // El factor ya está dentro del precio unitario, así que no hay ajuste que
    // mostrar: el recuadro queda en Subtotal + IVA = Inversión total.
    adjustment: 0,
    tax: iva,
    total,
  };

  const nombre = slug(building) || 'edificio';
  const fileName = solo
    ? `Cotizacion-${slug(systems[0].label)}-${nombre}.pdf`
    : `Cotizacion-Edificio-${nombre}.pdf`;

  // Sin la hoja de "Motivos para elegir con confianza": esta cotización es de
  // ingeniería y se entrega a un cliente que ya escogió.
  return renderQuotePDF(quote, { fileName, download, returnDataUri, showBenefits: false });
}

export { fmtMXN };
