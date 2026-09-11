import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle, Search, Building2, X, ShoppingCart, Loader2, AlertCircle,
  FileSpreadsheet, Clock, CheckCircle2, XCircle, Edit3, FileDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/AuthContext';
import comprasService from '@/api/comprasService';
import Pagination from '@/modules/crm/components/Pagination';
import {
  HeaderPremium, BotonPrimario, BotonFantasma, CajaFiltro, ChipFiltro,
  SortTH, VacioTabla, ordenar,
} from '../components/ComprasUI';
import {
  poStatusMeta, money, puedeEditarCompras, firmasRequeridas, tramoDe,
} from '@/lib/compras';

const ESTILO_ESTADO = {
  BORRADOR:    { accent: '#94a3b8', bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  SOLICITADA:  { accent: '#3b82f6', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  EN_REVISION: { accent: '#6366f1', bg: '#eef2ff', text: '#3730a3', border: '#c7d2fe' },
  APROBADA:    { accent: '#10b981', bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  ENVIADA:     { accent: '#06b6d4', bg: '#ecfeff', text: '#155e75', border: '#a5f3fc' },
  RECIBIDA:    { accent: '#14b8a6', bg: '#f0fdfa', text: '#115e59', border: '#99f6e4' },
  FACTURADA:   { accent: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  PAGADA:      { accent: '#16a34a', bg: '#f0fdf4', text: '#14532d', border: '#bbf7d0' },
  RECHAZADA:   { accent: '#ef4444', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  CANCELADA:   { accent: '#cbd5e1', bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
};
const estiloDe = (s) => ESTILO_ESTADO[s] || ESTILO_ESTADO.BORRADOR;

const FILTROS = [
  { id: 'ALL',         label: 'Todas',        ac: '#0f172a' },
  { id: 'BORRADOR',    label: 'Borradores',   ac: '#64748b' },
  { id: 'SOLICITADA',  label: 'Por autorizar', ac: '#2563eb' },
  { id: 'EN_REVISION', label: 'En revisión',  ac: '#4f46e5' },
  { id: 'APROBADA',    label: 'Aprobadas',    ac: '#059669' },
  { id: 'RECIBIDA',    label: 'Recibidas',    ac: '#0d9488' },
  { id: 'RECHAZADA',   label: 'Rechazadas',   ac: '#dc2626' },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function PurchaseOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roles = user?.roles || [user?.role].filter(Boolean);
  const puedeEditar = puedeEditarCompras(roles);

  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState('ALL');
  const [proveedorId, setProveedorId] = useState('ALL');
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'folio', dir: -1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try { setOrdenes(await comprasService.ordenes()); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleSort = (col) =>
    setSortConfig(c => (c.key === col ? { key: col, dir: -c.dir } : { key: col, dir: 1 }));

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const enFirma = ordenes.filter(o => ['SOLICITADA', 'EN_REVISION'].includes(o.status));
    const aprobadas = ordenes.filter(o => ['APROBADA', 'ENVIADA', 'RECIBIDA', 'FACTURADA', 'PAGADA'].includes(o.status));
    return {
      comprometido: ordenes.filter(o => !['RECHAZADA', 'CANCELADA'].includes(o.status)).reduce((a, o) => a + (o.total || 0), 0),
      autorizado: aprobadas.reduce((a, o) => a + (o.total || 0), 0),
      enFirma: enFirma.length,
      montoEnFirma: enFirma.reduce((a, o) => a + (o.total || 0), 0),
      borradores: ordenes.filter(o => o.status === 'BORRADOR').length,
    };
  }, [ordenes]);

  const proveedores = useMemo(() => {
    const m = new Map();
    for (const o of ordenes) {
      if (!o.supplier) continue;
      const p = m.get(o.supplier.id) || { id: o.supplier.id, name: o.supplier.name, count: 0 };
      p.count += 1;
      m.set(o.supplier.id, p);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [ordenes]);

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const base = ordenes.filter(o => {
      if (estado !== 'ALL' && o.status !== estado) return false;
      if (proveedorId !== 'ALL' && o.supplier?.id !== proveedorId) return false;
      if (!t) return true;
      return [o.orderNumber, o.subject, o.supplier?.name, o.project?.name]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(t));
    });
    return ordenar(base, sortConfig, (o, key) => ({
      folio: o.orderNumber,
      proveedor: o.supplier?.name,
      proyecto: o.project?.name,
      fecha: o.orderDate ? new Date(o.orderDate).getTime() : null,
      items: o._count?.items || 0,
      total: o.total || 0,
      estado: poStatusMeta(o.status).label,
    })[key]);
  }, [ordenes, estado, proveedorId, busqueda, sortConfig]);

  useEffect(() => { setPage(1); }, [estado, proveedorId, busqueda]);

  const paginadas = useMemo(
    () => filtradas.slice((page - 1) * pageSize, page * pageSize),
    [filtradas, page, pageSize]
  );

  const nueva = async () => {
    setCreando(true);
    try {
      const provs = await comprasService.proveedores();
      if (provs.length === 0) {
        alert('Primero da de alta un proveedor.');
        navigate('/compras/proveedores');
        return;
      }
      navigate('/compras/nueva');
    } catch (e) { alert(e.message); }
    finally { setCreando(false); }
  };

  const exportarCSV = () => {
    const cab = ['Folio', 'Proveedor', 'Asunto', 'Proyecto', 'Fecha', 'Moneda', 'Subtotal', 'Impuestos', 'Total', 'Estado'];
    const filas = filtradas.map(o => [
      o.orderNumber, o.supplier?.name || '', o.subject || '', o.project?.name || '',
      fmtDate(o.orderDate), o.currency || 'MXN', o.subtotal ?? 0, o.tax ?? 0, o.total ?? 0,
      poStatusMeta(o.status).label,
    ]);
    const csv = [cab, ...filas].map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordenes-compra-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (cargando) return (
    <div className="p-10 text-center animate-pulse font-black text-gray-400 text-xs tracking-widest uppercase">
      Cargando órdenes de compra...
    </div>
  );

  return (
    <div className="space-y-6 pb-20">

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <HeaderPremium
        eyebrow="OleaControls · Compras"
        titulo="Órdenes de Compra"
        subtitulo={`${ordenes.length} documento${ordenes.length !== 1 ? 's' : ''} en el sistema`}
        accion={
          <>
            <BotonFantasma onClick={() => navigate('/compras/proveedores')}>
              <Building2 size={15} /> Proveedores
            </BotonFantasma>
            {puedeEditar && (
              <BotonPrimario onClick={nueva} disabled={creando}>
                {creando ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                Nueva Orden
              </BotonPrimario>
            )}
          </>
        }
        kpis={[
          { label: 'Comprometido',   value: money(kpis.comprometido, ''),  color: '#a5b4fc', accent: 'rgba(165,180,252,.15)' },
          { label: 'Autorizado',     value: money(kpis.autorizado, ''),    color: '#6ee7b7', accent: 'rgba(110,231,183,.15)' },
          { label: 'En firma',       value: money(kpis.montoEnFirma, ''),  color: '#fcd34d', accent: 'rgba(252,211,77,.12)'  },
          { label: 'Por autorizar',  value: kpis.enFirma,                  color: '#fcd34d', accent: 'rgba(252,211,77,.12)'  },
          { label: 'Borradores',     value: kpis.borradores,               color: '#cbd5e1', accent: 'rgba(203,213,225,.12)' },
        ]}
      />

      {/* Aviso de pendientes de firma */}
      {kpis.enFirma > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="mr-auto min-w-0">
            <p className="text-[11px] font-black text-amber-800">
              {kpis.enFirma === 1 ? '1 orden espera autorización' : `${kpis.enFirma} órdenes esperan autorización`}
            </p>
            <p className="text-[10px] font-bold text-amber-600">{money(kpis.montoEnFirma)} detenidos</p>
          </div>
          <button
            onClick={() => setEstado('SOLICITADA')}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-amber-700 transition-colors"
          >
            Ver pendientes
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <p className="text-[12px] font-bold text-red-600">{error}</p>
        </div>
      )}

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <CajaFiltro>
          <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar folio, proveedor, asunto o proyecto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#0f172a', flex: 1, minWidth: 0 }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
              <X size={12} style={{ color: '#94a3b8' }} />
            </button>
          )}
        </CajaFiltro>

        <CajaFiltro activo={proveedorId !== 'ALL'} flex="0 1 260px">
          <Building2 size={14} style={{ color: proveedorId !== 'ALL' ? '#6366f1' : '#94a3b8', flexShrink: 0 }} />
          <select
            value={proveedorId}
            onChange={e => setProveedorId(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none', flex: 1, cursor: 'pointer',
              fontSize: 12, fontWeight: 800, color: proveedorId !== 'ALL' ? '#4338ca' : '#64748b',
              maxWidth: '100%', textOverflow: 'ellipsis', minWidth: 0,
            }}
          >
            <option value="ALL">Todos los proveedores ({ordenes.length})</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.name} ({p.count})</option>)}
          </select>
          {proveedorId !== 'ALL' && (
            <button
              onClick={() => setProveedorId('ALL')}
              title="Quitar filtro"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 6, background: '#eef2ff', border: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              <X size={11} style={{ color: '#6366f1' }} />
            </button>
          )}
        </CajaFiltro>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {FILTROS.map(f => (
            <ChipFiltro key={f.id} label={f.label} color={f.ac} activo={estado === f.id} onClick={() => setEstado(f.id)} />
          ))}
        </div>

        <button
          onClick={exportarCSV}
          title="Exportar a Excel (CSV)"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, fontWeight: 800, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', cursor: 'pointer', transition: 'all .15s', background: '#fff', color: '#059669', border: '1.5px solid #a7f3d0' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#ecfdf5'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
        >
          <FileSpreadsheet size={13} /> Exportar
        </button>
      </div>

      {/* ── Tabla ─────────────────────────────────────────────────────────── */}
      {filtradas.length === 0 ? (
        <VacioTabla icon={ShoppingCart} texto={ordenes.length === 0 ? 'Sin órdenes de compra' : 'Sin resultados'} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Escritorio */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full border-collapse text-left min-w-[940px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <SortTH label="Folio"      col="folio"     sortConfig={sortConfig} onSort={toggleSort} className="pl-4" />
                  <SortTH label="Proveedor"  col="proveedor" sortConfig={sortConfig} onSort={toggleSort} />
                  <SortTH label="Asunto"     col="folio"     sortConfig={sortConfig} onSort={toggleSort} />
                  <SortTH label="Proyecto"   col="proyecto"  sortConfig={sortConfig} onSort={toggleSort} />
                  <SortTH label="Partidas"   col="items"     sortConfig={sortConfig} onSort={toggleSort} align="center" />
                  <SortTH label="Fecha"      col="fecha"     sortConfig={sortConfig} onSort={toggleSort} />
                  <th className="px-3 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Firmas</th>
                  <SortTH label="Total"      col="total"     sortConfig={sortConfig} onSort={toggleSort} align="right" />
                  <SortTH label="Estado"     col="estado"    sortConfig={sortConfig} onSort={toggleSort} align="center" />
                  <th className="px-3 py-2.5 pr-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginadas.map((o, idx) => {
                  const est = estiloDe(o.status);
                  const meta = poStatusMeta(o.status);
                  const firmadas = (o.approvals || []).filter(a => a.decision === 'APROBADA').length;
                  const requeridas = firmasRequeridas(o.total);
                  const enFirma = ['SOLICITADA', 'EN_REVISION'].includes(o.status);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/compras/${o.id}`)}
                      className={cn(
                        'group cursor-pointer border-b border-slate-100 transition-colors',
                        idx % 2 ? 'bg-slate-50/40 hover:bg-emerald-50/40' : 'bg-white hover:bg-emerald-50/40'
                      )}
                    >
                      <td className="pl-4 pr-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: est.accent }} />
                          <span className="text-[11px] font-black font-mono text-slate-700 tracking-tight">{o.orderNumber}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="block max-w-[180px] truncate text-xs font-black text-slate-900 transition-colors group-hover:text-emerald-700">
                          {o.supplier?.name || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 max-w-[170px] truncate text-[11px] font-semibold text-slate-500">{o.subject || '—'}</td>
                      <td className="px-3 py-2.5 max-w-[150px] truncate text-[11px] font-semibold text-slate-500">{o.project?.name || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[11px] font-black text-slate-700 tabular-nums">{o._count?.items ?? 0}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-bold text-slate-500">{fmtDate(o.orderDate)}</td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {enFirma ? (
                          <span className="text-[10px] font-black text-amber-600 tabular-nums">{firmadas}/{requeridas}</span>
                        ) : ['APROBADA', 'ENVIADA', 'RECIBIDA', 'FACTURADA', 'PAGADA'].includes(o.status) ? (
                          <CheckCircle2 size={13} className="mx-auto text-emerald-500" />
                        ) : o.status === 'RECHAZADA' ? (
                          <XCircle size={13} className="mx-auto text-red-400" />
                        ) : (
                          <span className="text-[11px] font-bold text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="whitespace-nowrap text-xs font-black font-mono text-slate-900 tabular-nums">
                          {money(o.total, o.currency)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wide"
                          style={{ background: est.bg, color: est.text, border: `1.5px solid ${est.border}` }}
                        >
                          {meta.short}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 pr-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/compras/${o.id}`)}
                            title="Abrir"
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-all hover:bg-slate-900 hover:text-white"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => navigate(`/compras/${o.id}`)}
                            title="PDF — se descarga desde la orden"
                            className="rounded-lg bg-blue-50 p-1.5 text-blue-500 transition-all hover:bg-blue-500 hover:text-white"
                          >
                            <FileDown size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Móvil */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginadas.map(o => {
              const est = estiloDe(o.status);
              const meta = poStatusMeta(o.status);
              const firmadas = (o.approvals || []).filter(a => a.decision === 'APROBADA').length;
              const requeridas = firmasRequeridas(o.total);
              const enFirma = ['SOLICITADA', 'EN_REVISION'].includes(o.status);
              return (
                <button
                  key={o.id}
                  onClick={() => navigate(`/compras/${o.id}`)}
                  className="flex w-full items-start gap-3 p-4 text-left transition-colors active:bg-emerald-50/50"
                >
                  <span className="mt-0.5 h-10 w-1 flex-shrink-0 rounded-full" style={{ background: est.accent }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-black text-slate-700">{o.orderNumber}</span>
                      <span
                        className="ml-auto whitespace-nowrap rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wide"
                        style={{ background: est.bg, color: est.text, border: `1.5px solid ${est.border}` }}
                      >
                        {meta.short}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[13px] font-black text-slate-900">{o.supplier?.name || '—'}</p>
                    {o.subject && <p className="truncate text-[11px] font-semibold text-slate-500">{o.subject}</p>}
                    <div className="mt-2 flex items-center gap-3">
                      <span className="font-mono text-[12px] font-black tabular-nums text-slate-900">{money(o.total, o.currency)}</span>
                      {enFirma && <span className="text-[10px] font-black tabular-nums text-amber-600">{firmadas}/{requeridas} firmas</span>}
                      <span className="ml-auto text-[10px] font-bold text-slate-400">{fmtDate(o.orderDate)}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="mt-3 flex-shrink-0 text-slate-300" />
                </button>
              );
            })}
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtradas.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            noun="orden"
            nounPlural="órdenes"
          />
        </div>
      )}

      {/* Política de autorización */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
          Política de autorización por monto
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[1000, 10000, 50000].map(monto => {
            const t = tramoDe(monto);
            return (
              <div key={t.label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <p className="text-[11px] font-black text-slate-800">{t.label}</p>
                <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                  {t.firmas} {t.firmas === 1 ? 'firma' : 'firmas'}{t.requiereDireccion && ' · una de Dirección'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
