import React, { useState, useEffect, useMemo } from 'react';
import { Wrench, CheckCircle2, XCircle, AlertTriangle, Save, Loader2, History } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { TOOLS_ITEMS, lifeTone } from '@/modules/ots/utils/toolsCatalog';

const CARD = 'bg-white rounded-3xl border border-slate-100 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.12)]';

/**
 * Inventario de herramienta del técnico.
 *
 * No es un registro diario: se guarda una sola fila por técnico y se
 * actualiza cuando su herramienta cambia. Antes vivía como paso 2 del
 * checklist de asistencia, donde había que capturarlo cada mañana.
 */
export default function ToolkitTab({ techId }) {
  const [tools,     setTools]     = useState({});
  const [toolsLife, setToolsLife] = useState({});
  const [notes,     setNotes]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(null);   // fecha del último guardado
  const [dirty,     setDirty]     = useState(false);

  useEffect(() => {
    if (!techId) return;
    let vivo = true;
    apiFetch(`/api/tech-toolkit?techId=${techId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!vivo || !data) return;
        setTools(data.tools || {});
        setToolsLife(data.toolsLife || {});
        setNotes(data.notes || '');
        setSaved(data.updatedAt || null);
      })
      .catch(() => {})
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [techId]);

  const setTool = (key, present) => {
    setTools(p => ({ ...p, [key]: present }));
    if (present && toolsLife[key] === undefined) setToolsLife(p => ({ ...p, [key]: 100 }));
    setDirty(true);
  };

  const setLife = (key, pct) => {
    setToolsLife(p => ({ ...p, [key]: pct }));
    setDirty(true);
  };

  const { presentes, faltantes, sinResponder, desgastadas } = useMemo(() => {
    const presentes    = TOOLS_ITEMS.filter(t => tools[t.key] === true);
    const faltantes    = TOOLS_ITEMS.filter(t => tools[t.key] === false);
    const sinResponder = TOOLS_ITEMS.filter(t => tools[t.key] === undefined);
    const desgastadas  = presentes.filter(t => (toolsLife[t.key] ?? 100) < 40);
    return { presentes, faltantes, sinResponder, desgastadas };
  }, [tools, toolsLife]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/tech-toolkit', {
        method: 'PUT',
        body: JSON.stringify({ techId, tools, toolsLife, notes }),
      });
      if (!res.ok) {
        // Un 404 aquí casi siempre es el servidor de API local sin reiniciar:
        // server.js no recarga solo y no conoce rutas nuevas.
        const detalle = res.status === 404
          ? 'la ruta /api/tech-toolkit no responde (reinicia el servidor de API)'
          : (await res.json().catch(() => ({}))).error || `respuesta ${res.status}`;
        throw new Error(detalle);
      }
      const data = await res.json();
      setSaved(data.updatedAt || new Date().toISOString());
      setDirty(false);
    } catch (err) {
      alert('Error al guardar tu herramienta: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={cn(CARD, 'p-10 flex items-center justify-center')}>
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
      </div>
    );
  }

  const savedLabel = saved
    ? new Date(saved).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">

      {/* Encabezado + resumen */}
      <div className={cn(CARD, 'p-6 space-y-5')}>
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#f5f3ff' }}>
            <Wrench className="h-5 w-5" style={{ color: '#7c3aed' }} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 leading-tight">Mis herramientas</h2>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Registro permanente — actualízalo cuando tu herramienta cambie, no todos los días.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: 'Completas',  value: presentes.length,    color: '#059669', bg: '#ecfdf5' },
            { label: 'Faltantes',  value: faltantes.length,    color: '#dc2626', bg: '#fef2f2' },
            { label: 'Desgastadas', value: desgastadas.length, color: '#d97706', bg: '#fffbeb' },
            { label: 'Sin marcar', value: sinResponder.length, color: '#64748b', bg: '#f8fafc' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="rounded-2xl px-3 py-3 border border-slate-100" style={{ background: bg }}>
              <p className="text-xl font-black leading-none tabular-nums" style={{ color }}>{value}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1.5">{label}</p>
            </div>
          ))}
        </div>

        {savedLabel && (
          <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <History className="h-3 w-3 shrink-0" /> Última actualización: {savedLabel}
          </p>
        )}
      </div>

      {/* Lista de herramientas */}
      <div className={cn(CARD, 'p-4 sm:p-6 space-y-2')}>
        {TOOLS_ITEMS.map(({ key, label, icon: Icon }) => {
          const v    = tools[key];
          const life = toolsLife[key] ?? 100;
          const tone = lifeTone(life);
          return (
            <div key={key} className={cn(
              'p-3 rounded-2xl border transition-all',
              v === true  ? 'bg-emerald-50/60 border-emerald-200' :
              v === false ? 'bg-red-50/60 border-red-200' :
                            'bg-slate-50 border-slate-100'
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  v === true  ? 'bg-emerald-100 text-emerald-600' :
                  v === false ? 'bg-red-100 text-red-600' :
                                'bg-white text-slate-400 border border-slate-200'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-bold text-slate-800 flex-1 leading-tight">{label}</p>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setTool(key, true)}
                    title="La tengo"
                    className={cn(
                      'min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center border transition-all touch-manipulation',
                      v === true
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-500'
                    )}>
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setTool(key, false)}
                    title="Me falta"
                    className={cn(
                      'min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center border transition-all touch-manipulation',
                      v === false
                        ? 'bg-red-500 border-red-500 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-500'
                    )}>
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Vida útil — solo tiene sentido si la herramienta existe */}
              {v === true && (
                <div className="mt-3 pt-2 border-t border-emerald-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vida útil</span>
                    <span className={cn('text-[11px] font-black tabular-nums', tone.text)}>{life}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5} value={life}
                    onChange={e => setLife(key, Number(e.target.value))}
                    className="w-full accent-violet-600 h-1.5 cursor-pointer touch-manipulation"
                  />
                  <div className="w-full bg-white/70 rounded-full h-1.5 mt-1.5 overflow-hidden border border-emerald-100">
                    <div className={cn('h-1.5 rounded-full transition-all duration-300', tone.bar)} style={{ width: `${life}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Notas + guardar */}
      <div className={cn(CARD, 'p-6 space-y-4')}>
        {faltantes.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs font-bold text-amber-700">
              {faltantes.length === 1 ? 'Te falta 1 herramienta.' : `Te faltan ${faltantes.length} herramientas.`} Operaciones lo verá en tu inventario.
            </p>
          </div>
        )}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas</label>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setDirty(true); }}
            placeholder="Qué te falta, qué está por romperse, qué pediste de reposición..."
            rows={3}
            className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all touch-manipulation',
            dirty && !saving
              ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-800'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
            : dirty
              ? <><Save className="h-4 w-4" /> Guardar mi herramienta</>
              : <><CheckCircle2 className="h-4 w-4" /> Todo guardado</>}
        </button>
      </div>
    </div>
  );
}
