import React, { useMemo, useState } from 'react';
import {
  Calculator, Save, Trash2, AlertTriangle, Loader2, Ruler, ChevronDown, Sigma,
  FileDown, Pencil, X,
} from 'lucide-react';
import projectService from '@/api/projectService';
import {
  SYSTEMS, SYSTEM_KEYS, BANDS, AREA_MIN, AREA_MAX, IVA_RATE, DEFAULT_UPDATE_FACTOR,
  calcQuote, formulaText, money,
} from '../utils/cotizador';
import { generateCotizacionPDF } from '../utils/cotizacionPDF';
import { cn } from '@/lib/utils';

// ── Tab "Cotizador" del detalle de proyecto ────────────────────────────────
// Calcula el precio de la ingeniería de diseño con el tabulador del Excel
// FORMA-AJAGC-PP y guarda cada partida cotizada contra el proyecto.
export default function CotizadorTab({ project, onChanged }) {
  const [systemKey, setSystemKey] = useState('DI');
  const [area, setArea] = useState('');
  const [updateFactor, setUpdateFactor] = useState(String(DEFAULT_UPDATE_FACTOR));
  const [localName, setLocalName] = useState('');
  const [notes, setNotes] = useState('');
  const [allowExtrapolation, setAllowExtrapolation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showScopes, setShowScopes] = useState(false);
  const [editingId, setEditingId] = useState(null);   // partida en edición
  const [exporting, setExporting] = useState(false);

  const system = SYSTEMS[systemKey];
  // `project` puede venir null cuando el cotizador se usa como página suelta
  // (nav lateral) sin haber elegido proyecto todavía: calcula pero no guarda.
  const quotes = project?.quotes || [];
  const canPersist = !!project?.id;

  const result = useMemo(
    () => calcQuote({ systemKey, area, updateFactor: Number(updateFactor) || 0, allowExtrapolation }),
    [systemKey, area, updateFactor, allowExtrapolation]
  );

  const touched = String(area).trim() !== '';
  const valid = touched && !result.error;

  const reset = () => {
    setArea('');
    // Vuelve a la actualización vigente: al salir de una partida vieja que se
    // cotizó con otro factor, la siguiente arranca con el de hoy.
    setUpdateFactor(String(DEFAULT_UPDATE_FACTOR));
    setLocalName('');
    setNotes('');
    setAllowExtrapolation(false);
    setEditingId(null);
  };

  const save = async () => {
    if (!valid || !canPersist) return;
    setSaving(true);
    try {
      // Solo los campos del modelo ProjectQuote — el handler no filtra extras.
      const payload = {
        localName: localName.trim() || null,
        systemKey: result.systemKey,
        systemLabel: result.systemLabel,
        area: result.area,
        band: result.band,
        coefficient: result.coefficient,
        basePrice: result.basePrice,
        updateFactor: result.updateFactor,
        subtotal: result.subtotal,
        ivaRate: result.ivaRate,
        iva: result.iva,
        total: result.total,
        extrapolated: result.extrapolated,
        notes: notes.trim() || null,
      };
      if (editingId) await projectService.updateItem('quotes', editingId, payload);
      else await projectService.addItem(project.id, 'quotes', payload);
      reset();
      onChanged();
    } catch (e) {
      alert(e.message || 'No se pudo guardar la partida.');
    } finally {
      setSaving(false);
    }
  };

  // Carga una partida guardada de vuelta en la calculadora.
  const edit = (q) => {
    setEditingId(q.id);
    setSystemKey(SYSTEMS[q.systemKey] ? q.systemKey : 'DI');
    setArea(String(q.area ?? ''));
    setUpdateFactor(String(q.updateFactor ?? 0));
    setLocalName(q.localName || '');
    setNotes(q.notes || '');
    setAllowExtrapolation(!!q.extrapolated);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar esta partida cotizada?')) return;
    await projectService.removeItem('quotes', id);
    if (editingId === id) reset();
    onChanged();
  };

  const exportPdf = async () => {
    setExporting(true);
    try { await generateCotizacionPDF(project); }
    catch (e) { alert(e.message || 'No se pudo generar el PDF.'); }
    finally { setExporting(false); }
  };

  const totals = quotes.reduce(
    (a, q) => ({
      subtotal: a.subtotal + (q.subtotal || 0),
      iva: a.iva + (q.iva || 0),
      total: a.total + (q.total || 0),
    }),
    { subtotal: 0, iva: 0, total: 0 }
  );

  return (
    <div className="space-y-6">
      {/* ── Selector de sistema ─────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
          Sistema a cotizar
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SYSTEM_KEYS.map(k => {
            const s = SYSTEMS[k];
            const active = k === systemKey;
            return (
              <button key={k} onClick={() => setSystemKey(k)}
                className={cn(
                  'text-left p-4 rounded-2xl border transition-all',
                  active
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-gray-200 hover:border-gray-300'
                )}>
                <p className={cn('text-[11px] font-black leading-tight', active ? 'text-primary' : 'text-gray-700')}>
                  {s.label}
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">{s.subtitle}</p>
                <p className="text-[9px] font-bold text-gray-300 mt-2 tabular-nums">
                  k · A {s.coef.A} · B {s.coef.B} · C {s.coef.C}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {/* ── Entradas ─────────────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-700">
              {editingId ? 'Editando partida' : 'Datos de la partida'}
            </h3>
            {editingId && (
              <button onClick={reset}
                className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-[9px] font-black uppercase tracking-wider text-gray-500 hover:text-gray-700">
                <X className="h-3 w-3" /> Cancelar
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Área del local [m²] *
              </label>
              <input type="number" min="1" step="0.01" value={area} placeholder={`${AREA_MIN} – ${AREA_MAX}`}
                onChange={(e) => setArea(e.target.value)} className="proj-input" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Actualización sobre 2006 [%]
              </label>
              <input type="number" step="0.1" value={updateFactor}
                onChange={(e) => setUpdateFactor(e.target.value)} className="proj-input" />
              <p className="text-[9px] font-bold text-gray-400 mt-1.5">
                Por inflación se aplica {DEFAULT_UPDATE_FACTOR}% por omisión. Puedes ajustarlo por partida.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Local / partida
              </label>
              <input value={localName} placeholder="Ej. Local 12 — Planta baja"
                onChange={(e) => setLocalName(e.target.value)} className="proj-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Notas
              </label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="proj-input" />
            </div>
          </div>

          {/* Tabla de rangos, como referencia visual */}
          <div className="flex flex-wrap gap-2 pt-1">
            {BANDS.map(b => (
              <span key={b.key}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border',
                  valid && result.band === b.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-gray-50 text-gray-400 border-gray-200'
                )}>
                Rango {b.key} · {b.label} · k={system.coef[b.key]}
              </span>
            ))}
          </div>

          {/* Aviso de fuera de rango */}
          {touched && result.outOfRange && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-[11px] font-bold text-amber-700 flex-1 min-w-56">{result.error}</p>
              <button onClick={() => setAllowExtrapolation(true)}
                className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-amber-600 transition-all">
                Calcular de todos modos
              </button>
            </div>
          )}
          {touched && result.error && !result.outOfRange && (
            <p className="text-[11px] font-black text-red-400 uppercase tracking-wider">{result.error}</p>
          )}
        </div>

        {/* ── Resultado ────────────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-700">Resultado</h3>
          </div>

          {!valid ? (
            <p className="text-[11px] font-bold text-gray-300 py-6 text-center">
              Ingresa el área para calcular.
            </p>
          ) : (
            <>
              {result.extrapolated && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                    Estimado extrapolado
                  </p>
                  <p className="text-[10px] font-bold text-amber-600 mt-1 leading-snug">
                    El área está fuera de {AREA_MIN}–{AREA_MAX} m². Se usó el coeficiente
                    del rango {result.band}; el precio no está validado por el tabulador.
                  </p>
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sigma className="h-3 w-3 text-gray-400" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fórmula</span>
                </div>
                <p className="text-[10px] font-bold text-gray-600 wrap-break-word tabular-nums">{formulaText(result)}</p>
              </div>

              <dl className="space-y-2 text-[11px] font-bold">
                <Row label={`Rango ${result.band}`} value={result.bandLabel} />
                <Row label="Coeficiente k" value={result.coefficient} />
                <Row label="Precio base 2006" value={money(result.basePrice)} />
                {result.updateFactor !== 0 && (
                  <Row label={`Actualización ${result.updateFactor > 0 ? '+' : ''}${result.updateFactor}%`} value="" />
                )}
                <Row label="Subtotal" value={money(result.subtotal)} strong />
                <Row label={`IVA ${(result.ivaRate * 100).toFixed(0)}%`} value={money(result.iva)} />
              </dl>

              <div className="pt-3 border-t border-gray-100 flex items-baseline justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                <span className="text-xl font-black text-primary tabular-nums">{money(result.total)}</span>
              </div>

              <button onClick={save} disabled={saving || !canPersist}
                title={canPersist ? undefined : 'Selecciona un proyecto para poder guardar'}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Actualizar partida' : 'Guardar partida'}
              </button>
              {!canPersist && (
                <p className="text-[10px] font-bold text-gray-400 text-center leading-snug">
                  Elige un proyecto arriba para guardar esta partida.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Alcances del sistema seleccionado ───────────────────────────── */}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <button onClick={() => setShowScopes(v => !v)}
          className="w-full flex items-center justify-between gap-3 p-6 text-left">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-700">
              Alcances · {system.label}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
              Texto original de la hoja «{system.sheet}» del cotizador
            </p>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform shrink-0', showScopes && 'rotate-180')} />
        </button>
        {showScopes && (
          <div className="px-6 pb-6 space-y-4">
            {system.intro.map((p, i) => (
              <p key={i} className="text-[11px] font-bold text-gray-500 leading-relaxed">{p}</p>
            ))}
            <ol className="space-y-3">
              {system.scopes.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 h-5 w-5 rounded-lg bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-gray-700 leading-relaxed">{s.text}</p>
                    {s.note && (
                      <p className="text-[10px] font-semibold text-gray-400 leading-relaxed mt-1.5 pl-3 border-l-2 border-gray-200">
                        {s.note}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* ── Partidas guardadas ──────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-700">
            Partidas cotizadas ({quotes.length})
          </h3>
          <button onClick={exportPdf} disabled={exporting || quotes.length === 0 || !canPersist}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Descargar PDF
          </button>
        </div>

        {quotes.length === 0 ? (
          <p className="text-[11px] font-bold text-gray-300 py-6 text-center">
            {canPersist ? 'Aún no hay partidas guardadas.' : 'Selecciona un proyecto para guardar partidas.'}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-208 text-left">
              <thead>
                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                  <th className="pb-2 pr-3">Local</th>
                  <th className="pb-2 pr-3">Sistema</th>
                  <th className="pb-2 pr-3 text-right">Área</th>
                  <th className="pb-2 pr-3 text-center">Rango</th>
                  <th className="pb-2 pr-3 text-right">Base</th>
                  <th className="pb-2 pr-3 text-right">Subtotal</th>
                  <th className="pb-2 pr-3 text-right">IVA</th>
                  <th className="pb-2 pr-3 text-right">Total</th>
                  <th className="pb-2 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map(q => (
                  <tr key={q.id}
                    className={cn('text-[11px] font-bold text-gray-600', editingId === q.id && 'bg-primary/5')}>
                    <td className="py-2.5 pr-3 text-gray-800">
                      {q.localName || '—'}
                      {q.extrapolated && (
                        <span className="ml-2 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[8px] font-black uppercase tracking-wider">
                          Estimado
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">{q.systemLabel}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{q.area} m²</td>
                    <td className="py-2.5 pr-3 text-center">{q.band}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-gray-400">{money(q.basePrice)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(q.subtotal)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-gray-400">{money(q.iva)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-black text-gray-900">{money(q.total)}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => edit(q)} title="Editar partida"
                        className="p-1 text-gray-300 hover:text-primary">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(q.id)} title="Eliminar partida"
                        className="p-1 text-gray-300 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-[11px] font-black text-gray-900 border-t-2 border-gray-200">
                  <td className="pt-3 pr-3 uppercase tracking-wider text-[9px] text-gray-400" colSpan={5}>
                    Total del proyecto
                  </td>
                  <td className="pt-3 pr-3 text-right tabular-nums">{money(totals.subtotal)}</td>
                  <td className="pt-3 pr-3 text-right tabular-nums text-gray-400">{money(totals.iva)}</td>
                  <td className="pt-3 pr-3 text-right tabular-nums text-primary">{money(totals.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="text-[10px] font-semibold text-gray-400 mt-5 leading-relaxed">
          Precios en moneda nacional, base tabulador de octubre de 2006 (Grupo Forma)
          actualizado {DEFAULT_UPDATE_FACTOR}% por inflación,
          más {(IVA_RATE * 100).toFixed(0)}% de I.V.A. El tabulador cubre áreas de {AREA_MIN} a {AREA_MAX} m²
          y cotiza únicamente la ingeniería de diseño; no incluye suministro, instalación ni viáticos.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-gray-400">{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'text-gray-900 font-black' : 'text-gray-700')}>{value}</dd>
    </div>
  );
}
