import React, { useMemo, useRef, useState } from 'react';
import {
  Building2, RotateCcw, Camera, DoorOpen, Flame, Network, Volume2, Package,
  Plus, Trash2, Sigma,
} from 'lucide-react';
import {
  SISTEMAS, IVA_RATE, DEFAULT_FACTOR, calcEdificio, money,
} from '../utils/cotizadorEdificios';
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
  const [systemKey, setSystemKey] = useState(SISTEMAS[0].key);
  const [linesBySystem, setLinesBySystem] = useState({});
  const [factor, setFactor] = useState(String(DEFAULT_FACTOR));
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

          <button onClick={reset} disabled={vacio && factor === String(DEFAULT_FACTOR)}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40">
            <RotateCcw className="h-3.5 w-3.5" /> Limpiar
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              Factor sobre el costo de equipos
            </label>
            <input type="number" step="0.01" min="0" value={factor}
              onChange={(e) => setFactor(e.target.value)} className="proj-input w-32" />
          </div>
          <p className="text-[10px] font-bold text-gray-400 leading-snug max-w-md pb-2.5">
            Equivale al <span className="text-gray-600">{pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}%</span> del
            costo de equipos. Por omisión {DEFAULT_FACTOR}; cámbialo si el proyecto se
            cierra con otro y todo se recalcula.
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
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-wider mt-1.5 tabular-nums">
                    {s.equipos} disp. · {money(s.equipmentCost)}
                  </p>
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
          <button onClick={addPartida}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all">
            <Plus className="h-3.5 w-3.5" /> Agregar partida
          </button>
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

        {/* El costo por proyecto se aplica una vez, sobre el total del sistema. */}
        {current.equipos > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-[11px] font-bold text-gray-500 tabular-nums">
              {current.equipos} dispositivos × {money(current.projectCost)}
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-wider ml-1.5">
                costo por proyecto
              </span>
            </p>
            <p className="text-base font-black text-gray-900 tabular-nums">
              {money(current.equipmentCost)}
            </p>
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
          <div className="grid gap-6 md:grid-cols-2">
            {/* Desglose por sistema */}
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                Costo de equipos por sistema
              </p>
              <dl className="space-y-2 text-[11px] font-bold">
                {result.bySystem.map(s => (
                  <Row key={s.key}
                    label={`${s.label} · ${s.equipos} × ${money(s.projectCost)}`}
                    value={money(s.equipmentCost)} />
                ))}
                <div className="pt-2 border-t border-gray-100">
                  <Row label={`Total · ${result.equipos} dispositivos`} value={money(result.equipmentCost)} strong />
                </div>
              </dl>
            </div>

            {/* Totales */}
            <div className="md:border-l md:border-gray-100 md:pl-6">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                Totales
              </p>
              <dl className="space-y-2 text-[11px] font-bold">
                <Row label="Costo de equipos" value={money(result.equipmentCost)} />
                <Row label={`× factor ${result.factor}`} value={money(result.subtotal)} strong />
                <Row label={`IVA ${(result.ivaRate * 100).toFixed(0)}%`} value={money(result.iva)} />
              </dl>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-baseline justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black text-primary tabular-nums">{money(result.total)}</span>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] font-semibold text-gray-400 leading-relaxed mt-5 pt-5 border-t border-gray-100">
          Precios en moneda nacional más {(IVA_RATE * 100).toFixed(0)}% de I.V.A.
          Las partidas solo cuentan dispositivos: el costo por proyecto del sistema
          (fijo) multiplica el total de dispositivos una sola vez, y la suma de todos
          los sistemas se multiplica por el factor.
          Cotiza {SISTEMAS.length} sistemas de implementación; no incluye obra civil ni viáticos.
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
      .proj-input::placeholder { color: #94a3b8; font-weight: 500; }
      .proj-input:hover { border-color: #cbd5e1; }
      .proj-input:focus {
        border-color: var(--color-primary, #2563eb); background: #fff;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #2563eb) 12%, transparent);
      }
    `}</style>
  );
}
