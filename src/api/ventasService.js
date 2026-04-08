// ─── Ventas & CRM Service ─── API persistence (por usuario en BD) ─────────────
import { apiFetch } from '@/lib/api';

// ── BITÁCORA ──────────────────────────────────────────────────────────────────
export const getBitacora = async () => {
  const res = await apiFetch('/api/sales-data?type=bitacora');
  if (!res.ok) return [];
  return res.json();
};

export const saveBitacoraEntry = async (entry) => {
  const method = entry.id ? 'PUT' : 'POST';
  const res = await apiFetch('/api/sales-data', {
    method,
    body: JSON.stringify({ type: 'bitacora', ...entry })
  });
  return res.ok ? res.json() : null;
};

export const deleteBitacoraEntry = async (id) => {
  await apiFetch('/api/sales-data', {
    method: 'DELETE',
    body: JSON.stringify({ type: 'bitacora', id })
  });
};

// ── REPORTE DIARIO ────────────────────────────────────────────────────────────
export const getReporte = async () => {
  const res = await apiFetch('/api/sales-data?type=reporte');
  if (!res.ok) return [];
  return res.json();
};

export const saveReporteEntry = async (entry) => {
  const method = entry.id ? 'PUT' : 'POST';
  const res = await apiFetch('/api/sales-data', {
    method,
    body: JSON.stringify({ type: 'reporte', ...entry })
  });
  return res.ok ? res.json() : null;
};

export const deleteReporteEntry = async (id) => {
  await apiFetch('/api/sales-data', {
    method: 'DELETE',
    body: JSON.stringify({ type: 'reporte', id })
  });
};

// ── CARTERA ───────────────────────────────────────────────────────────────────
export const getCartera = async () => {
  const res = await apiFetch('/api/sales-data?type=cartera');
  if (!res.ok) return [];
  return res.json();
};

export const saveCarteraEntry = async (entry) => {
  const method = entry.id ? 'PUT' : 'POST';
  const res = await apiFetch('/api/sales-data', {
    method,
    body: JSON.stringify({ type: 'cartera', ...entry })
  });
  return res.ok ? res.json() : null;
};

export const deleteCarteraEntry = async (id) => {
  await apiFetch('/api/sales-data', {
    method: 'DELETE',
    body: JSON.stringify({ type: 'cartera', id })
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// KPI CALCULATOR — misma lógica, ahora recibe arrays ya cargados
// ═══════════════════════════════════════════════════════════════════════════════
export const calcKPIs = (bitacora = [], reporte = [], cartera = []) => {

  const totalLlamadas     = reporte.reduce((s,r) => s+(r.llamadas||0),     0);
  const totalEfec         = reporte.reduce((s,r) => s+(r.efec||0),         0);
  const totalVisitasRep   = reporte.reduce((s,r) => s+(r.visitas||0),      0);
  const totalCierres      = reporte.reduce((s,r) => s+(r.cierres||0),      0);
  const totalCotizaciones = reporte.reduce((s,r) => s+(r.cotizaciones||0), 0);
  const totalVenta        = reporte.reduce((s,r) => s+(r.venta||0),        0);
  const totalCorreos      = reporte.reduce((s,r) => s+(r.correos||0),      0);
  const totalMensajes     = reporte.reduce((s,r) => s+(r.mensajes||0),     0);
  const totalDecisorR     = reporte.reduce((s,r) => s+(r.decisorR||0),     0);
  const totalDecisorF     = reporte.reduce((s,r) => s+(r.decisorFinal||0), 0);
  const totalVisitas      = totalVisitasRep + bitacora.length;

  const eficiencia     = totalLlamadas      ? Math.round((totalEfec/totalLlamadas)*100)         : 0;
  const ticketPromedio = totalCierres       ? Math.round(totalVenta/totalCierres)               : 0;
  const tasaCierre     = totalCotizaciones  ? Math.round((totalCierres/totalCotizaciones)*100)  : 0;
  const tasaContacto   = totalLlamadas      ? Math.round((totalDecisorF/totalLlamadas)*100)     : 0;
  const actividadTotal = totalLlamadas + totalCorreos + totalMensajes + totalVisitas;
  const diasActivos    = reporte.filter(r => (r.llamadas||0)+(r.visitas||0) > 0).length;
  const promLlamadasDia = diasActivos ? Math.round(totalLlamadas/diasActivos) : 0;
  const promVisitasDia  = diasActivos ? +(totalVisitas/diasActivos).toFixed(1) : 0;
  const promCotDia      = diasActivos ? +(totalCotizaciones/diasActivos).toFixed(2) : 0;
  const ventaEfec       = totalEfec ? Math.round(totalVenta/totalEfec) : 0;

  const convLlamadaEfec   = totalLlamadas     ? Math.round((totalEfec/totalLlamadas)*100)         : 0;
  const convEfecVisita    = totalEfec         ? Math.round((totalVisitasRep/totalEfec)*100)       : 0;
  const convVisitaDecisor = totalVisitasRep   ? Math.round((totalDecisorR/totalVisitasRep)*100)   : 0;
  const convDecisorCot    = totalDecisorF     ? Math.round((totalCotizaciones/totalDecisorF)*100) : 0;
  const convCotCierre     = totalCotizaciones ? Math.round((totalCierres/totalCotizaciones)*100)  : 0;

  const conPotencial   = bitacora.filter(b => b.potencial).length;
  const sinPotencial   = bitacora.filter(b => !b.potencial).length;
  const conDecisor     = bitacora.filter(b => b.decisor).length;
  const sinDecisor     = bitacora.filter(b => !b.decisor).length;
  const tasaPotencial  = bitacora.length ? Math.round((conPotencial/bitacora.length)*100) : 0;
  const tasaDecisorBit = bitacora.length ? Math.round((conDecisor/bitacora.length)*100)   : 0;

  const prospectos        = cartera.filter(c => c.tipo==='Prospecto').length;
  const clientes          = cartera.filter(c => c.tipo==='Cliente').length;
  const carteraConDecisor = cartera.filter(c => c.decisor).length;
  const tasaDecCartera    = cartera.length ? Math.round((carteraConDecisor/cartera.length)*100) : 0;

  // Agrupado por ejecutivo (usando seller.name si viene del servidor, o ejecutivo legacy)
  const ejNames = [...new Set([
    ...reporte.map(r => r.seller?.name || r.ejecutivo),
    ...bitacora.map(b => b.seller?.name || b.ejecutivo)
  ])].filter(Boolean);

  const porEjecutivo = ejNames.map(ej => {
    const rows = reporte.filter(r => (r.seller?.name || r.ejecutivo) === ej);
    const bits = bitacora.filter(b => (b.seller?.name || b.ejecutivo) === ej);
    const ll = rows.reduce((s,r)=>s+(r.llamadas||0),0);
    const ef = rows.reduce((s,r)=>s+(r.efec||0),0);
    const ci = rows.reduce((s,r)=>s+(r.cierres||0),0);
    const co = rows.reduce((s,r)=>s+(r.cotizaciones||0),0);
    const ve = rows.reduce((s,r)=>s+(r.venta||0),0);
    return {
      ejecutivo: ej, llamadas: ll, efectivas: ef,
      visitas: rows.reduce((s,r)=>s+(r.visitas||0),0) + bits.length,
      correos: rows.reduce((s,r)=>s+(r.correos||0),0),
      mensajes: rows.reduce((s,r)=>s+(r.mensajes||0),0),
      decisorR: rows.reduce((s,r)=>s+(r.decisorR||0),0),
      decisorF: rows.reduce((s,r)=>s+(r.decisorFinal||0),0),
      cotizaciones: co, cierres: ci, venta: ve,
      eficiencia: ll ? Math.round((ef/ll)*100) : 0,
      tasaCierre: co ? Math.round((ci/co)*100) : 0,
      ticket: ci ? Math.round(ve/ci) : 0,
      potencial: bits.filter(b=>b.potencial).length,
      decBit: bits.filter(b=>b.decisor).length,
    };
  });

  const semanas = [...new Set(reporte.map(r=>r.semana))].filter(Boolean).sort();
  const porSemana = semanas.map(sem => {
    const rows = reporte.filter(r => r.semana === sem);
    return {
      semana: sem.slice(5),
      llamadas: rows.reduce((s,r)=>s+(r.llamadas||0),0),
      efectivas: rows.reduce((s,r)=>s+(r.efec||0),0),
      visitas: rows.reduce((s,r)=>s+(r.visitas||0),0),
      cierres: rows.reduce((s,r)=>s+(r.cierres||0),0),
      cotizaciones: rows.reduce((s,r)=>s+(r.cotizaciones||0),0),
      venta: rows.reduce((s,r)=>s+(r.venta||0),0),
    };
  });

  const diasNombre = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const porDia = diasNombre.map(dia => {
    const rows = reporte.filter(r => r.dia === dia);
    return {
      dia: dia.slice(0,3),
      llamadas: rows.reduce((s,r)=>s+(r.llamadas||0),0),
      efectivas: rows.reduce((s,r)=>s+(r.efec||0),0),
      visitas: rows.reduce((s,r)=>s+(r.visitas||0),0),
      venta: rows.reduce((s,r)=>s+(r.venta||0),0),
      cierres: rows.reduce((s,r)=>s+(r.cierres||0),0),
    };
  }).filter(d => d.llamadas+d.visitas+d.venta > 0);

  return {
    totalLlamadas, totalEfec, totalVisitas, totalVisitasRep,
    totalCierres, totalCotizaciones, totalVenta,
    totalCorreos, totalMensajes, totalDecisorR, totalDecisorF,
    eficiencia, ticketPromedio, tasaCierre, tasaContacto,
    actividadTotal, diasActivos, promLlamadasDia, promVisitasDia,
    promCotDia, ventaEfec,
    convLlamadaEfec, convEfecVisita, convVisitaDecisor, convDecisorCot, convCotCierre,
    conPotencial, sinPotencial, conDecisor, sinDecisor,
    tasaPotencial, tasaDecisorBit, totalBitacora: bitacora.length,
    prospectos, clientes, carteraConDecisor, tasaDecCartera,
    totalCartera: cartera.length,
    porEjecutivo, porSemana, porDia,
  };
};
