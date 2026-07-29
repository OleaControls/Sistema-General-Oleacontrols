import React, { useEffect, useState } from 'react';
import { Compass, Plus, X, Trash2, ChevronDown, Loader2, Send } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

// ── PROP — Prioridades · Realidades · Opciones · Plan ──────────────────────────
export const PROP_CATS = [
  { key: 'prioridades', label: 'Prioridades', hint: '¿Qué es lo más importante ahora?', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  { key: 'realidades',  label: 'Realidades',  hint: '¿Cuál es la situación real actual?', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { key: 'opciones',    label: 'Opciones',    hint: '¿Qué caminos o alternativas tienes?', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'plan',        label: 'Plan',        hint: '¿Qué vas a hacer, paso a paso?', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
];
const emptyProp = () => ({
  objetivo: '',
  prioridades: ['', '', ''],
  realidades:  ['', '', ''],
  opciones:    ['', '', ''],
  plan:        ['', '', ''],
});

const CARD = 'bg-white rounded-3xl border border-slate-100 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.12)]';

function Header({ icon: Icon, title, subtitle, accent = '#6366f1', bg = '#eef2ff', right }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-[12px] font-medium text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ── Modo TÉCNICO: registrar PROP + historial ──────────────────────────────────
function PropRegister({ user }) {
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState(emptyProp());

  useEffect(() => {
    apiFetch(`/api/technician-props?employeeId=${user.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setProps(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    for (const cat of PROP_CATS) {
      if (!form[cat.key].some(t => t.trim())) { alert(`Completa al menos una opción en ${cat.label}.`); return; }
    }
    setSaving(true);
    try {
      const payload = {
        employeeId: user.id,
        objetivo: form.objetivo,
        prioridades: form.prioridades.map(t => t.trim()),
        realidades:  form.realidades.map(t => t.trim()),
        opciones:    form.opciones.map(t => t.trim()),
        plan:        form.plan.map(t => t.trim()),
      };
      const res = await apiFetch('/api/technician-props', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error al guardar'); }
      const saved = await res.json();
      setProps(prev => [saved, ...prev]);
      setShowForm(false);
      setForm(emptyProp());
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este PROP? Esta acción no se puede deshacer.')) return;
    setProps(prev => prev.filter(p => p.id !== id));
    try { await apiFetch(`/api/technician-props?id=${id}`, { method: 'DELETE' }); }
    catch { const r = await apiFetch(`/api/technician-props?employeeId=${user.id}`); if (r.ok) setProps(await r.json()); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-400">
      <Header icon={Compass} title="PROP" subtitle="Prioridades · Realidades · Opciones · Plan"
        right={
          <button onClick={() => setShowForm(v => !v)}
            className={cn('inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shrink-0',
              showForm ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'text-white shadow-lg shadow-slate-900/15')}
            style={showForm ? {} : { background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
            {showForm ? <><X className="h-3.5 w-3.5" /> Cancelar</> : <><Plus className="h-3.5 w-3.5" /> Nuevo PROP</>}
          </button>
        }
      />

      {showForm && (
        <div className={cn(CARD, 'overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300')}>
          <div className="px-7 py-6" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)' }}>
            <p className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1">Nuevo registro</p>
            <h4 className="text-lg font-black text-slate-50">Prioridades · Realidades · Opciones · Plan</h4>
          </div>
          <form onSubmit={save} className="p-7 space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Enfoque / Objetivo <span className="text-slate-300 normal-case font-bold">(opcional)</span></label>
              <input type="text" value={form.objetivo} onChange={e => setForm(p => ({ ...p, objetivo: e.target.value }))}
                placeholder="Ej: Instalación de CCTV en Tienda Norte, cierre de OT-1234…"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-bold text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
            </div>

            {PROP_CATS.map(({ key, label, hint, color, bg, border }) => (
              <div key={key} className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider" style={{ color }}>{label}</label>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{hint}</p>
                </div>
                <div className="space-y-2">
                  {form[key].map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black" style={{ background: bg, border: `1px solid ${border}`, color }}>{idx + 1}</div>
                      <input type="text" value={val}
                        onChange={e => setForm(p => { const arr = [...p[key]]; arr[idx] = e.target.value; return { ...p, [key]: arr }; })}
                        placeholder={`Opción ${idx + 1}…`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-slate-800 outline-none transition-all"
                        onFocus={e => { e.target.style.borderColor = color; }}
                        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-wider">Cancelar</button>
              <button type="submit" disabled={saving}
                className="flex-[2] py-3.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-indigo-500/25 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : <><Send className="h-4 w-4" /> Guardar y enviar a Telegram</>}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />)
        ) : props.length === 0 ? (
          <EmptyBox title="Sin registros PROP" hint="Crea tu primer PROP para planear tus Prioridades, Realidades, Opciones y Plan." />
        ) : (
          props.map(prop => (
            <PropCard key={prop.id} prop={prop} open={expanded === prop.id}
              onToggle={() => setExpanded(expanded === prop.id ? null : prop.id)}
              onDelete={() => remove(prop.id)} />
          ))
        )}
      </div>
    </div>
  );
}

// Tarjeta de un PROP (con detalle expandible)
function PropCard({ prop, open, onToggle, onDelete }) {
  const dateStr = new Date(prop.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return (
    <div className={cn(CARD, 'overflow-hidden hover:shadow-md transition-shadow')}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-4 p-5 text-left">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', border: '1px solid #c7d2fe' }}>
          <Compass className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 truncate mb-1">{prop.objetivo || 'PROP sin enfoque'}</p>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{dateStr}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onDelete && (
            <button type="button" onClick={ev => { ev.stopPropagation(); onDelete(); }} className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            </button>
          )}
          <ChevronDown className={cn('h-4.5 w-4.5 text-slate-400 transition-transform', open && 'rotate-180')} style={{ width: 18, height: 18 }} />
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-50 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {PROP_CATS.map(({ key, label, color, bg, border }) => (
              <div key={key} className="rounded-2xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
                <p className="text-[9px] font-black uppercase tracking-wider mb-2.5" style={{ color }}>{label}</p>
                <ul className="space-y-1.5 list-none m-0 p-0">
                  {(prop[key] || []).filter(t => t && String(t).trim()).map((it, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="h-[18px] w-[18px] rounded-md flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5" style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>{i + 1}</span>
                      <span className="text-[12px] font-semibold text-slate-800 leading-snug">{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modo OPERACIONES: respuestas de todos los técnicos ────────────────────────
function PropResponses() {
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openTech, setOpenTech] = useState(null);
  const [openProp, setOpenProp] = useState(null);

  useEffect(() => {
    apiFetch('/api/technician-props')
      .then(r => r.ok ? r.json() : [])
      .then(d => setProps(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Agrupar por técnico
  const byTech = Object.values(props.reduce((map, p) => {
    const id = p.employeeId || p.employeeName || 'sin-id';
    if (!map[id]) map[id] = { id, name: p.employeeName || 'Técnico', items: [] };
    map[id].items.push(p);
    return map;
  }, {}))
    .map(t => ({ ...t, items: t.items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }))
    .sort((a, b) => new Date(b.items[0]?.createdAt || 0) - new Date(a.items[0]?.createdAt || 0));

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-400">
      <Header icon={Compass} title="PROP de Técnicos" accent="#6366f1" bg="#eef2ff"
        subtitle={`${byTech.length} técnicos · ${props.length} registros — respuestas de Prioridades, Realidades, Opciones y Plan`} />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}</div>
      ) : byTech.length === 0 ? (
        <EmptyBox title="Sin respuestas PROP" hint="Cuando los técnicos registren su PROP, sus respuestas aparecerán aquí." />
      ) : (
        <div className="space-y-3">
          {byTech.map(tech => {
            const latest = tech.items[0];
            const open = openTech === tech.id;
            return (
              <div key={tech.id} className={cn(CARD, 'overflow-hidden')}>
                <button onClick={() => setOpenTech(open ? null : tech.id)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50/60 transition-colors">
                  <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                    <span className="text-sm font-black text-indigo-600">{tech.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{tech.name}</p>
                    <p className="text-[11px] font-semibold text-slate-400 truncate">
                      Último: {latest ? new Date(latest.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      {latest?.objetivo ? ` · ${latest.objetivo}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-1 shrink-0">
                    {tech.items.length} PROP{tech.items.length !== 1 ? 's' : ''}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="px-4 pb-4 border-t border-slate-50 space-y-3 pt-3">
                    {tech.items.map((p, i) => (
                      <PropCard key={p.id} prop={{ ...p, objetivo: p.objetivo || (i === 0 ? 'Más reciente' : 'PROP') }}
                        open={openProp === p.id} onToggle={() => setOpenProp(openProp === p.id ? null : p.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyBox({ title, hint }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center py-16 px-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/40">
      <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
        <Compass className="h-6 w-6 text-slate-300" />
      </div>
      <p className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</p>
      <p className="text-xs font-medium text-slate-400 max-w-xs">{hint}</p>
    </div>
  );
}

export default function PropView() {
  const { user } = useAuth();
  const rolesArr = Array.isArray(user?.roles) ? user.roles : [user?.role];
  const isTech = user?.role === ROLES.TECH || rolesArr.includes(ROLES.TECH);
  // Técnicos registran su PROP; Operaciones/Admin ven las respuestas.
  return isTech ? <PropRegister user={user} /> : <PropResponses />;
}
