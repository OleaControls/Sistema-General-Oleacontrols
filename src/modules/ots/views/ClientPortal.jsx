import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Clock, MapPin, X,
  CheckCircle2, FileText, ExternalLink, Info,
  Package, Wrench, Calendar, Plus, Shield, Download,
  ClipboardList, AlertCircle
} from 'lucide-react';

/* ─── Paleta por tipo ─────────────────────────────────────────────────────── */
const T = {
  OT:          { label: 'Orden de Trabajo', pill: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6', icon: Package  },
  VISIT:       { label: 'Visita Técnica',   pill: '#fef3c7', text: '#b45309', dot: '#f59e0b', icon: MapPin   },
  MAINTENANCE: { label: 'Mantenimiento',    pill: '#d1fae5', text: '#065f46', dot: '#10b981', icon: Wrench   },
  OTHER:       { label: 'Otro',             pill: '#ede9fe', text: '#5b21b6', dot: '#7c3aed', icon: Info     },
};

const STATUS = {
  PENDING:     { label: 'Programado',  c: '#d97706', bg: '#fef3c7' },
  ASSIGNED:    { label: 'Asignado',    c: '#1d4ed8', bg: '#dbeafe' },
  IN_PROGRESS: { label: 'En progreso', c: '#065f46', bg: '#d1fae5' },
  COMPLETED:   { label: 'Completado',  c: '#065f46', bg: '#d1fae5' },
  VALIDATED:   { label: 'Validado',    c: '#065f46', bg: '#d1fae5' },
};

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Fira+Code:wght@400;500&display=swap');

  .p-root, .p-root * { font-family: 'Inter', sans-serif; box-sizing: border-box; margin:0; padding:0; }
  .p-code { font-family: 'Fira Code', monospace !important; }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes scaleIn  { from{opacity:0;transform:scale(.97) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.4} }

  .p-a1{animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .00s both}
  .p-a2{animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .06s both}
  .p-a3{animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .12s both}

  /* Nav */
  .p-nav{
    position:sticky;top:0;z-index:50;
    background:rgba(255,255,255,.96);
    backdrop-filter:blur(16px) saturate(1.6);
    border-bottom:1px solid #e5e7eb;
  }

  /* Celda día */
  .p-cell{
    border-right:1px solid #f3f4f6;
    border-bottom:1px solid #f3f4f6;
    padding:10px 8px 6px;
    min-height:130px;
    transition:background .12s;
    vertical-align:top;
  }
  .p-cell:hover{ background:#fafafa; }
  .p-cell.empty{ background:#fafafa; }

  /* Pill de evento */
  .p-pill{
    display:flex;align-items:center;gap:5px;
    padding:4px 8px;border-radius:6px;
    font-size:11px;font-weight:600;line-height:1.3;
    cursor:pointer;
    transition:filter .12s, transform .12s;
    border:none;width:100%;text-align:left;
    margin-bottom:3px;
  }
  .p-pill:hover{ filter:brightness(.92); transform:translateX(2px); }

  /* Evento sidebar */
  .p-ev{
    display:flex;align-items:flex-start;gap:12px;
    padding:12px 14px;border-radius:12px;
    cursor:pointer;border:1px solid #f3f4f6;
    transition:background .12s, border-color .12s;
  }
  .p-ev:hover{ background:#f9fafb; border-color:#e5e7eb; }

  /* Modal */
  .p-overlay{
    position:fixed;inset:0;z-index:999;
    background:rgba(0,0,0,.4);
    backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;
    padding:20px;
    animation:fadeIn .18s ease both;
  }
  .p-modal{
    background:#fff;border-radius:24px;
    width:100%;max-width:580px;max-height:88vh;
    overflow-y:auto;
    box-shadow:0 32px 80px rgba(0,0,0,.16);
    animation:scaleIn .26s cubic-bezier(.16,1,.3,1) both;
  }
  .p-modal::-webkit-scrollbar{width:4px}
  .p-modal::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:2px}

  /* Thumb evidencia */
  .p-thumb{
    border-radius:12px;overflow:hidden;aspect-ratio:1;
    border:1px solid #e5e7eb;position:relative;
    display:block;transition:transform .18s;
  }
  .p-thumb:hover{transform:scale(1.03)}
  .p-ov{
    position:absolute;inset:0;
    background:rgba(0,0,0,.38);
    display:flex;align-items:center;justify-content:center;
    opacity:0;transition:opacity .18s;
  }
  .p-thumb:hover .p-ov{opacity:1}

  /* scroll sidebar */
  .p-scr{overflow-y:auto}
  .p-scr::-webkit-scrollbar{width:3px}
  .p-scr::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:2px}
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const getDays = (date) => {
  const y = date.getFullYear(), m = date.getMonth();
  const first = new Date(y, m, 1).getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const arr = [];
  for (let i = 0; i < first; i++) arr.push(null);
  for (let i = 1; i <= total; i++) arr.push(new Date(y, m, i));
  return arr;
};

const eventsForDate = (date, data) => {
  if (!date || !data) return [];
  const ds = date.toISOString().split('T')[0];
  const ots = (data.workOrders || [])
    .filter(o => o.scheduledDate?.startsWith(ds))
    .map(o => ({ ...o, _t: 'OT', _time: o.arrivalTime || '09:00', _uid: `ot-${o.id}` }));
  const evs = (data.events || [])
    .filter(e => e.startDate?.startsWith(ds))
    .map(e => ({ ...e, _t: e.type || 'VISIT', _time: new Date(e.startDate).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false }), _uid: `ev-${e.id}` }));
  return [...ots, ...evs].sort((a, b) => a._time.localeCompare(b._time));
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ClientPortal() {
  const token = new URLSearchParams(useLocation().search).get('token');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [month,   setMonth]   = useState(new Date());
  const [sel,     setSel]     = useState(null);   // evento seleccionado

  useEffect(() => {
    const s = document.createElement('style');
    s.id = 'p-css';
    if (!document.getElementById('p-css')) document.head.appendChild(s);
    s.textContent = CSS;
  }, []);

  useEffect(() => {
    if (!token) { setError('Token no válido'); setLoading(false); return; }
    fetch(`/api/portal?token=${token}`)
      .then(r => { if (!r.ok) throw new Error('Enlace inválido o expirado'); return r.json(); })
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [token]);

  /* ── Loading ── */
  if (loading) return (
    <div className="p-root" style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:44, height:44, border:'2.5px solid #e5e7eb', borderTop:'2.5px solid #10b981', borderRadius:'50%', margin:'0 auto 16px', animation:'sp .7s linear infinite' }} />
        <p className="p-code" style={{ fontSize:11, color:'#9ca3af', letterSpacing:'.16em', textTransform:'uppercase' }}>Cargando portal…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="p-root" style={{ minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:380, width:'100%', background:'#fff', border:'1px solid #fee2e2', borderRadius:24, padding:'48px 36px', textAlign:'center', boxShadow:'0 4px 24px rgba(0,0,0,.06)' }}>
        <div style={{ width:64, height:64, background:'#fef2f2', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <X size={28} style={{ color:'#ef4444' }} />
        </div>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', marginBottom:8 }}>Acceso Denegado</h1>
        <p style={{ color:'#6b7280', fontSize:14, lineHeight:1.7, marginBottom:24 }}>{error}</p>
        <p className="p-code" style={{ fontSize:10, color:'#d1d5db', letterSpacing:'.12em', textTransform:'uppercase', lineHeight:1.8 }}>
          Contacta a tu asesor de Olea Controls
        </p>
      </div>
    </div>
  );

  /* ── Data ── */
  const today   = new Date();
  const days    = getDays(month);
  const mLabel  = month.toLocaleString('es-MX', { month:'long', year:'numeric' });

  const allEvs  = [...(data.events||[]), ...(data.workOrders||[])];
  const upcoming = allEvs
    .filter(e => new Date(e.startDate||e.scheduledDate) >= today)
    .sort((a,b) => new Date(a.startDate||a.scheduledDate) - new Date(b.startDate||b.scheduledDate))
    .slice(0, 12);

  const done    = (data.workOrders||[]).filter(o => ['COMPLETED','VALIDATED'].includes(o.status)).length;
  const pending = (data.workOrders||[]).filter(o => !['COMPLETED','VALIDATED'].includes(o.status)).length;

  return (
    <div className="p-root" style={{ minHeight:'100vh', background:'#fff', display:'flex', flexDirection:'column' }}>

      {/* ══ NAV ══════════════════════════════════════════════════════════ */}
      <nav className="p-nav">
        <div style={{ maxWidth:'100%', padding:'0 28px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <img src="/img/OLEACONTROLS.png" style={{ height:20, objectFit:'contain' }} alt="Olea Controls" />
            <div style={{ width:1, height:20, background:'#e5e7eb' }} />
            <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{data.client.name}</span>
            {data.client.storeName && <span style={{ fontSize:12, color:'#9ca3af', fontWeight:400 }}>{data.client.storeName}</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {/* Stats mini */}
            <div style={{ display:'flex', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:100, padding:'5px 12px' }}>
                <CheckCircle2 size={12} style={{ color:'#16a34a' }} />
                <span className="p-code" style={{ fontSize:11, color:'#15803d', fontWeight:600 }}>{done} completadas</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:100, padding:'5px 12px' }}>
                <Clock size={12} style={{ color:'#d97706' }} />
                <span className="p-code" style={{ fontSize:11, color:'#b45309', fontWeight:600 }}>{pending} pendientes</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#ecfdf5', border:'1px solid #6ee7b7', borderRadius:100, padding:'5px 14px' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'blink 2s ease infinite' }} />
              <span className="p-code" style={{ fontSize:10, color:'#059669', letterSpacing:'.12em', textTransform:'uppercase' }}>Portal Seguro</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ══ BODY ══════════════════════════════════════════════════════════ */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ── Calendario principal ─────────────────────────────────────── */}
        <div className="p-a1" style={{ flex:1, display:'flex', flexDirection:'column', borderRight:'1px solid #e5e7eb', minWidth:0 }}>

          {/* Barra mes */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:'1px solid #f3f4f6', background:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <h2 style={{ fontSize:20, fontWeight:800, color:'#111827', textTransform:'capitalize', letterSpacing:'-.02em' }}>{mLabel}</h2>
              <div style={{ display:'flex', gap:4 }}>
                <button
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1))}
                  style={{ width:32, height:32, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', transition:'all .12s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#f9fafb';e.currentTarget.style.borderColor='#d1d5db'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor='#e5e7eb'}}
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => setMonth(new Date())}
                  style={{ height:32, padding:'0 14px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151', transition:'all .12s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#f9fafb'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#fff'}}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1))}
                  style={{ width:32, height:32, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', transition:'all .12s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#f9fafb';e.currentTarget.style.borderColor='#d1d5db'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor='#e5e7eb'}}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Leyenda */}
            <div style={{ display:'flex', gap:14 }}>
              {Object.entries(T).map(([k,m]) => (
                <div key={k} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:m.dot }} />
                  <span style={{ fontSize:11, color:'#6b7280', fontWeight:500 }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Encabezado días */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'#fafafa', borderBottom:'1px solid #f3f4f6' }}>
            {['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map(d => (
              <div key={d} style={{ padding:'10px 0', textAlign:'center' }}>
                <span className="p-code" style={{ fontSize:10, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'#9ca3af' }}>{d.slice(0,3)}</span>
              </div>
            ))}
          </div>

          {/* Grid días — flex:1 para ocupar todo el espacio */}
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7,1fr)', gridAutoRows:'1fr', overflow:'hidden' }}>
            {days.map((date, i) => {
              const evs    = eventsForDate(date, data);
              const isToday = date && date.toDateString() === today.toDateString();
              const isPast  = date && date < today && !isToday;
              const isOther = !date;

              return (
                <div
                  key={i}
                  className={`p-cell${isOther ? ' empty' : ''}`}
                  style={{ background: isOther ? '#fafafa' : isToday ? '#f0fdf4' : undefined }}
                >
                  {date && (
                    <>
                      {/* Número de día */}
                      <div style={{ marginBottom:6 }}>
                        <span style={{
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          width:28, height:28, borderRadius:'50%', fontSize:13, fontWeight: isToday ? 800 : 500,
                          background: isToday ? '#10b981' : 'transparent',
                          color: isToday ? '#fff' : isPast ? '#d1d5db' : '#374151',
                          border: isToday ? 'none' : '1px solid transparent',
                        }}>
                          {date.getDate()}
                        </span>
                        {isToday && (
                          <span className="p-code" style={{ fontSize:9, color:'#10b981', marginLeft:6, letterSpacing:'.08em', textTransform:'uppercase', verticalAlign:'middle' }}>hoy</span>
                        )}
                      </div>

                      {/* Pills de eventos */}
                      <div>
                        {evs.slice(0, 4).map(ev => {
                          const meta = T[ev._t] || T.OTHER;
                          const Icon = meta.icon;
                          return (
                            <button
                              key={ev._uid}
                              className="p-pill"
                              onClick={() => setSel(ev)}
                              style={{ background: meta.pill, color: meta.text, opacity: isPast ? .55 : 1 }}
                            >
                              <Icon size={10} style={{ flexShrink:0 }} />
                              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{ev.title}</span>
                            </button>
                          );
                        })}
                        {evs.length > 4 && (
                          <button
                            className="p-pill"
                            onClick={() => setSel(evs[4])}
                            style={{ background:'#f3f4f6', color:'#6b7280' }}
                          >
                            <Plus size={10} />
                            <span>{evs.length - 4} más</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div className="p-a2" style={{ width:300, flexShrink:0, display:'flex', flexDirection:'column', background:'#fff' }}>

          {/* Info cliente */}
          <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid #f3f4f6' }}>
            <div style={{ background:'linear-gradient(135deg,#ecfdf5,#f0f9ff)', border:'1px solid #d1fae5', borderRadius:16, padding:'18px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Shield size={18} style={{ color:'#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:'#065f46', lineHeight:1.3 }}>{data.client.name}</p>
                  {data.client.storeName && <p style={{ fontSize:11, color:'#6ee7b7', fontWeight:500 }}>{data.client.storeName}</p>}
                </div>
              </div>
              {data.client.address && (
                <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                  <MapPin size={11} style={{ color:'#6ee7b7', marginTop:2, flexShrink:0 }} />
                  <span style={{ fontSize:11, color:'#047857', lineHeight:1.6 }}>{data.client.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Próximas actividades */}
          <div style={{ overflow:'hidden', display:'flex', flexDirection:'column', borderBottom:'1px solid #f3f4f6' }}>
            <div style={{ padding:'16px 20px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:'#111827' }}>Próximas actividades</h3>
              <span className="p-code" style={{ fontSize:11, color:'#9ca3af', background:'#f3f4f6', padding:'3px 9px', borderRadius:100 }}>
                {upcoming.length}
              </span>
            </div>

            <div className="p-scr" style={{ maxHeight:220, padding:'0 12px 12px', display:'flex', flexDirection:'column', gap:6 }}>
              {upcoming.length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px 0', color:'#d1d5db' }}>
                  <Calendar size={28} style={{ margin:'0 auto 8px', strokeWidth:1.5 }} />
                  <p className="p-code" style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase' }}>Sin actividades</p>
                </div>
              ) : upcoming.map((ev, i) => {
                const type = ev._t || ev.type || 'OT';
                const meta = T[type] || T.OTHER;
                const Icon = meta.icon;
                const d    = new Date(ev.startDate || ev.scheduledDate);
                return (
                  <div key={ev._uid||ev.id||i} className="p-ev" onClick={() => setSel(ev)}>
                    <div style={{ width:34, height:34, borderRadius:10, background:meta.pill, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:meta.text }}>
                      <Icon size={15} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:'#1f2937', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</p>
                      <p className="p-code" style={{ fontSize:10, color: meta.dot, letterSpacing:'.04em' }}>
                        {d.toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Órdenes de Trabajo */}
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'16px 20px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:'#111827' }}>Órdenes de Trabajo</h3>
              <span className="p-code" style={{ fontSize:11, color:'#9ca3af', background:'#f3f4f6', padding:'3px 9px', borderRadius:100 }}>
                {(data.workOrders||[]).length}
              </span>
            </div>

            <div className="p-scr" style={{ flex:1, padding:'0 12px 20px', display:'flex', flexDirection:'column', gap:6 }}>
              {(data.workOrders||[]).length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px 0', color:'#d1d5db' }}>
                  <ClipboardList size={28} style={{ margin:'0 auto 8px', strokeWidth:1.5 }} />
                  <p className="p-code" style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase' }}>Sin órdenes</p>
                </div>
              ) : (data.workOrders||[]).map((ot, i) => {
                const isDone  = ['COMPLETED','VALIDATED'].includes(ot.status);
                const isProgress = ot.status === 'IN_PROGRESS';
                const dotColor = isDone ? '#16a34a' : isProgress ? '#2563eb' : '#d97706';
                const bgColor  = isDone ? '#f0fdf4' : isProgress ? '#eff6ff' : '#fffbeb';
                return (
                  <div key={ot.id||i} className="p-ev" onClick={() => setSel({ ...ot, _t:'OT', _uid:`ot-${ot.id}`, _time: ot.arrivalTime||'—' })}>
                    <div style={{ width:34, height:34, borderRadius:10, background:bgColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <ClipboardList size={15} style={{ color: dotColor }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:'#1f2937', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ot.title}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span className="p-code" style={{ fontSize:10, color: dotColor }}>
                          {ot.otNumber}
                        </span>
                        {ot.deliveryActUrl && (
                          <span style={{ fontSize:9, background:'#dbeafe', color:'#1d4ed8', padding:'1px 6px', borderRadius:4, fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em' }}>
                            Acta
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop:'1px solid #f3f4f6', padding:'14px 20px', textAlign:'center' }}>
            <p className="p-code" style={{ fontSize:9, color:'#d1d5db', letterSpacing:'.14em', textTransform:'uppercase' }}>
              © {new Date().getFullYear()} Olea Controls
            </p>
          </div>
        </div>
      </div>

      {/* ══ MODAL ═════════════════════════════════════════════════════════ */}
      {sel && (
        <div className="p-overlay" onClick={() => setSel(null)}>
          <div className="p-modal" onClick={e => e.stopPropagation()}>
            {(() => {
              const type = sel._t || sel.type || 'OT';
              const meta = T[type] || T.OTHER;
              const Icon = meta.icon;
              const st   = STATUS[sel.status] || { label: sel.status || 'Programado', c:'#d97706', bg:'#fffbeb' };
              return (
                <>
                  {/* Header */}
                  <div style={{ padding:'28px 28px 22px', borderBottom:'1px solid #f3f4f6', background: meta.pill, borderRadius:'24px 24px 0 0', position:'relative' }}>
                    <button
                      onClick={() => setSel(null)}
                      style={{ position:'absolute', top:18, right:18, width:32, height:32, borderRadius:9, background:'rgba(255,255,255,.8)', border:'1px solid rgba(0,0,0,.08)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280' }}
                    >
                      <X size={14} />
                    </button>

                    <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:16 }}>
                      <div style={{ width:48, height:48, borderRadius:14, background:'#fff', border:`1.5px solid ${meta.dot}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,.06)', color:meta.text }}>
                        <Icon size={22} />
                      </div>
                      <div>
                        <p className="p-code" style={{ fontSize:10, letterSpacing:'.12em', color:meta.text, textTransform:'uppercase', marginBottom:4 }}>{meta.label}</p>
                        <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', lineHeight:1.25 }}>{sel.title}</h2>
                      </div>
                    </div>

                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {(sel._time || sel.arrivalTime) && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.75)', border:'1px solid rgba(0,0,0,.08)', borderRadius:100, padding:'5px 12px' }}>
                          <Clock size={11} style={{ color:'#6b7280' }} />
                          <span className="p-code" style={{ fontSize:11, color:'#374151' }}>{sel._time || sel.arrivalTime}</span>
                        </div>
                      )}
                      <div style={{ display:'flex', alignItems:'center', gap:6, background:st.bg, border:`1px solid ${st.c}40`, borderRadius:100, padding:'5px 12px' }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:st.c }} />
                        <span className="p-code" style={{ fontSize:11, color:st.c, textTransform:'uppercase', letterSpacing:'.06em' }}>{st.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding:'24px 28px' }}>
                    {sel.description && (
                      <div style={{ marginBottom:24 }}>
                        <p className="p-code" style={{ fontSize:10, letterSpacing:'.12em', color:'#9ca3af', textTransform:'uppercase', marginBottom:8 }}>Descripción</p>
                        <p style={{ color:'#4b5563', fontSize:14, lineHeight:1.75 }}>{sel.description}</p>
                      </div>
                    )}

                    {/* Acta de Entrega — solo para OTs con deliveryActUrl */}
                    {sel.deliveryActUrl && (
                      <div style={{ marginBottom:24 }}>
                        <p className="p-code" style={{ fontSize:10, letterSpacing:'.12em', color:'#9ca3af', textTransform:'uppercase', marginBottom:10 }}>Acta de Entrega</p>
                        <a
                          href={sel.deliveryActUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:14, textDecoration:'none', transition:'background .15s' }}
                          onMouseEnter={e => e.currentTarget.style.background='#dbeafe'}
                          onMouseLeave={e => e.currentTarget.style.background='#eff6ff'}
                        >
                          <div style={{ width:40, height:40, borderRadius:10, background:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <Download size={18} style={{ color:'#fff' }} />
                          </div>
                          <div>
                            <p style={{ fontSize:13, fontWeight:700, color:'#1d4ed8', marginBottom:2 }}>Acta de Entrega · {sel.otNumber}</p>
                            <p className="p-code" style={{ fontSize:10, color:'#3b82f6' }}>Toca para ver o descargar el PDF</p>
                          </div>
                          <ExternalLink size={14} style={{ color:'#93c5fd', marginLeft:'auto' }} />
                        </a>
                      </div>
                    )}

                    <div>
                      <p className="p-code" style={{ fontSize:10, letterSpacing:'.12em', color:'#9ca3af', textTransform:'uppercase', marginBottom:12 }}>
                        Evidencias · Reportes
                      </p>
                      {sel.evidences?.length > 0 ? (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                          {sel.evidences.map((ev, i) => (
                            <a key={i} href={ev.url} target="_blank" rel="noreferrer" className="p-thumb">
                              {ev.type === 'IMAGE'
                                ? <img src={ev.url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                                : <div style={{ minHeight:90, background:'#fef2f2', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
                                    <FileText size={24} style={{ color:'#f87171' }} />
                                    <span className="p-code" style={{ fontSize:9, color:'#fca5a5', textTransform:'uppercase' }}>PDF</span>
                                  </div>
                              }
                              <div className="p-ov"><ExternalLink size={16} style={{ color:'#fff' }} /></div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign:'center', padding:'28px', background:'#f9fafb', border:'1px dashed #e5e7eb', borderRadius:12 }}>
                          <FileText size={24} style={{ color:'#d1d5db', margin:'0 auto 8px' }} />
                          <p className="p-code" style={{ fontSize:10, color:'#d1d5db', letterSpacing:'.1em', textTransform:'uppercase' }}>Sin archivos cargados</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
