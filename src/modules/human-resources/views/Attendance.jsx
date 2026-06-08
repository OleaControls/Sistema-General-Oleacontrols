import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, AlertCircle, CheckCircle2, XCircle, Stethoscope, Umbrella,
  Palmtree, Plus, Trash2, Pencil, Download, ChevronLeft, ChevronRight, Search, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { hrService } from '@/api/hrService';
import { useAuth, ROLES } from '@/store/AuthContext';

const TYPES = {
  PRESENT:    { label: 'Asistencia',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2  },
  ABSENT:     { label: 'Falta',       color: 'bg-red-50 text-red-700 border-red-200',             icon: XCircle       },
  LATE:       { label: 'Retardo',     color: 'bg-amber-50 text-amber-700 border-amber-200',       icon: Clock         },
  PERMISSION: { label: 'Permiso',     color: 'bg-blue-50 text-blue-700 border-blue-200',          icon: Umbrella      },
  MEDICAL:    { label: 'Incap. Méd.', color: 'bg-purple-50 text-purple-700 border-purple-200',    icon: Stethoscope   },
  HOLIDAY:    { label: 'Vacaciones',  color: 'bg-teal-50 text-teal-700 border-teal-200',          icon: Palmtree      },
};

const EMPTY_FORM = {
  employeeId: '',
  date: new Date().toISOString().slice(0, 10),
  type: 'ABSENT',
  checkIn: '',
  checkOut: '',
  minutesLate: '',
  notes: '',
};

export default function Attendance() {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role];
  const canEdit = userRoles.includes(ROLES.ADMIN) || userRoles.includes(ROLES.HR) || userRoles.includes(ROLES.OPS);

  const now = new Date();
  const [viewYear,    setViewYear]    = useState(now.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(now.getMonth() + 1);
  const [records,     setRecords]     = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('ALL');
  const [empFilter,   setEmpFilter]   = useState('ALL');
  const [showModal,   setShowModal]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);

  // Cargar empleados una sola vez
  useEffect(() => {
    hrService.getEmployees().then(data => {
      setEmployees(Array.isArray(data) ? data : data?.employees || []);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Traer registros de todos los empleados para el mes
      // El handler acepta employeeId — si no enviamos nada obtendríamos error,
      // así que obtenemos por cada empleado (o mejor: endpoint sin filtro de empleado)
      // Por ahora hacemos una llamada por cada empleado activo
      const empIds = employees.map(e => e.id);
      if (empIds.length === 0) { setLoading(false); return; }

      const all = await Promise.all(
        empIds.map(id =>
          apiFetch(`/api/attendance?employeeId=${id}&month=${viewMonth}&year=${viewYear}`)
            .then(r => r.ok ? r.json() : { records: [] })
            .then(d => d.records || [])
            .catch(() => [])
        )
      );
      setRecords(all.flat());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [employees, viewMonth, viewYear]);

  useEffect(() => {
    if (employees.length > 0) load();
  }, [load, employees]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

  // Filtros
  const filtered = records.filter(r => {
    const emp = empMap[r.employeeId];
    const nameMatch = !search || (emp?.name || '').toLowerCase().includes(search.toLowerCase());
    const typeMatch = typeFilter === 'ALL' || r.type === typeFilter;
    const empMatch  = empFilter  === 'ALL' || r.employeeId === empFilter;
    return nameMatch && typeMatch && empMatch;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Resumen global del mes
  const summary = records.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };
  const openEdit = r => {
    setEditing(r.id);
    setForm({
      employeeId:  r.employeeId,
      date:        r.date.slice(0, 10),
      type:        r.type,
      checkIn:     r.checkIn || '',
      checkOut:    r.checkOut || '',
      minutesLate: r.minutesLate ?? '',
      notes:       r.notes || '',
    });
    setShowModal(true);
  };
  const handleDelete = async id => {
    if (!confirm('¿Eliminar este registro?')) return;
    await apiFetch('/api/attendance', { method: 'DELETE', body: JSON.stringify({ id }) });
    load();
  };
  const handleSave = async () => {
    if (!form.employeeId || !form.date || !form.type) {
      alert('Empleado, fecha y tipo son requeridos');
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, minutesLate: form.minutesLate ? Number(form.minutesLate) : null };
      const method = editing ? 'PUT' : 'POST';
      if (editing) body.id = editing;
      const res = await apiFetch('/api/attendance', { method, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || 'Error');
      setShowModal(false);
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const monthName = new Date(viewYear, viewMonth - 1, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const statCards = [
    { key: 'PRESENT',    label: 'Asistencias',  color: 'text-emerald-600', bg: 'border-emerald-100 bg-emerald-50' },
    { key: 'ABSENT',     label: 'Faltas',        color: 'text-red-600',     bg: 'border-red-100 bg-red-50' },
    { key: 'LATE',       label: 'Retardos',      color: 'text-amber-600',   bg: 'border-amber-100 bg-amber-50' },
    { key: 'PERMISSION', label: 'Permisos',      color: 'text-blue-600',    bg: 'border-blue-100 bg-blue-50' },
    { key: 'MEDICAL',    label: 'Incap. Méd.',   color: 'text-purple-600',  bg: 'border-purple-100 bg-purple-50' },
    { key: 'HOLIDAY',    label: 'Vacaciones',    color: 'text-teal-600',    bg: 'border-teal-100 bg-teal-50' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Reporte de Asistencia</h2>
          <p className="text-sm text-gray-500 font-medium mt-1 capitalize">{monthName}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Navegador mes */}
          <div className="flex items-center gap-1 bg-white border rounded-2xl px-3 py-2 shadow-sm">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 transition-all">
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </button>
            <span className="text-xs font-black text-gray-700 min-w-[130px] text-center capitalize">{monthName}</span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 transition-all">
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          {canEdit && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              <Plus className="h-4 w-4" /> Registrar
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {statCards.map(s => (
          <div key={s.key} className={cn('rounded-2xl p-4 border text-center', s.bg)}>
            <p className={cn('text-2xl font-black leading-none', s.color)}>{summary[s.key] || 0}</p>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empleado..."
            className="w-full pl-9 pr-4 py-2 text-sm font-bold text-gray-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={empFilter}
          onChange={e => setEmpFilter(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="ALL">Todos los empleados</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="ALL">Todos los tipos</option>
          {Object.entries(TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="h-9 w-9 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-2 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="font-black text-gray-400 text-sm">Sin registros este mes</p>
            {canEdit && (
              <p className="text-gray-300 font-bold text-[10px] uppercase tracking-widest mt-1">
                Usa "Registrar" para agregar incidencias
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b bg-gray-50/60">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Empleado</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Horario</th>
                <th className="px-6 py-3">Notas</th>
                {canEdit && <th className="px-6 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const cfg = TYPES[r.type] || TYPES.ABSENT;
                const Icon = cfg.icon;
                const emp = empMap[r.employeeId];
                return (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-6 py-3 text-xs font-bold text-gray-600 whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {emp?.avatar
                          ? <img src={emp.avatar} className="h-7 w-7 rounded-lg object-cover border" alt="" />
                          : <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary">{(emp?.name || '?').charAt(0)}</div>
                        }
                        <div>
                          <p className="text-xs font-black text-gray-900 leading-none">{emp?.name || r.employeeId}</p>
                          <p className="text-[9px] font-bold text-gray-400 mt-0.5">{emp?.position || emp?.department || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 text-[9px] font-black px-2 py-1 rounded-full border', cfg.color)}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                        {r.minutesLate > 0 && <span className="ml-1">· {r.minutesLate} min</span>}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-bold text-gray-500">
                      {r.checkIn ? `${r.checkIn}${r.checkOut ? ` – ${r.checkOut}` : ''}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400 max-w-[180px] truncate">
                      {r.notes || '—'}
                    </td>
                    {canEdit && (
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/8 transition-all">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">
              {editing ? 'Editar Registro' : 'Registrar Incidencia'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Empleado</label>
                <select
                  value={form.employeeId}
                  onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Selecciona empleado...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tipo</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {(form.type === 'PRESENT' || form.type === 'LATE') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Entrada</label>
                    <input type="time" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Salida</label>
                    <input type="time" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
              )}
              {form.type === 'LATE' && (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Minutos de retardo</label>
                  <input type="number" min="1" max="480" value={form.minutesLate}
                    onChange={e => setForm(f => ({ ...f, minutesLate: e.target.value }))}
                    placeholder="ej. 20"
                    className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              )}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Notas (opcional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  placeholder="Motivo, observación..."
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
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
