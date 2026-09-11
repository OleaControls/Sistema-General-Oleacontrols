import React from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Piezas visuales compartidas del módulo de Compras.
   Replican el lenguaje de /crm/quotes —cabecera oscura con KPIs, filtros en
   píldoras y tabla estilo Excel— para que las dos pantallas se sientan del
   mismo sistema. Viven aparte porque las usan las tres vistas del módulo. */

export const ACENTO = '#10b981';   // el mismo verde de cotizaciones

/** Cabecera oscura con eyebrow, título grande, acción principal y KPIs. */
export function HeaderPremium({ eyebrow, titulo, subtitulo, accion, kpis = [], children }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2027 100%)', borderRadius: 28, padding: '36px 40px' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div style={{ position: 'absolute', right: -80, top: -80, width: 360, height: 360, background: 'radial-gradient(circle, rgba(16,185,129,.07) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', left: '40%', bottom: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(99,102,241,.06) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: kpis.length ? 28 : 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACENTO }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '.25em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {eyebrow}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-.03em', lineHeight: 1 }}>
              {titulo}
            </h1>
            {subtitulo && (
              <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, margin: '6px 0 0', letterSpacing: '.06em' }}>{subtitulo}</p>
            )}
          </div>
          {accion && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>{accion}</div>}
        </div>

        {kpis.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            {kpis.map(({ label, value, color, accent }) => (
              <div key={label} style={{ background: accent, borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,.06)', backdropFilter: 'blur(4px)' }}>
                <p style={{ fontSize: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.14em', margin: '0 0 6px' }}>{label}</p>
                <p style={{ fontSize: typeof value === 'string' ? 15 : 24, fontWeight: 900, color, margin: 0, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

/** Botón principal del header, con el realce del de "Nueva Cotización". */
export function BotonPrimario({ children, onClick, disabled, color = ACENTO, hover = '#059669' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, background: color, color: '#fff',
        padding: '14px 24px', borderRadius: 14, fontWeight: 900, fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '.1em', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .2s', flexShrink: 0,
        boxShadow: `0 8px 24px ${color}59`, opacity: disabled ? .6 : 1,
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = hover; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.background = color; e.currentTarget.style.transform = 'none'; }}
    >
      {children}
    </button>
  );
}

/** Botón secundario sobre la cabecera oscura. */
export function BotonFantasma({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.06)',
        color: '#cbd5e1', padding: '14px 20px', borderRadius: 14, fontWeight: 900, fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '.1em', border: '1px solid rgba(255,255,255,.12)',
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .2s', flexShrink: 0,
        opacity: disabled ? .5 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
    >
      {children}
    </button>
  );
}

/** Caja blanca de filtro (búsqueda o select) con el borde suave del CRM. */
export function CajaFiltro({ children, activo = false, flex = '1 1 200px', color = '#6366f1' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, background: '#fff',
      border: activo ? `1.5px solid ${color}` : '1.5px solid #f1f5f9',
      borderRadius: 14, padding: '11px 18px', flex,
      boxShadow: activo ? `0 4px 12px ${color}2e` : '0 1px 6px rgba(0,0,0,.04)',
      transition: 'all .15s', minWidth: 0,
    }}>
      {children}
    </div>
  );
}

/** Chip de filtro por estado. */
export function ChipFiltro({ label, activo, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 16px', borderRadius: 10, fontWeight: 800, fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '.1em', cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
        background: activo ? color : '#f1f5f9',
        color: activo ? '#fff' : '#64748b',
        border: activo ? `1.5px solid ${color}` : '1.5px solid transparent',
        boxShadow: activo ? `0 4px 12px ${color}30` : 'none',
      }}
    >{label}</button>
  );
}

/** Encabezado de columna ordenable, igual que en cotizaciones. */
export function SortTH({ label, col, sortConfig, onSort, align = 'left', className }) {
  const activo = sortConfig.key === col;
  const alineado = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th className={cn('px-3 py-2.5 select-none whitespace-nowrap', className)}>
      <button
        onClick={() => onSort(col)}
        className={cn(
          'flex items-center gap-1 w-full text-[9px] font-black uppercase tracking-widest transition-colors hover:text-emerald-600',
          alineado, activo ? 'text-emerald-600' : 'text-slate-400'
        )}
      >
        {label}
        {activo
          ? (sortConfig.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
          : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}

/** Vacío con el mismo peso visual que el de cotizaciones. */
export function VacioTabla({ icon: Icon, texto }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 14 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f8fafc', border: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={28} style={{ color: '#e2e8f0' }} />
      </div>
      <p style={{ fontSize: 10, fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '.2em', margin: 0 }}>{texto}</p>
    </div>
  );
}

/** Ordena una lista por la configuración de SortTH. */
export function ordenar(lista, sortConfig, valorDe) {
  if (!sortConfig.key) return lista;
  return [...lista].sort((a, b) => {
    const va = valorDe(a, sortConfig.key);
    const vb = valorDe(b, sortConfig.key);
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sortConfig.dir;
    return String(va).localeCompare(String(vb), 'es') * sortConfig.dir;
  });
}
