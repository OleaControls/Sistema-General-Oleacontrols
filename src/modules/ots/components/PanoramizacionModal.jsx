import React, { useState } from 'react';
import {
  ScanSearch, HardDriveUpload, Boxes, TriangleAlert, GitBranch,
  CheckCircle2, CheckCheck, Target, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

// ── PanoramizacionModal ───────────────────────────────────────────────────────
const PANORAMIZACION_FIELDS = [
  {
    key: 'condicionesSitio',
    icon: ScanSearch,
    label: 'Plática casual',
    placeholder: '¿Cómo está el ambiente en el sitio? Cuéntanos de manera casual qué encontraste al llegar y cómo se siente el entorno.',
  },
  {
    key: 'planEjecucion',
    icon: HardDriveUpload,
    label: 'Plan de ejecución',
    placeholder: '¿Cuál va a ser tu estrategia, ruta o método general para realizar la instalación en este lugar?',
  },
  {
    key: 'requerimientos',
    icon: Boxes,
    label: 'Objetivos',
    placeholder: '¿Cuáles son los objetivos concretos a lograr hoy en este sitio? Lista las metas que deben quedar completadas.',
  },
  {
    key: 'obstaculos',
    icon: TriangleAlert,
    label: 'Obstáculos',
    placeholder: '¿Qué obstáculos o bloqueos encontraste en el sitio? Describe cualquier impedimento, falta de acceso o riesgo identificado.',
  },
  {
    key: 'algoritmos',
    icon: GitBranch,
    label: 'Algoritmos',
    placeholder: '¿Qué pasos o algoritmo vas a seguir para resolver los obstáculos? Describe tu plan de acción paso a paso.',
  },
];

function PanoramizacionModal({ goal, onClose, onSaved }) {
  const [form,   setForm]   = useState({ condicionesSitio: '', planEjecucion: '', requerimientos: '', obstaculos: '', algoritmos: '' });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const canSave = PANORAMIZACION_FIELDS.every(f => form[f.key].trim().length >= 10);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/tech-attendance/panoramizacion', {
        method: 'POST',
        body: JSON.stringify({
          otNumber: goal.otNumber,
          techId:   goal.techId,
          goalId:   goal.id,
          ...form,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSaved(true);
      onSaved(data);
    } catch {
      alert('Error al guardar panoramización');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center touch-none">
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl flex flex-col overflow-hidden shadow-2xl"
        style={{ maxHeight: 'min(92dvh, 92svh, 92vh)' }}
      >
        {/* Header */}
        <div className="bg-gray-950 px-5 py-4 rounded-t-3xl shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                <ScanSearch className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">Panoramización del sitio</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {goal.otNumber} · {goal.clientName}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/60 active:bg-white/10 touch-manipulation">
              <X className="h-4 w-4" />
            </button>
          </div>
          {goal.notes && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30">
              <Target className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] font-black text-amber-300 leading-relaxed">{goal.notes}</p>
            </div>
          )}
          <p className="mt-3 text-[11px] font-bold text-gray-400 leading-relaxed">
            Responde los 5 puntos para desbloquear la jornada. Se registra una sola vez por OT.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4"
             style={{ WebkitOverflowScrolling: 'touch' }}>
          {PANORAMIZACION_FIELDS.map(f => {
            const Icon = f.icon;
            const val  = form[f.key];
            const ok   = val.trim().length >= 10;
            return (
              <div key={f.key} className={cn(
                'rounded-2xl border p-4 space-y-2 transition-all',
                ok ? 'border-violet-200 bg-violet-50/50' : 'border-gray-200 bg-gray-50'
              )}>
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4 shrink-0', ok ? 'text-violet-600' : 'text-gray-400')} />
                  <span className={cn('text-[11px] font-black uppercase tracking-widest', ok ? 'text-violet-700' : 'text-gray-500')}>
                    {f.label}
                  </span>
                  {ok && <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 ml-auto shrink-0" />}
                </div>
                <textarea
                  value={val}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full bg-transparent border-0 text-sm font-bold text-gray-800 placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 pt-3 border-t border-gray-100 pb-4 shrink-0"
             style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {saved ? (
            <div className="w-full min-h-[52px] rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-black text-emerald-600 uppercase tracking-widest">Panoramización registrada</span>
            </div>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="w-full min-h-[52px] rounded-2xl bg-violet-600 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:bg-violet-700 disabled:opacity-40 shadow-lg shadow-violet-200 touch-manipulation transition-all"
              >
                <CheckCheck className="h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar Panoramización'}
              </button>
              {!canSave && (
                <p className="text-center text-[10px] font-bold text-gray-400 mt-2">
                  Completa todas las respuestas (mín. 10 caracteres cada una)
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export default PanoramizacionModal;
