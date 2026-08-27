import { SYSTEMS, AREA_MIN, AREA_MAX } from './cotizador';
import { renderQuotePDF, vigenciaDias, slug } from './cotizacionLayout';

// PDF de la cotización de ingeniería de diseño (tab Cotizador del proyecto).
// Usa el MISMO formato que el cotizador del CRM —el dibujo vive en
// cotizacionLayout.js— y aquí solo se traducen las partidas del tabulador
// FORMA-AJAGC-PP a la forma de una cotización.
//
// Cada partida cotizada es un renglón de la tabla (local + sistema + área) y su
// precio ya trae la actualización por inflación, así que Cantidad 1 × Precio
// Unit. da el importe de la partida y la suma cuadra con el recuadro de totales.
// Los alcances de cada sistema van en OBSERVACIONES, que se pagina solo.

/** Texto de alcances de los sistemas realmente cotizados. */
function alcancesDe(keys) {
  const bloques = [];
  for (const key of keys) {
    const s = SYSTEMS[key];
    if (!s) continue;
    const lineas = [`${s.label.toUpperCase()}`];
    for (const p of s.intro) lineas.push(p);
    lineas.push('Alcances:');
    s.scopes.forEach((sc, i) => {
      lineas.push(`${i + 1}. ${sc.text}`);
      if (sc.note) lineas.push(`    ${sc.note}`);
    });
    bloques.push(lineas.join('\n'));
  }
  return bloques.join('\n\n');
}

/**
 * Genera el PDF de la cotización de un proyecto.
 * @param {object} project  Proyecto con su relación `quotes`.
 * @param {{download?:boolean, returnDataUri?:boolean}} opts
 */
export async function generateCotizacionPDF(project, { download = true, returnDataUri = false } = {}) {
  const quotes = project.quotes || [];
  if (quotes.length === 0) throw new Error('No hay partidas cotizadas para exportar.');

  const totals = quotes.reduce(
    (a, q) => ({
      subtotal: a.subtotal + (q.subtotal || 0),
      iva: a.iva + (q.iva || 0),
      total: a.total + (q.total || 0),
    }),
    { subtotal: 0, iva: 0, total: 0 }
  );

  const items = quotes.map(q => ({
    serial: q.band,
    name: q.localName || 'Partida',
    desc: [
      `${q.systemLabel} · ${q.area} m² · rango ${q.band}`,
      q.extrapolated ? 'estimado extrapolado, precio sujeto a revisión' : null,
      q.notes || null,
    ].filter(Boolean).join(' · '),
    qty: 1,
    price: q.subtotal,
  }));

  const usados = [...new Set(quotes.map(q => q.systemKey))].filter(k => SYSTEMS[k]);
  const ivaPct = quotes[0]?.ivaRate != null ? (quotes[0].ivaRate * 100).toFixed(0) : '16';
  const extrapoladas = quotes.some(q => q.extrapolated);

  const terms = [
    'Los precios son en moneda nacional y están vigentes a la fecha de emisión de esta cotización.',
    `Precios más ${ivaPct}% de I.V.A.`,
    `Base tabulador de octubre de 2006 (Grupo Forma) actualizado por inflación; aplica a locales de ${AREA_MIN} a ${AREA_MAX} m².`,
    'Comprende únicamente la ingeniería de diseño; no incluye suministro ni instalación de equipo.',
    'No incluye viáticos en caso de obra foránea.',
  ].join('\n');

  const observations = [
    extrapoladas
      ? `Algunas partidas se estimaron por extrapolación: su área queda fuera del tabulador (${AREA_MIN}–${AREA_MAX} m²) y el precio está sujeto a revisión.`
      : null,
    alcancesDe(usados),
  ].filter(Boolean).join('\n\n');

  const quote = {
    quoteNumber: project.code || `DIS-${slug(project.name).slice(0, 12).toUpperCase()}`,
    createdAt: new Date(),
    validUntil: vigenciaDias(30),
    templateType: 'PRESUPUESTO',
    client: { companyName: project.clientName || 'Cliente' },
    contactName: '',
    projectName: project.name || '—',
    creator: { name: project.managerName || '—' },
    seller: { name: project.sponsor || project.managerName || 'No asignado' },
    requirements: (project.requirements && project.requirements.trim())
      || `Ingeniería de diseño para ${quotes.length} partida(s): ${usados.map(k => SYSTEMS[k].label).join(', ')}.`,
    terms,
    observations,
    benefits: '',
    items,
    subtotal: totals.subtotal,
    adjustment: 0,
    tax: totals.iva,
    total: totals.total,
  };

  const fileName = `Cotizacion-${slug(project.code) || 'proyecto'}.pdf`;
  return renderQuotePDF(quote, { fileName, download, returnDataUri });
}
