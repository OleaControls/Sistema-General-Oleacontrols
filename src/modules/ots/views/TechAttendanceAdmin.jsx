import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, User2, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle,
  Clock, ChevronLeft, ChevronRight, ClipboardList, Car, ShieldCheck, Pencil, FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { hrService } from '@/api/hrService';
import { useAuth, ROLES } from '@/store/AuthContext';
import { generateAttendanceReportPDF } from '../utils/attendanceReportPDF';

const PERSONAL_LABELS = {
  uniform: 'Uniforme', epp: 'EPP', toolsBasic: 'Herr. básicas',
  toolsSpecial: 'Herr. especiales', materials: 'Materiales',
};
const VEHICLE_LABELS = {
  fuel: 'Combustible', cleanInterior: 'Limp. interior',
  cleanExterior: 'Estética', odometer: 'Tacómetro', functionality: 'Funcionalidad',
};

export default function TechAttendanceAdmin() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const [viewDate,   setViewDate]   = useState(today);
  const [technicians,setTechnicians]= useState([]);
  const [goals,      setGoals]      = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState({ techId: '', clientName: '', clientLocation: '', notes: '' });
  const [editGoalId, setEditGoalId] = useState(null);
  const [activeTab,  setActiveTab]  = useState('goals'); // 'goals' | 'reports'

  useEffect(() => {
    hrService.getEmployees().then(data => {
      const all = Array.isArray(data) ? data : data?.employees || [];
      setTechnicians(all.filter(e => (e.roles || [e.role]).includes(ROLES.TECH)));
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, lRes] = await Promise.all([
        apiFetch(`/api/tech-attendance/goals?date=${viewDate}`),
        apiFetch(`/api/tech-attendance/logs?date=${viewDate}`),
      ]);
      setGoals(gRes.ok ? await gRes.json() : []);
      setLogs(lRes.ok  ? await lRes.json() : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [viewDate]);

  useEffect(() => { load(); }, [load]);

  const prevDay = () => {
    const d = new Date(viewDate); d.setDate(d.getDate() - 1);
    setViewDate(d.toISOString().slice(0, 10));
  };
  const nextDay = () => {
    const d = new Date(viewDate); d.setDate(d.getDate() + 1);
    setViewDate(d.toISOString().slice(0, 10));
  };

  const openNew = () => {
    setEditGoalId(null);
    setForm({ techId: '', clientName: '', clientLocation: '', notes: '' });
    setShowModal(true);
  };
  const openEdit = (g) => {
    setEditGoalId(g.id);
    setForm({ techId: g.techId, clientName: g.clientName, clientLocation: g.clientLocation || '', notes: g.notes || '' });
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.techId || !form.clientName) { alert('Técnico y cliente son requeridos'); return; }
    setSaving(true);
    try {
      const res = await apiFetch('/api/tech-attendance/goals', {
        method: 'POST',
        body: JSON.stringify({ ...form, date: viewDate }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowModal(false);
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta meta?')) return;
    await apiFetch('/api/tech-attendance/goals', { method: 'DELETE', body: JSON.stringify({ id }) });
    load();
  };

  const techMap = Object.fromEntries(technicians.map(t => [t.id, t]));
  const reports = logs.filter(l => l.personalReportSent || l.vehicleReportSent);
  const dayLabel = new Date(viewDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Asistencia Técnicos</h2>
          <p className="text-sm text-gray-500 font-medium mt-1 capitalize">{dayLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Navegador de día */}
          <div className="flex items-center gap-1 bg-white border rounded-2xl px-3 py-2 shadow-sm">
            <button onClick={prevDay} className="p-1 rounded-lg hover:bg-gray-100 transition-all">
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </button>
            <input
              type="date"
              value={viewDate}
              onChange={e => setViewDate(e.target.value)}
              className="text-xs font-bold text-gray-700 bg-transparent border-none outline-none w-32 text-center"
            />
            <button onClick={nextDay} className="p-1 rounded-lg hover:bg-gray-100 transition-all">
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" /> Asignar Meta
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {[
          { id: 'goals',   label: 'Metas del día',  icon: ClipboardList },
          { id: 'reports', label: `Reportes (${reports.length})`, icon: AlertTriangle },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
              activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: METAS ──────────────────────────────────────────────────────── */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-3xl animate-pulse" />)}</div>
          ) : goals.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
              <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="font-black text-gray-400 text-sm">Sin metas asignadas</p>
              <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest mt-1">Usa "Asignar Meta" para agregar</p>
            </div>
          ) : (
            goals.map(g => {
              const log = logs.find(l => l.techId === g.techId);
              const tech = techMap[g.techId] || g.tech;
              return (
                <div key={g.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {tech?.avatar
                        ? <img src={tech.avatar} className="h-11 w-11 rounded-2xl object-cover border shrink-0" alt="" />
                        : <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">{(tech?.name || '?').charAt(0)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm truncate">{tech?.name || g.techId}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User2 className="h-3 w-3 text-primary" />
                          <p className="text-xs font-bold text-gray-700 truncate">{g.clientName}</p>
                        </div>
                        {g.clientLocation && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <p className="text-[11px] font-bold text-gray-400 truncate">{g.clientLocation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Estado del log */}
                      {log ? (
                        <span className={cn(
                          'text-[9px] font-black px-2 py-1 rounded-full border uppercase tracking-wider',
                          log.status === 'COMPLETE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          log.step === 'PERSONAL'   ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          log.step === 'VEHICLE'    ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                                      'bg-gray-100 text-gray-500 border-gray-200'
                        )}>
                          {log.status === 'COMPLETE' ? 'Completado' :
                           log.step === 'PERSONAL'   ? 'En Checklist' :
                           log.step === 'VEHICLE'    ? 'En Vehículo'  : 'Iniciado'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-black px-2 py-1 rounded-full border bg-gray-100 text-gray-400 border-gray-200 uppercase tracking-wider">
                          Sin entrada
                        </span>
                      )}
                      <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/8 transition-all">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Hora entrada y alertas */}
                  {log?.checkInTime && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                        <Clock className="h-3.5 w-3.5 text-emerald-500" /> Entrada: {log.checkInTime}
                      </span>
                      {(log.personalReportSent || log.vehicleReportSent) && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" /> {[log.personalReportSent && 'Equipo', log.vehicleReportSent && 'Vehículo'].filter(Boolean).join(' · ')} — reporte enviado
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB: REPORTES ───────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
              <p className="font-black text-gray-400 text-sm">Sin reportes de faltantes</p>
              <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest mt-1">Todos los técnicos llegaron completos</p>
            </div>
          ) : reports.map(log => {
            const tech = techMap[log.techId] || log.tech;
            return (
              <div key={log.id} className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  {tech?.avatar
                    ? <img src={tech.avatar} className="h-10 w-10 rounded-2xl object-cover border" alt="" />
                    : <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center text-sm font-black text-amber-600">{(tech?.name || '?').charAt(0)}</div>
                  }
                  <div>
                    <p className="font-black text-gray-900 text-sm">{tech?.name || log.techId}</p>
                    <p className="text-[10px] font-bold text-gray-400">Entrada: {log.checkInTime}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    {log.personalReportSent && <ShieldCheck className="h-4 w-4 text-amber-500" />}
                    {log.vehicleReportSent  && <Car         className="h-4 w-4 text-amber-500" />}
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Reporte pendiente
                    </span>
                  </div>
                </div>

                {log.personalReportSent && (
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" /> Equipo personal — faltantes
                      </p>
                      <button
                        onClick={() => generateAttendanceReportPDF(log, tech?.name || log.techId, log.goal, 'personal')}
                        className="flex items-center gap-1 text-[9px] font-black text-amber-700 bg-white border border-amber-300 px-2.5 py-1 rounded-xl hover:bg-amber-100 transition-all"
                      >
                        <FileDown className="h-3 w-3" /> Ver PDF
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(log.checklistPersonal || {}).filter(([,v]) => v === false).map(([k]) => (
                        <span key={k} className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
                          {PERSONAL_LABELS[k] || k}
                        </span>
                      ))}
                    </div>
                    {log.personalMissing && <p className="text-xs font-bold text-amber-800 italic">"{log.personalMissing}"</p>}
                  </div>
                )}

                {log.vehicleReportSent && (
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5" /> Vehículo — recursos requeridos
                      </p>
                      <button
                        onClick={() => generateAttendanceReportPDF(log, tech?.name || log.techId, log.goal, 'vehicle')}
                        className="flex items-center gap-1 text-[9px] font-black text-amber-700 bg-white border border-amber-300 px-2.5 py-1 rounded-xl hover:bg-amber-100 transition-all"
                      >
                        <FileDown className="h-3 w-3" /> Ver PDF
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(log.checklistVehicle || {}).filter(([,v]) => v === false).map(([k]) => (
                        <span key={k} className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
                          {VEHICLE_LABELS[k] || k}
                        </span>
                      ))}
                    </div>
                    {log.vehicleMissing && <p className="text-xs font-bold text-amber-800 italic">"{log.vehicleMissing}"</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal — asignar meta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">
              {editGoalId ? 'Editar Meta' : 'Asignar Meta del Día'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Técnico</label>
                <select value={form.techId} onChange={e => setForm(f => ({ ...f, techId: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Selecciona técnico...</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cliente</label>
                <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="Nombre del cliente o establecimiento"
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ubicación</label>
                <input value={form.clientLocation} onChange={e => setForm(f => ({ ...f, clientLocation: e.target.value }))}
                  placeholder="Dirección o zona"
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Metas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  placeholder="Objetivos a cumplir, material requerido, verificaciones previas..."
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">
                {saving ? 'Guardando...' : editGoalId ? 'Actualizar' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
