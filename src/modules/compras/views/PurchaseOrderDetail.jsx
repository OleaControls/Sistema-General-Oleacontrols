import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Save, Loader2, AlertCircle, FileDown, Send,
  CheckCircle2, XCircle, ChevronRight, ShieldCheck, Copy, RotateCcw, Ban,
} from 'lucide-react';
import { HeaderPremium, BotonPrimario, BotonFantasma } from '../components/ComprasUI';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/AuthContext';
import comprasService from '@/api/comprasService';
import { projectService } from '@/api/projectService';
import { generarOrdenCompraPDF } from '../utils/ordenCompraPDF';
import {
  poStatusMeta, money, calcularTotales, calcularPartida, firmasRequeridas,
  requiereDireccion, tramoDe, siguienteEstado, PO_EDITABLES, PO_CERRADAS,
  puedeEditarCompras, puedeAutorizar, esDireccion, FORMAS_PAGO, MONEDAS,
} from '@/lib/compras';

const PARTIDA_VACIA = { description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0.16 };

const hoy = () => new Date().toISOString().slice(0, 10);
const fechaInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const FORM_VACIO = {
  supplierId: '', projectId: '', subject: '', ownerName: '',
  orderDate: hoy(), deliveryDate: '', paymentMethod: 'Transferencia',
  currency: 'MXN', exchangeRate: 1, carrier: '', contactName: '',
  billingAddress: '', shippingAddress: '', terms: '', adjustment: 0,
};

const input = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-800 outline-none focus:border-slate-400 placeholder:text-gray-300 placeholder:font-medium';
const label = 'text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5';

function Campo({ children, titulo, className }) {
  return (
    <div className={className}>
      <label className={label}>{titulo}</label>
      {children}
    </div>
  );
}

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const nueva = !id || id === 'nueva';
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [user?.role].filter(Boolean);

  const [orden, setOrden] = useState(null);
  const [form, setForm] = useState({ ...FORM_VACIO, ownerName: user?.name || '' });
  const [items, setItems] = useState([{ ...PARTIDA_VACIA }]);
  const [proveedores, setProveedores] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(!nueva);
  const [guardando, setGuardando] = useState(false);
  const [ocupado, setOcupado] = useState(null);   // acción de flujo en curso
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rechazando, setRechazando] = useState(false);

  const puedeEditar   = puedeEditarCompras(roles);
  const puedeFirmar   = puedeAutorizar(roles);
  const soyDireccion  = esDireccion(roles);

  // ── Carga ────────────────────────────────────────────────────────────────
  useEffect(() => {
    comprasService.proveedores().then(setProveedores).catch(() => {});
    projectService.list().then(ps => setProyectos(Array.isArray(ps) ? ps : [])).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    if (nueva) return;
    setCargando(true);
    try {
      const o = await comprasService.orden(id);
      setOrden(o);
      setForm({
        supplierId: o.supplierId || '', projectId: o.projectId || '',
        subject: o.subject || '', ownerName: o.ownerName || '',
        orderDate: fechaInput(o.orderDate), deliveryDate: fechaInput(o.deliveryDate),
        paymentMethod: o.paymentMethod || '', currency: o.currency || 'MXN',
        exchangeRate: o.exchangeRate ?? 1, carrier: o.carrier || '',
        contactName: o.contactName || '', billingAddress: o.billingAddress || '',
        shippingAddress: o.shippingAddress || '', terms: o.terms || '',
        adjustment: o.adjustment || 0,
      });
      setItems(o.items?.length ? o.items.map(i => ({ ...i })) : [{ ...PARTIDA_VACIA }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [id, nueva]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Derivados ────────────────────────────────────────────────────────────
  const totales = useMemo(() => calcularTotales(items, form.adjustment), [items, form.adjustment]);
  const proveedor = useMemo(() => proveedores.find(p => p.id === form.supplierId), [proveedores, form.supplierId]);
  const estado = orden?.status || 'BORRADOR';
  const meta = poStatusMeta(estado);
  const editable = nueva || (puedeEditar && PO_EDITABLES.includes(estado));
  const cerrada = PO_CERRADAS.includes(estado);

  const firmas = (orden?.approvals || []).filter(a => a.decision === 'APROBADA');
  const requeridas = firmasRequeridas(totales.total);
  const tramo = tramoDe(totales.total);
  const yaFirme = firmas.some(a => a.approverId === user?.id);
  const enFirma = ['SOLICITADA', 'EN_REVISION'].includes(estado);
  const faltaDireccion = requiereDireccion(totales.total) && !firmas.some(a => a.approverRole === 'ADMIN');

  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const addItem = () => setItems(prev => [...prev, { ...PARTIDA_VACIA }]);
  const delItem = (i) => setItems(prev => (prev.length === 1 ? [{ ...PARTIDA_VACIA }] : prev.filter((_, idx) => idx !== i)));

  const copiarDireccion = () => setForm(p => ({ ...p, shippingAddress: p.billingAddress }));

  // Al elegir proveedor se arrastra su domicilio fiscal y su contacto.
  const elegirProveedor = (e) => {
    const supplierId = e.target.value;
    const p = proveedores.find(x => x.id === supplierId);
    setForm(prev => ({
      ...prev,
      supplierId,
      contactName: prev.contactName || p?.contactName || '',
      paymentMethod: prev.paymentMethod || p?.paymentTerms || '',
      billingAddress: prev.billingAddress || [p?.address, p?.city, p?.state, p?.zip, p?.country].filter(Boolean).join(', '),
    }));
  };

  // ── Guardar ──────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!form.supplierId) { setError('Selecciona un proveedor.'); return; }
    if (!items.some(i => i.description?.trim())) { setError('Agrega al menos una partida con descripción.'); return; }
    setGuardando(true); setError(null); setOk(false);
    try {
      const cuerpo = { ...form, items, adjustment: Number(form.adjustment) || 0 };
      const res = nueva
        ? await comprasService.crearOrden(cuerpo)
        : await comprasService.actualizarOrden(id, cuerpo);
      setOk(true);
      setTimeout(() => setOk(false), 2200);
      if (nueva) navigate(`/compras/${res.id}`, { replace: true });
      else { setOrden(res); setItems(res.items?.length ? res.items : [{ ...PARTIDA_VACIA }]); }
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const accion = async (nombre, body = {}) => {
    setOcupado(nombre); setError(null);
    try {
      const res = await comprasService.accion(id, nombre, { approverName: user?.name, ...body });
      setOrden(res);
      setItems(res.items?.length ? res.items : [{ ...PARTIDA_VACIA }]);
      setRechazando(false);
      setMotivoRechazo('');
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(null);
    }
  };

  const descargarPDF = async () => {
    setOcupado('pdf');
    try { await generarOrdenCompraPDF(orden, { download: true }); }
    catch (e) { setError('No se pudo generar el PDF: ' + e.message); }
    finally { setOcupado(null); }
  };

  if (cargando) {
    return <div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="space-y-6 pb-20">

      {/* Encabezado */}
      <HeaderPremium
        eyebrow={nueva ? 'OleaControls · Compras' : `OleaControls · ${meta.label}`}
        titulo={nueva ? 'Nueva Orden' : orden?.orderNumber}
        subtitulo={
          nueva
            ? 'Se guarda como borrador hasta que la mandes a autorización'
            : `${orden?.supplier?.name || '—'} · creada por ${orden?.createdByName || '—'}`
        }
        accion={
          <>
            <BotonFantasma onClick={() => navigate('/compras')}>
              <ArrowLeft size={15} /> Órdenes
            </BotonFantasma>
            {!nueva && (
              <BotonFantasma onClick={descargarPDF} disabled={ocupado === 'pdf'}>
                {ocupado === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                PDF
              </BotonFantasma>
            )}
            {editable && (
              <BotonPrimario onClick={guardar} disabled={guardando}>
                {guardando ? <Loader2 size={16} className="animate-spin" />
                  : ok ? <CheckCircle2 size={16} /> : <Save size={16} />}
                {ok ? 'Guardada' : 'Guardar'}
              </BotonPrimario>
            )}
          </>
        }
        kpis={nueva ? [] : [
          { label: 'Subtotal',  value: money(orden?.subtotal, ''), color: '#a5b4fc', accent: 'rgba(165,180,252,.15)' },
          { label: 'Impuestos', value: money(orden?.tax, ''),      color: '#c4b5fd', accent: 'rgba(196,181,253,.12)' },
          { label: 'Total',     value: money(orden?.total, orden?.currency), color: '#6ee7b7', accent: 'rgba(110,231,183,.15)' },
          { label: 'Partidas',  value: orden?.items?.length ?? 0,  color: '#cbd5e1', accent: 'rgba(203,213,225,.12)' },
          { label: 'Firmas',    value: `${firmas.length} / ${requeridas}`, color: '#fcd34d', accent: 'rgba(252,211,77,.12)' },
        ]}
      />

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-2xl bg-red-50 border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[12px] font-bold text-red-600">{error}</p>
        </div>
      )}

      {!nueva && estado === 'RECHAZADA' && orden?.rejectionReason && (
        <div className="flex items-start gap-2 p-4 rounded-2xl bg-red-50 border border-red-200">
          <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Rechazada</p>
            <p className="text-[12px] font-bold text-red-700">{orden.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* ── Autorización ───────────────────────────────────────────────── */}
      {!nueva && (
        <div className={cn(
          'rounded-2xl border p-5',
          estado === 'APROBADA' ? 'border-emerald-200 bg-emerald-50/60'
            : enFirma ? 'border-amber-200 bg-amber-50/60'
            : 'border-gray-200 bg-gray-50/60'
        )}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <ShieldCheck className={cn('h-4 w-4 shrink-0', estado === 'APROBADA' ? 'text-emerald-600' : enFirma ? 'text-amber-600' : 'text-gray-400')} />
            <div className="mr-auto min-w-0">
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Autorización</p>
              <p className="text-[10px] font-bold text-gray-400">
                {tramo.label} · {requeridas} {requeridas === 1 ? 'firma' : 'firmas'}
                {tramo.requiereDireccion && ' · una debe ser de Dirección'}
              </p>
            </div>
            <span className="text-[11px] font-black text-gray-800 tabular-nums">
              {firmas.length} de {requeridas}
            </span>
          </div>

          {firmas.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {firmas.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-[12px] font-bold text-gray-700">{a.approverName}</span>
                  {a.approverRole === 'ADMIN' && (
                    <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Dirección</span>
                  )}
                  {a.comment && <span className="text-[11px] font-medium text-gray-400 truncate">— {a.comment}</span>}
                </div>
              ))}
            </div>
          )}

          {enFirma && faltaDireccion && !soyDireccion && (
            <p className="text-[11px] font-bold text-amber-700 mb-3">
              Por el monto, esta orden necesita la firma de Dirección para quedar aprobada.
            </p>
          )}

          {/* Acciones de flujo */}
          <div className="flex flex-wrap gap-2">
            {puedeEditar && (estado === 'BORRADOR' || estado === 'RECHAZADA') && (
              <button
                onClick={() => accion('solicitar')}
                disabled={ocupado === 'solicitar'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {ocupado === 'solicitar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {estado === 'RECHAZADA' ? 'Reenviar a autorización' : 'Enviar a autorización'}
              </button>
            )}

            {puedeFirmar && enFirma && !yaFirme && !rechazando && (
              <>
                <button
                  onClick={() => accion('autorizar')}
                  disabled={ocupado === 'autorizar'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {ocupado === 'autorizar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Autorizar
                </button>
                <button
                  onClick={() => setRechazando(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 text-[10px] font-black uppercase tracking-wider hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" /> Rechazar
                </button>
              </>
            )}

            {puedeFirmar && enFirma && yaFirme && (
              <span className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ya firmaste — falta otra autorización
              </span>
            )}

            {puedeEditar && ['APROBADA', 'ENVIADA', 'RECIBIDA', 'FACTURADA'].includes(estado) && (
              <button
                onClick={() => accion('avanzar')}
                disabled={ocupado === 'avanzar'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {ocupado === 'avanzar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Marcar como {poStatusMeta(siguienteEstado(estado)).short.toLowerCase()}
              </button>
            )}

            {puedeEditar && !cerrada && (
              <button
                onClick={() => { if (confirm('¿Cancelar esta orden de compra?')) accion('cancelar'); }}
                disabled={ocupado === 'cancelar'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 text-[10px] font-black uppercase tracking-wider hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
              >
                <Ban className="h-3.5 w-3.5" /> Cancelar
              </button>
            )}

            {soyDireccion && cerrada && estado !== 'PAGADA' && (
              <button
                onClick={() => accion('reabrir')}
                disabled={ocupado === 'reabrir'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reabrir como borrador
              </button>
            )}
          </div>

          {rechazando && (
            <div className="mt-4 space-y-2">
              <textarea
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                rows={2}
                placeholder="Motivo del rechazo — lo va a leer quien la capturó"
                className="w-full px-3 py-2.5 bg-white border border-red-200 rounded-xl text-[13px] font-bold text-gray-800 outline-none focus:border-red-400 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => { setRechazando(false); setMotivoRechazo(''); }}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider">
                  Cancelar
                </button>
                <button
                  onClick={() => accion('rechazar', { comment: motivoRechazo })}
                  disabled={!motivoRechazo.trim() || ocupado === 'rechazar'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                >
                  {ocupado === 'rechazar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Confirmar rechazo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!editable && !nueva && (
        <p className="text-[11px] font-bold text-gray-400 px-1">
          Esta orden ya no es editable en su estado actual. Los datos se muestran como quedaron autorizados.
        </p>
      )}

      {/* ── Datos de la orden ──────────────────────────────────────────── */}
      <fieldset disabled={!editable} className="space-y-5 disabled:opacity-70">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Datos de la orden</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <Campo titulo="Proveedor *">
              <select value={form.supplierId} onChange={elegirProveedor} className={input}>
                <option value="">— Selecciona —</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}{p.rfc ? ` · ${p.rfc}` : ''}</option>)}
              </select>
            </Campo>
            <Campo titulo="Proyecto">
              <select value={form.projectId} onChange={setF('projectId')} className={input}>
                <option value="">— Sin proyecto —</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </select>
            </Campo>
          </div>

          <Campo titulo="Asunto">
            <input value={form.subject} onChange={setF('subject')} className={input} placeholder="Ej. Material eléctrico para Tienda Norte" />
          </Campo>

          <div className="grid sm:grid-cols-3 gap-4">
            <Campo titulo="Propietario de la orden">
              <input value={form.ownerName} onChange={setF('ownerName')} className={input} placeholder="Quién la solicita" />
            </Campo>
            <Campo titulo="Fecha de orden">
              <input type="date" value={form.orderDate} onChange={setF('orderDate')} className={input} />
            </Campo>
            <Campo titulo="Fecha de entrega">
              <input type="date" value={form.deliveryDate} onChange={setF('deliveryDate')} className={input} />
            </Campo>
          </div>

          <div className="grid sm:grid-cols-4 gap-4">
            <Campo titulo="Forma de pago">
              <select value={form.paymentMethod} onChange={setF('paymentMethod')} className={input}>
                <option value="">— Selecciona —</option>
                {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Campo>
            <Campo titulo="Moneda">
              <select value={form.currency} onChange={setF('currency')} className={input}>
                {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Campo>
            <Campo titulo="Tipo de cambio">
              <input type="number" step="0.0001" min="0" value={form.exchangeRate} onChange={setF('exchangeRate')} className={input} />
            </Campo>
            <Campo titulo="Transportista">
              <input value={form.carrier} onChange={setF('carrier')} className={input} placeholder="Paquetería o flete" />
            </Campo>
          </div>

          <Campo titulo="Contacto en el proveedor">
            <input value={form.contactName} onChange={setF('contactName')} className={input}
              placeholder={proveedor?.contactName || 'Nombre de quien atiende'} />
          </Campo>
        </div>

        {/* Domicilios */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Domicilios</p>
            <button
              type="button" onClick={copiarDireccion} disabled={!editable || !form.billingAddress}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[9px] font-black text-gray-500 uppercase tracking-wider hover:border-gray-300 disabled:opacity-40"
            >
              <Copy className="h-3 w-3" /> Copiar a envío
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo titulo="Domicilio de facturación">
              <textarea rows={3} value={form.billingAddress} onChange={setF('billingAddress')}
                className={cn(input, 'resize-none')} placeholder="Calle, colonia, ciudad, estado, C.P." />
            </Campo>
            <Campo titulo="Domicilio de envío">
              <textarea rows={3} value={form.shippingAddress} onChange={setF('shippingAddress')}
                className={cn(input, 'resize-none')} placeholder="A dónde se entrega el material" />
            </Campo>
          </div>
        </div>

        {/* ── Partidas ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Productos y servicios</p>
            {editable && (
              <button type="button" onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider hover:bg-slate-800">
                <Plus className="h-3 w-3" /> Partida
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: 720 }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['#', 'Producto / Servicio', 'Cant.', 'Precio', 'Descuento', 'IVA', 'Total', ''].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const c = calcularPartida(it);
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 text-[11px] font-black text-gray-300 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 min-w-[200px]">
                        <input value={it.description || ''} onChange={e => setItem(i, 'description', e.target.value)}
                          className={cn(input, 'py-2')} placeholder="Descripción de lo que se compra" />
                      </td>
                      <td className="px-3 py-2 w-[86px]">
                        <input type="number" step="0.01" min="0" value={it.quantity ?? ''} onChange={e => setItem(i, 'quantity', e.target.value)}
                          className={cn(input, 'py-2 text-right')} />
                      </td>
                      <td className="px-3 py-2 w-[110px]">
                        <input type="number" step="0.01" min="0" value={it.unitPrice ?? ''} onChange={e => setItem(i, 'unitPrice', e.target.value)}
                          className={cn(input, 'py-2 text-right')} />
                      </td>
                      <td className="px-3 py-2 w-[104px]">
                        <input type="number" step="0.01" min="0" value={it.discount ?? ''} onChange={e => setItem(i, 'discount', e.target.value)}
                          className={cn(input, 'py-2 text-right')} />
                      </td>
                      <td className="px-3 py-2 w-[92px]">
                        <select value={it.taxRate ?? 0} onChange={e => setItem(i, 'taxRate', Number(e.target.value))}
                          className={cn(input, 'py-2')}>
                          <option value={0}>0%</option>
                          <option value={0.08}>8%</option>
                          <option value={0.16}>16%</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <span className="text-[12px] font-black text-gray-900 tabular-nums">{money(c.total, '')}</span>
                      </td>
                      <td className="px-3 py-2">
                        {editable && (
                          <button type="button" onClick={() => delItem(i)}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors" title="Quitar partida">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="border-t border-gray-200 bg-gray-50/70 p-5 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              {[
                ['Subtotal', totales.subtotal],
                ['Descuento', -totales.discount],
                ['Impuestos', totales.tax],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-500">{k}</span>
                  <span className="text-[12px] font-black text-gray-800 tabular-nums">{money(v, '')}</span>
                </div>
              ))}
              <div className="flex justify-between items-center gap-3">
                <span className="text-[11px] font-bold text-gray-500 shrink-0">Ajuste</span>
                <input type="number" step="0.01" value={form.adjustment} onChange={setF('adjustment')}
                  className="w-28 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-black text-gray-800 text-right outline-none focus:border-slate-400 tabular-nums" />
              </div>
              <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-300">
                <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Total</span>
                <span className="text-lg font-black text-gray-900 tabular-nums">{money(totales.total, form.currency)}</span>
              </div>
              <p className="text-[10px] font-bold text-gray-400 pt-1">
                Requiere {requeridas} {requeridas === 1 ? 'firma' : 'firmas'}
                {requiereDireccion(totales.total) && ', una de Dirección'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <Campo titulo="Términos y condiciones">
            <textarea rows={3} value={form.terms} onChange={setF('terms')} className={cn(input, 'resize-none')}
              placeholder="Condiciones de entrega, garantía, penalizaciones…" />
          </Campo>
        </div>
      </fieldset>
    </div>
  );
}
