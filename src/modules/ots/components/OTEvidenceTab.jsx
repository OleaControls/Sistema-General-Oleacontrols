import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, AlertTriangle, Plus, Loader2, Trash2, X, AlertCircle, Clock,
} from 'lucide-react';
import { otService } from '@/api/otService';
import { comprimirFoto } from '@/lib/photo';
import { cn } from '@/lib/utils';

/* Evidencias e incidentes capturados durante la jornada, sin esperar al cierre
   del acta. Un incidente es una evidencia con type 'INCIDENT': misma tabla,
   distinto tratamiento (se avisa al supervisor por Telegram al registrarlo). */

const fmtCuando = (d) =>
  d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

function Vacio({ icon: Icon, texto, pista }) {
  return (
    <div className="py-14 flex flex-col items-center justify-center gap-2.5 px-6 text-center">
      <Icon className="h-9 w-9 text-gray-200" />
      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{texto}</p>
      {pista && <p className="text-[11px] text-gray-400 font-medium max-w-xs">{pista}</p>}
    </div>
  );
}

function Tarjeta({ ev, esIncidente, puedeBorrar, onBorrar, borrando }) {
  return (
    <div className={cn(
      'flex gap-4 items-start rounded-2xl border p-3',
      esIncidente ? 'border-red-100 bg-red-50/40' : 'border-gray-100 bg-white'
    )}>
      <a
        href={ev.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('shrink-0 h-24 w-24 rounded-2xl overflow-hidden border bg-gray-50',
          esIncidente ? 'border-red-100' : 'border-gray-100')}
      >
        <img src={ev.url} alt={ev.description || 'Evidencia'} className="w-full h-full object-cover" />
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[9px] font-black uppercase tracking-widest',
            esIncidente ? 'text-red-500' : 'text-gray-400'
          )}>
            {esIncidente ? 'Incidente' : 'Evidencia'}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
            <Clock className="h-2.5 w-2.5" /> {fmtCuando(ev.createdAt)}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-700 leading-relaxed mt-1.5">
          {ev.description || <span className="text-gray-300 italic">Sin descripción</span>}
        </p>
      </div>
      {puedeBorrar && (
        <button
          type="button"
          onClick={() => onBorrar(ev.id)}
          disabled={borrando}
          aria-label="Eliminar"
          className="shrink-0 p-2 rounded-xl border border-gray-200 text-gray-300 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-40"
        >
          {borrando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

/** Formulario de captura: una foto + su descripción, antes de enviarla. */
function Captura({ tipo, onCancelar, onGuardar, guardando }) {
  const [foto, setFoto] = useState(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState(null);
  const [leyendo, setLeyendo] = useState(false);
  const esIncidente = tipo === 'INCIDENT';

  const elegir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLeyendo(true);
    setError(null);
    try {
      setFoto(await comprimirFoto(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setLeyendo(false);
    }
  };

  return (
    <div className={cn(
      'rounded-2xl border-2 p-5 space-y-4',
      esIncidente ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-gray-50/60'
    )}>
      <div className="flex items-center justify-between">
        <p className={cn('text-[10px] font-black uppercase tracking-widest',
          esIncidente ? 'text-red-600' : 'text-gray-600')}>
          {esIncidente ? 'Reportar incidente' : 'Nueva evidencia'}
        </p>
        <button type="button" onClick={onCancelar} aria-label="Cancelar"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-4 items-start">
        <label className={cn(
          'shrink-0 h-24 w-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors',
          esIncidente ? 'border-red-200 hover:border-red-400 text-red-400' : 'border-gray-300 hover:border-gray-500 text-gray-400'
        )}>
          {leyendo
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : foto
              ? <img src={foto} alt="Foto seleccionada" className="w-full h-full object-cover" />
              : <><Camera className="h-5 w-5 mb-1" /><span className="text-[8px] font-black uppercase">Foto</span></>}
          <input type="file" accept="image/*" className="hidden" onChange={elegir} />
        </label>
        <textarea
          rows={4}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder={esIncidente ? 'Qué pasó...' : 'Qué se ve en la foto...'}
          className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-gray-900 transition-all resize-none"
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-red-600">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}

      <button
        type="button"
        disabled={!foto || guardando}
        onClick={() => onGuardar({ url: foto, description: texto, type: tipo })}
        className={cn(
          'cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-40',
          esIncidente ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-950 hover:bg-gray-800'
        )}
      >
        {guardando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        {esIncidente ? 'Reportar' : 'Guardar'}
      </button>
    </div>
  );
}

export default function OTEvidenceTab({ otId, otCerrada, puedeEditar }) {
  const [lista, setLista]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState(null);
  const [capturando, setCapturando] = useState(null); // 'IMAGE' | 'INCIDENT' | null
  const [guardando, setGuardando]   = useState(false);
  const [borrando, setBorrando]     = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setLista(await otService.getOTEvidences(otId));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [otId]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (payload) => {
    setGuardando(true);
    setError(null);
    try {
      await otService.addOTEvidence(otId, payload);
      setCapturando(null);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (evidenceId) => {
    setBorrando(evidenceId);
    try {
      await otService.deleteOTEvidence(otId, evidenceId);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setBorrando(null);
    }
  };

  const incidentes = lista.filter(e => e.type === 'INCIDENT');
  const evidencias = lista.filter(e => e.type !== 'INCIDENT');
  const editable = puedeEditar && !otCerrada;

  if (cargando) {
    return (
      <div className="bg-white border border-gray-100 rounded-[1.75rem] py-16 flex flex-col items-center gap-3 shadow-sm">
        <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Cargando evidencias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {otCerrada && (
        <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
          <AlertCircle className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-[11px] font-medium text-gray-500 leading-relaxed">
            La orden ya está cerrada. Las evidencias quedan como registro histórico y no se pueden modificar.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-[11px] font-bold text-red-700 leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Evidencias ── */}
      <div className="bg-white border border-gray-100 rounded-[1.75rem] overflow-hidden shadow-sm">
        <div className="px-7 py-5 border-b border-gray-50 flex items-center gap-3">
          <Camera className="h-4 w-4 text-gray-400" />
          <div className="flex-1 min-w-0">
            <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Evidencias</h3>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              Súbelas conforme avanzas; se anexan al acta al cerrar
            </p>
          </div>
          {editable && capturando !== 'IMAGE' && (
            <button
              type="button"
              onClick={() => setCapturando('IMAGE')}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-3 w-3" /> Subir
            </button>
          )}
        </div>
        <div className="p-7 space-y-3">
          {capturando === 'IMAGE' && (
            <Captura tipo="IMAGE" guardando={guardando} onGuardar={guardar} onCancelar={() => setCapturando(null)} />
          )}
          {evidencias.length === 0 && capturando !== 'IMAGE'
            ? <Vacio icon={Camera} texto="Sin evidencias" pista="Documenta el trabajo con fotos y su descripción." />
            : evidencias.map(ev => (
                <Tarjeta key={ev.id} ev={ev} esIncidente={false} puedeBorrar={editable}
                  onBorrar={borrar} borrando={borrando === ev.id} />
              ))}
        </div>
      </div>

      {/* ── Incidentes ── */}
      <div className="bg-white border border-red-100 rounded-[1.75rem] overflow-hidden shadow-sm">
        <div className="px-7 py-5 border-b border-red-50 flex items-center gap-3 bg-red-50/50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <div className="flex-1 min-w-0">
            <h3 className="text-[10px] font-black text-red-700 uppercase tracking-widest">Incidentes</h3>
            <p className="text-[10px] text-red-400 font-medium mt-0.5">
              Al reportar uno se avisa al supervisor de inmediato
            </p>
          </div>
          {editable && capturando !== 'INCIDENT' && (
            <button
              type="button"
              onClick={() => setCapturando('INCIDENT')}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
            >
              <Plus className="h-3 w-3" /> Reportar
            </button>
          )}
        </div>
        <div className="p-7 space-y-3">
          {capturando === 'INCIDENT' && (
            <Captura tipo="INCIDENT" guardando={guardando} onGuardar={guardar} onCancelar={() => setCapturando(null)} />
          )}
          {incidentes.length === 0 && capturando !== 'INCIDENT'
            ? <Vacio icon={AlertTriangle} texto="Sin incidentes" pista="Si algo sale mal, repórtalo aquí con su foto." />
            : incidentes.map(ev => (
                <Tarjeta key={ev.id} ev={ev} esIncidente puedeBorrar={editable}
                  onBorrar={borrar} borrando={borrando === ev.id} />
              ))}
        </div>
      </div>
    </div>
  );
}
