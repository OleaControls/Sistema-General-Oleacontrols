import React, { useState, useEffect } from 'react';
import {
  Sliders, Plus, Trash2,
  ChevronUp, ChevronDown, Save, RotateCcw, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { DEFAULT_STAGES } from './SalesPipeline';

// Paleta alineada al esquema que consume DealsKanban: cada etapa lleva
// color (punto) + ring + text + bg. Cubre además los colores de las etapas por defecto.
const COLOR_OPTIONS = [
  { key: 'slate',   color: 'bg-slate-400',   ring: 'ring-slate-200',   text: 'text-slate-600',   bg: 'bg-slate-50',   hex: '#94a3b8' },
  { key: 'blue',    color: 'bg-blue-400',    ring: 'ring-blue-200',    text: 'text-blue-600',    bg: 'bg-blue-50',    hex: '#60a5fa' },
  { key: 'indigo',  color: 'bg-indigo-500',  ring: 'ring-indigo-200',  text: 'text-indigo-600',  bg: 'bg-indigo-50',  hex: '#6366f1' },
  { key: 'violet',  color: 'bg-violet-500',  ring: 'ring-violet-200',  text: 'text-violet-600',  bg: 'bg-violet-50',  hex: '#8b5cf6' },
  { key: 'amber',   color: 'bg-amber-500',   ring: 'ring-amber-200',   text: 'text-amber-700',   bg: 'bg-amber-50',   hex: '#f59e0b' },
  { key: 'orange',  color: 'bg-orange-500',  ring: 'ring-orange-200',  text: 'text-orange-700',  bg: 'bg-orange-50',  hex: '#f97316' },
  { key: 'purple',  color: 'bg-purple-500',  ring: 'ring-purple-200',  text: 'text-purple-600',  bg: 'bg-purple-50',  hex: '#a855f7' },
  { key: 'pink',    color: 'bg-pink-500',    ring: 'ring-pink-200',    text: 'text-pink-600',    bg: 'bg-pink-50',    hex: '#ec4899' },
  { key: 'rose',    color: 'bg-rose-500',    ring: 'ring-rose-200',    text: 'text-rose-600',    bg: 'bg-rose-50',    hex: '#f43f5e' },
  { key: 'yellow',  color: 'bg-yellow-500',  ring: 'ring-yellow-200',  text: 'text-yellow-700',  bg: 'bg-yellow-50',  hex: '#eab308' },
  { key: 'emerald', color: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700', bg: 'bg-emerald-50', hex: '#10b981' },
  { key: 'teal',    color: 'bg-teal-500',    ring: 'ring-teal-200',    text: 'text-teal-600',    bg: 'bg-teal-50',    hex: '#14b8a6' },
  { key: 'red',     color: 'bg-red-500',     ring: 'ring-red-200',     text: 'text-red-600',     bg: 'bg-red-50',     hex: '#ef4444' },
  { key: 'gray',    color: 'bg-gray-500',    ring: 'ring-gray-200',    text: 'text-gray-600',    bg: 'bg-gray-50',    hex: '#6b7280' },
];

function getColorOption(colorClass) {
  return COLOR_OPTIONS.find(c => c.color === colorClass) || COLOR_OPTIONS[0];
}

export default function PipelineSettings() {
  const [stages, setStages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/api/config?key=CRM_PIPELINE_STAGES')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setStages(data);
        else setStages(DEFAULT_STAGES);
      })
      .catch(() => setStages(DEFAULT_STAGES));
  }, []);

  const updateStage = (index, field, value) => {
    setStages(prev => prev.map((s, i) => {
      if (i !== index) return s;
      if (field === 'colorKey') {
        const opt = COLOR_OPTIONS.find(c => c.key === value) || COLOR_OPTIONS[0];
        return { ...s, color: opt.color, bg: opt.bg, ring: opt.ring, text: opt.text };
      }
      return { ...s, [field]: value };
    }));
  };

  const moveStage = (index, dir) => {
    setStages(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addStage = () => {
    const opt = COLOR_OPTIONS[stages.length % COLOR_OPTIONS.length];
    setStages(prev => [
      ...prev,
      {
        id: `STAGE_${Date.now()}`,
        label: 'Nueva Etapa',
        color: opt.color,
        bg: opt.bg,
        ring: opt.ring,
        text: opt.text,
        prob: 50
      }
    ]);
  };

  const removeStage = (index) => {
    if (stages.length <= 1) return;
    setStages(prev => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/config', {
        method: 'POST',
        body: JSON.stringify({ key: 'CRM_PIPELINE_STAGES', value: stages })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (window.confirm('¿Restaurar etapas predeterminadas?')) setStages(DEFAULT_STAGES);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic flex items-center gap-3">
            <Sliders className="h-7 w-7 text-primary" /> Pipeline
          </h2>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">
            Configura las etapas del embudo de ventas
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={reset} className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 text-gray-500 font-black text-[10px] uppercase hover:bg-gray-50 transition-all">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button onClick={save} disabled={saving} className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg",
            saved ? "bg-emerald-500 text-white" : "bg-gray-900 text-white hover:bg-primary"
          )}>
            {saved ? <><CheckCircle2 className="h-4 w-4" /> Guardado</> : <><Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar'}</>}
          </button>
        </div>
      </div>

      {/* Stages List */}
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const colorOpt = getColorOption(stage.color);
          return (
            <div key={stage.id} className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-5 space-y-4">
              {/* Top row */}
              <div className="flex items-center gap-3">
                {/* Move buttons */}
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveStage(index, -1)} disabled={index === 0} className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-20 transition-all">
                    <ChevronUp className="h-3 w-3 text-gray-500" />
                  </button>
                  <button onClick={() => moveStage(index, 1)} disabled={index === stages.length - 1} className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-20 transition-all">
                    <ChevronDown className="h-3 w-3 text-gray-500" />
                  </button>
                </div>

                {/* Color dot indicator */}
                <div className={cn("w-3 h-3 rounded-full flex-shrink-0 shadow-sm", stage.color)} />

                {/* Name input */}
                <input
                  value={stage.label}
                  onChange={e => updateStage(index, 'label', e.target.value)}
                  className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 font-black text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/30"
                  placeholder="Nombre de etapa"
                />

                {/* Delete */}
                <button onClick={() => removeStage(index)} disabled={stages.length <= 1} className="p-2.5 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 disabled:opacity-20 transition-all flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Bottom row: probability + color */}
              <div className="flex items-center gap-4 pl-9">
                {/* Probability */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Probabilidad de cierre</span>
                    <span className="text-[11px] font-black text-gray-900">{stage.prob ?? 0}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={stage.prob ?? 0}
                    onChange={e => updateStage(index, 'prob', parseInt(e.target.value))}
                    className="w-full accent-current h-1.5 rounded-full cursor-pointer"
                    style={{ accentColor: colorOpt.hex }}
                  />
                </div>

                {/* Color picker */}
                <div className="flex gap-1.5 flex-wrap justify-end" style={{ maxWidth: '140px' }}>
                  {COLOR_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => updateStage(index, 'colorKey', opt.key)}
                      style={{ backgroundColor: opt.hex }}
                      className={cn(
                        "w-5 h-5 rounded-full transition-all",
                        stage.color === opt.color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-110 opacity-70 hover:opacity-100"
                      )}
                      title={opt.key}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Stage */}
      <button onClick={addStage} className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Agregar Etapa
      </button>

      {/* Preview */}
      <div className="bg-gray-50 rounded-[2rem] p-6 space-y-4">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vista previa del pipeline</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {stages.map((stage, i) => (
            <div key={stage.id} className="flex-shrink-0 flex flex-col items-center gap-1.5">
              <div className={cn("w-8 h-8 rounded-xl shadow-sm", stage.color)} />
              <span className="text-[8px] font-black text-gray-600 text-center leading-tight max-w-[60px]">{stage.label}</span>
              <span className="text-[8px] font-bold text-gray-400">{stage.prob ?? 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
