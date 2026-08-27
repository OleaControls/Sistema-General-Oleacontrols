import React, { useMemo, useRef, useState } from 'react';
import {
  Building2, RotateCcw, Camera, DoorOpen, Flame, Network, Volume2, Package,
  Plus, Trash2, Sigma, FileDown, Loader2, FileText,
} from 'lucide-react';
import {
  SISTEMAS, IVA_RATE, DEFAULT_FACTOR, calcEdificio, money,
} from '../utils/cotizadorEdificios';
import { generateEdificioPDF } from '../utils/cotizadorEdificiosPDF';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

// ── Cotizador de Edificios (nav: Proyectos › Implementación) ───────────────
// Se escoge el sistema arriba y abajo se capturan sus partidas de equipo
// (descripción + número de equipos). Al final se suma el costo de equipos de
// todos los sistemas y se multiplica por el factor.
// No guarda partidas contra un proyecto: es estimación en pantalla.

const ICONS = {
  CCTV: Camera,
  CA: DoorOpen,
  DI: Flame,
  VZDT: Network,
  SA: Volume2,
};

export default function CotizadorEdificiosView() {
  const { user } = useAuth();
  const [systemKey, setSystemKey] = useState(SISTEMAS[0].key);
  const [linesBySystem, setLinesBySystem] = useState({});
  const [factor, setFactor] = useState(String(DEFAULT_FACTOR));
  // Solo viajan al PDF: la calculadora no guarda nada contra un proyecto.
  const [building, setBuilding] = useState('');
  const [client, setClient] = useState('');
  // Términos y observaciones de esta cotización. Vacíos = el PDF imprime los
  // textos de por omisión, que se arman con el factor y el IVA vigentes.
  const [terms, setTerms] = useState('');
  const [observations, setObservations] = useState('');
  const [exporting, setExporting] = useState(null);   // 'ALL' | clave del sistema
  const nextId = useRef(1);

  const result = useMemo(
    () => calcEdificio({ linesBySystem, factor: Number(factor) }),
    [linesBySystem, factor]
  );

  const current = result.systems.find(s => s.key === systemKey);

  const setLines = (fn) =>
    setLinesBySystem(prev => ({ ...prev, [systemKey]: fn(prev[systemKey] || []) }));

  const addPartida = () =>
    setLines(ls => [...ls, { id: `p${nextId.current++}`, description: '', qty: '1' }]);

  const patch = (id, p) => setLines(ls => ls.map(x => (x.id === id ? { ...x, ...p } : x)));
  const remove = (id) => setLines(ls => ls.filter(x => x.id !== id));

  const reset = () => {
    setLinesBySystem({});
    setFactor(String(DEFAULT_FACTOR));
    setBuilding('');
    setClient('');
    setTerms('');
    setObservations('');
  };

  // Sin `systemKey` exporta el edificio completo; con él, ese sistema suelto.
  const exportPdf = async (systemKey = null) => {
    setExporting(systemKey || 'ALL');
    try {
      await generateEdificioPDF(result, {
        building, client, systemKey, terms, observations,
        creatorName: user?.name || '',
      });
    } catch (e) {
      alert(e.message || 'No se pudo generar el PDF.');
    } finally {
      setExporting(null);
    }
  };

  const vacio = result.bySystem.length === 0;
  const pct = result.factor * 100;

  return (
    <div className="w-full space-y-6">
      <CotizadorEdificiosStyle />

      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <header className="bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                Proyectos · Implementación
              </span>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                Cotizador de Edificios
              </h1>
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                Equipos × costo por proyecto, por factor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => exportPdf()} disabled={vacio || !!exporting}
              title={vacio ? 'Captura partidas para poder exportar' : undefined}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-40">
              {exporting === 'ALL'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileDown className="h-3.5 w-3.5" />}
              Descargar PDF
            </button>
            <button onClick={reset} disabled={vacio && factor === String(DEFAULT_FACTOR)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40">
              <RotateCcw className="h-3.5 w-3.5" /> Limpiar
            </button>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Edificio
              </label>
              <input value={building} placeholder="Ej. Torre Reforma"
                onChange={(e) => setBuilding(e.target.value)} className="proj-input" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Cliente
              </label>
              <input value={client} placeholder="Ej. Grupo Inmobiliario"
                onChange={(e) => setClient(e.target.value)} className="proj-input" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Factor sobre el costo de equipos
              </label>
              <input type="number" step="0.01" min="0" value={factor}
                onChange={(e) => setFactor(e.target.value)} className="proj-input" />
            </div>
          </div>
          <p className="text-[10px] font-bold text-gray-400 leading-snug max-w-2xl">
            El factor equivale al <span className="text-gray-600">{pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}%</span> del
            costo de equipos y da el subtotal. Por omisión {DEFAULT_FACTOR}; cámbialo si el
            proyecto se cierra con otro y todo se recalcula.
            El edificio y el cliente solo se imprimen en el PDF.
          </p>
        </div>
      </header>

      {/* ── 1. Sistema ───────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
          Sistema
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {result.systems.map(s => {
            const Icon = ICONS[s.key] || Package;
            const active = s.key === systemKey;
            return (
              <button key={s.key} onClick={() => setSystemKey(s.key)}
                className={cn(
                  'text-left p-4 rounded-2xl border transition-all',
                  active
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-gray-200 hover:border-gray-300'
                )}>
                <Icon className={cn('h-4 w-4 mb-2', active ? 'text-primary' : 'text-gray-300')} />
                <p className={cn('text-[11px] font-black leading-tight', active ? 'text-primary' : 'text-gray-700')}>
                  {s.label}
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1 tabular-nums">
                  {money(s.projectCost)} / proyecto
                </p>
                {s.equipos > 0 && (
                  <div className="mt-1.5">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider tabular-nums">
                      {s.equipos} disp. · {money(s.equipmentCost)} equipos
                    </p>
                    <p className="text-[11px] font-black text-gray-900 tabular-nums leading-tight">
                      {money(s.total)}
                      <span className="text-[8px] font-black text-gray-300 uppercase tracking-wider ml-1">
                        total c/IVA
                      </span>
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Equipos del sistema ───────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-700">
              Equipos · {current.label}
            </h3>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider tabular-nums">
              {money(current.projectCost)} por {current.unit}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportPdf(current.key)}
              disabled={current.equipos === 0 || !!exporting}
              title={current.equipos === 0 ? 'Captura dispositivos en este sistema' : undefined}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40">
              {exporting === current.key
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileDown className="h-3.5 w-3.5" />}
              PDF del sistema
            </button>
            <button onClick={addPartida}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all">
              <Plus className="h-3.5 w-3.5" /> Agregar partida
            </button>
          </div>
        </div>

        {current.rows.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[11px] font-bold text-gray-300">
              Sin partidas en {current.label}.
            </p>
            <p className="text-[10px] font-bold text-gray-300 mt-1">
              Agrega una partida y captura su descripción y número de equipos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-112 text-left">
              <thead>
                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                  <th className="pb-2 pr-3">Descripción</th>
                  <th className="pb-2 pr-3 w-32 text-center">Dispositivos</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {current.rows.map(r => (
                  <tr key={r.id} className="text-[11px] font-bold text-gray-700">
                    <td className="py-2.5 pr-3">
                      <input value={r.description}
                        placeholder={`Ej. ${current.label} — planta baja`}
                        onChange={(e) => patch(r.id, { description: e.target.value })}
                        className="proj-input py-2" />
                    </td>
                    <td className="py-2.5 pr-3">
                      <input type="number" min="0" step="1" placeholder="0" value={r.qty}
                        onChange={(e) => patch(r.id, { qty: e.target.value })}
                        className="proj-input py-2 text-center" />
                    </td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => remove(r.id)} title="Quitar partida"
                        className="p-1 text-gray-300 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-[11px] font-black text-gray-900 border-t-2 border-gray-200">
                  <td className="pt-3 pr-3 uppercase tracking-wider text-[9px] text-gray-400">
                    Total de dispositivos · {current.label}
                  </td>
                  <td className="pt-3 pr-3 text-center tabular-nums">{current.equipos}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* El costo por proyecto se aplica una vez, sobre el total del sistema, y
            el sistema cierra su propia cotización: se puede vender suelto. */}
        {current.equipos > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100 flex justify-end">
            <div className="w-full sm:max-w-xs">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                Cotización de {current.label}
              </p>
              <div className="p-3 bg-gray-50 rounded-xl mb-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sigma className="h-3 w-3 text-gray-400" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Fórmula
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-600 wrap-break-word tabular-nums">
                  {current.equipos} × {money(current.projectCost)} × {current.factor} = {money(current.subtotal)}
                </p>
              </div>

              <dl className="space-y-2 text-[11px] font-bold">
                <Row label={`Dispositivos · ${current.unit}`} value={current.equipos} />
                <Row label={`Precio por ${current.unit}`} value={money(current.projectCost)} />
                <Row label="Costo de equipos" value={money(current.equipmentCost)} />
                <Row label={`Factor ${current.factor}`} value="" />
                <Row label="Subtotal" value={money(current.subtotal)} strong />
                <Row label={`IVA ${(current.ivaRate * 100).toFixed(0)}%`} value={money(current.iva)} />
              </dl>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-baseline justify-between gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Total {current.label}
                </span>
                <span className="text-xl font-black text-primary tabular-nums">
                  {money(current.total)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Cálculo final ─────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sigma className="h-4 w-4 text-primary" />
          <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-700">Cálculo</h3>
        </div>

        {vacio ? (
          <p className="text-[11px] font-bold text-gray-300 py-6 text-center">
            Captura las partidas de equipo para ver el cálculo.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Una cotización cerrada por sistema; el edificio es su suma. */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-208 text-left">
                <thead>
                  <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                    <th className="pb-2 pr-3">Sistema</th>
                    <th className="pb-2 pr-3 text-center">Disp.</th>
                    <th className="pb-2 pr-3 text-right">Precio equipo</th>
                    <th className="pb-2 pr-3 text-right">Equipos</th>
                    <th className="pb-2 pr-3 text-center">Factor</th>
                    <th className="pb-2 pr-3 text-right">Subtotal</th>
                    <th className="pb-2 pr-3 text-right">IVA</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.bySystem.map(s => (
                    <tr key={s.key} className="text-[11px] font-bold text-gray-600">
                      <td className="py-2.5 pr-3 text-gray-800">
                        {s.label}
                        <span className="block text-[9px] font-bold text-gray-300 uppercase tracking-wider">
                          {s.partidas} {s.partidas === 1 ? 'partida' : 'partidas'} · {s.unit}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-center tabular-nums">{s.equipos}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-gray-400">
                        {money(s.projectCost)}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{money(s.equipmentCost)}</td>
                      <td className="py-2.5 pr-3 text-center tabular-nums text-gray-400">{s.factor}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{money(s.subtotal)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-gray-400">{money(s.iva)}</td>
                      <td className="py-2.5 text-right tabular-nums font-black text-gray-900">
                        {money(s.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-[11px] font-black text-gray-900 border-t-2 border-gray-200">
                    <td className="pt-3 pr-3 uppercase tracking-wider text-[9px] text-gray-400">
                      Total del edificio · {result.bySystem.length}{' '}
                      {result.bySystem.length === 1 ? 'sistema' : 'sistemas'}
                    </td>
                    <td className="pt-3 pr-3 text-center tabular-nums">{result.equipos}</td>
                    <td className="pt-3 pr-3" />
                    <td className="pt-3 pr-3 text-right tabular-nums">{money(result.equipmentCost)}</td>
                    <td className="pt-3 pr-3" />
                    <td className="pt-3 pr-3 text-right tabular-nums">{money(result.subtotal)}</td>
                    <td className="pt-3 pr-3 text-right tabular-nums text-gray-400">{money(result.iva)}</td>
                    <td className="pt-3 text-right tabular-nums text-primary">{money(result.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-2 border-t border-gray-100">
              {/* Peso de cada sistema dentro de la cotización unida. */}
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Peso por sistema
                </p>
                <dl className="space-y-3 text-[11px] font-bold">
                  {result.bySystem.map(s => {
                    const share = result.total > 0 ? (s.total / result.total) * 100 : 0;
                    return (
                      <div key={s.key}>
                        <div className="flex items-baseline gap-3">
                          <dt className="text-gray-400 flex-1 min-w-0 truncate">{s.label}</dt>
                          <dd className="tabular-nums text-gray-700 shrink-0">{money(s.total)}</dd>
                          <span className="text-[9px] font-black text-gray-300 tabular-nums shrink-0 w-10 text-right">
                            {share.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60"
                            style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </dl>
              </div>

              {/* Cotización unida = suma de los totales de cada sistema. */}
              <div className="md:border-l md:border-gray-100 md:pl-6">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Cotización del edificio
                </p>
                <div className="p-3 bg-gray-50 rounded-xl mb-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sigma className="h-3 w-3 text-gray-400" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Fórmula
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-600 wrap-break-word tabular-nums">
                    {money(result.equipmentCost)} × {result.factor} = {money(result.subtotal)}
                  </p>
                </div>

                <dl className="space-y-2 text-[11px] font-bold">
                  <Row label="Dispositivos" value={result.equipos} />
                  <Row label={`Partidas · ${result.bySystem.length} ${result.bySystem.length === 1 ? 'sistema' : 'sistemas'}`}
                    value={result.partidas} />
                  <Row label="Costo de equipos" value={money(result.equipmentCost)} />
                  <Row label={`Factor ${result.factor}`} value="" />
                  <Row label="Subtotal" value={money(result.subtotal)} strong />
                  <Row label={`IVA ${(result.ivaRate * 100).toFixed(0)}%`} value={money(result.iva)} />
                </dl>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-baseline justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                  <span className="text-2xl font-black text-primary tabular-nums">{money(result.total)}</span>
                </div>
                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-wider mt-2 text-right">
                  Suma de {result.bySystem.length} {result.bySystem.length === 1 ? 'cotización' : 'cotizaciones'} por sistema
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] font-semibold text-gray-400 leading-relaxed mt-5 pt-5 border-t border-gray-100">
          Precios en moneda nacional más {(IVA_RATE * 100).toFixed(0)}% de I.V.A.
          Las partidas solo cuentan dispositivos: el costo por proyecto del sistema
          (fijo) multiplica el total de dispositivos una sola vez, ese costo se
          multiplica por el factor y se le suma el I.V.A. — así cada sistema queda
          como una cotización que se puede entregar suelta, y la cotización del
          edificio es la suma de los totales de todos los sistemas.
          Cotiza {SISTEMAS.length} sistemas de implementación; no incluye obra civil ni viáticos.
        </p>
      </div>

      {/* ── Términos y observaciones del PDF ─────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-xl">
            <FileText className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest">
              Términos y observaciones
            </p>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
              Se imprimen en el PDF. Déjalos vacíos y sale el texto de siempre,
              ya calculado con el factor y el I.V.A. de esta cotización.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              Términos y condiciones
            </label>
            <textarea
              rows={6}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="proj-input proj-textarea"
              placeholder={`Por omisión:\n· Precios en moneda nacional, vigentes a la fecha de emisión.\n· Precios más ${(IVA_RATE * 100).toFixed(0)}% de I.V.A.\n· Se cobra el diseño del proyecto por cada equipo del sistema.\n· El precio unitario ya incluye el factor.\n· No incluye obra civil, canalización mayor ni viáticos foráneos.`}
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              Observaciones
            </label>
            <textarea
              rows={6}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="proj-input proj-textarea"
              placeholder={'Por omisión: el desglose por sistema (dispositivos, costo de equipos, factor, I.V.A. y total de cada uno).'}
            />
          </div>
        </div>

        <p className="text-[10px] font-bold text-gray-400 mt-3">
          {terms.trim() || observations.trim()
            ? 'El PDF usará lo que escribiste aquí.'
            : 'Ahora mismo el PDF saldrá con los textos de por omisión.'}
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

// Misma clase de input que el resto del módulo de proyectos.
function CotizadorEdificiosStyle() {
  return (
    <style>{`
      .proj-input {
        width: 100%; padding: 0.7rem 0.95rem; background: #f8fafc;
        border: 1.5px solid #e5e7eb; border-radius: 0.85rem; font-size: 0.8rem;
        font-weight: 600; color: #0f172a; outline: none;
        transition: border-color .18s, box-shadow .18s, background .18s;
      }
      .proj-textarea {
        min-height: 8.5rem; resize: vertical; line-height: 1.55;
        font-family: inherit; white-space: pre-wrap;
      }
      .proj-input::placeholder { color: #94a3b8; font-weight: 500; }
      .proj-input:hover { border-color: #cbd5e1; }
      .proj-input:focus {
        border-color: var(--color-primary, #2563eb); background: #fff;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #2563eb) 12%, transparent);
      }
    `}</style>
  );
}
