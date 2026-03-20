import React, { useState, useEffect, useMemo } from 'react';
import { 
  Palmtree, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle,
  Clock,
  Filter,
  Edit2,
  ChevronLeft,
  ChevronRight,
  User as UserIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hrService } from '@/api/hrService';

// --- SUB-COMPONENTE: CALENDARIO DE AUSENCIAS ---
function CalendarView({ employees }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const allRequests = useMemo(() => {
    return employees.flatMap(emp => 
      (emp.vacationRequests || []).map(req => ({ 
        ...req, 
        employeeName: emp.name,
        employeeId: emp.id
      }))
    ).filter(req => req.status === 'APPROVED' || req.status === 'PENDING'); 
  }, [employees]);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startingDay = firstDayOfMonth(year, month);

  // Padding for previous month
  for (let i = 0; i < startingDay; i++) {
    days.push({ day: null });
  }

  // Days of current month
  for (let i = 1; i <= totalDays; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayDate = new Date(year, month, i);
    
    // Find requests that overlap with this day
    const dayRequests = allRequests.filter(req => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      // Reset hours for accurate comparison
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      dayDate.setHours(0,0,0,0);
      return dayDate >= start && dayDate <= end;
    });

    days.push({ day: i, date: dayDate, requests: dayRequests });
  }

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const getTypeStyles = (type) => {
    switch (type) {
      case 'ANNUAL': return 'bg-emerald-500 text-white';
      case 'PERSONAL': return 'bg-amber-500 text-white';
      case 'SICK': return 'bg-rose-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'ANNUAL': return 'Vacaciones';
      case 'PERSONAL': return 'Permiso';
      case 'SICK': return 'Incapacidad';
      default: return type;
    }
  };

  return (
    <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-500">
      {/* Header del Calendario */}
      <div className="p-6 border-b flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2.5 rounded-2xl">
                <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
                <h3 className="text-xl font-black text-gray-900 leading-none">{monthNames[month]} {year}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Calendario de Ausencias del Equipo</p>
            </div>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-gray-100">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-primary transition-colors">Hoy</button>
          <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-gray-100">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Grid del Calendario */}
      <div className="grid grid-cols-7 border-b bg-white">
        {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
          <div key={d} className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-r last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[120px]">
        {days.map((d, i) => (
          <div 
            key={i} 
            className={cn(
              "border-r border-b p-2 overflow-y-auto scrollbar-hide flex flex-col gap-1 transition-colors",
              !d.day ? "bg-gray-50/30" : "bg-white hover:bg-gray-50/50"
            )}
          >
            {d.day && (
              <>
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg",
                    d.date?.toDateString() === new Date().toDateString() 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-gray-400"
                  )}>
                    {d.day}
                  </span>
                </div>
                <div className="space-y-1">
                  {d.requests.map((req, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "text-[9px] font-black px-1.5 py-1 rounded-md truncate shadow-sm",
                        getTypeStyles(req.type),
                        req.status === 'PENDING' && "opacity-40 border border-white/50 border-dashed"
                      )}
                      title={`${req.employeeName}: ${getTypeName(req.type)} (${req.status === 'PENDING' ? 'Pendiente' : 'Aprobado'}) - ${req.reason || 'Sin motivo'}`}
                    >
                      {req.employeeName.split(' ')[0]}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="p-4 bg-gray-50/50 border-t flex flex-wrap gap-6 justify-center">
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Vacaciones</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Permisos</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Incapacidades</span>
        </div>
      </div>
    </div>
  );
}

export default function TimeOff() {
  const [activeTab, setActiveTab] = useState('REQUESTS');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    days: '',
    reason: '',
    type: 'ANNUAL'
  });
  const [adjustDays, setAdjustDays] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const emps = await hrService.getEmployees();
      setEmployees(emps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    if (!confirm(`¿Estás seguro de ${status === 'APPROVED' ? 'aprobar' : 'rechazar'} esta solicitud?`)) return;
    try {
      await hrService.updateVacationRequest(requestId, status);
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openAdjustModal = (emp) => {
    setSelectedEmp(emp);
    setAdjustDays(emp.vacationBalance?.toString() || '0');
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = async () => {
    if (adjustDays === '' || isNaN(parseFloat(adjustDays))) return;
    try {
      await hrService.updateVacationBalanceManual(selectedEmp.id, parseFloat(adjustDays));
      setShowAdjustModal(false);
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Auto-calculate days when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (!isNaN(diffDays) && diffDays > 0) {
        setFormData(prev => ({ ...prev, days: diffDays.toString() }));
      }
    }
  }, [formData.startDate, formData.endDate]);

  const handleManualRequest = async (e) => {
    e.preventDefault();
    try {
      await hrService.requestVacation(formData);
      setShowManualModal(false);
      setFormData({ employeeId: '', startDate: '', endDate: '', days: '', reason: '', type: 'ANNUAL' });
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const calculateYears = (joinDate) => {
    if (!joinDate) return 0;
    const join = new Date(joinDate);
    const now = new Date();
    let years = now.getFullYear() - join.getFullYear();
    const m = now.getMonth() - join.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < join.getDate())) {
      years--;
    }
    return years;
  };

  const calculateDaysByLaw = (years) => {
    if (years < 1) return 0;
    return 12 + (years - 1) * 2;
  };

  // Get all pending requests from all employees
  const allRequests = employees.flatMap(emp => 
    (emp.vacationRequests || []).map(req => ({ ...req, employee: emp }))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading && employees.length === 0) return <div className="p-10 text-center font-black text-gray-400 uppercase tracking-widest animate-pulse">Cargando datos de RH...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Vacaciones y Ausencias</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestiona los balances de días libres y aprueba solicitudes del equipo.</p>
        </div>
        <button 
          onClick={() => setShowManualModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Palmtree className="h-4 w-4" />
          Nueva Solicitud RH
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-8 px-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'REQUESTS', label: 'Bandeja de Aprobaciones' },
          { id: 'BALANCES', label: 'Bolsas de Vacaciones' },
          { id: 'CALENDAR', label: 'Calendario de Ausencias' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "py-4 border-b-2 font-black text-sm transition-all whitespace-nowrap uppercase tracking-wider",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {activeTab === 'REQUESTS' && (
          <div className="space-y-4">
            {allRequests.filter(r => r.status === 'PENDING').length > 0 ? (
              allRequests.filter(r => r.status === 'PENDING').map((req) => (
                <div key={req.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/30 transition-colors group">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center font-black text-lg text-gray-400 border group-hover:bg-primary/5 group-hover:text-primary transition-all">
                      {req.employee.name.charAt(0)}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-gray-900 text-lg leading-none">{req.employee.name}</h4>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-amber-100 text-amber-700">
                          Pendiente
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{req.employee.position} • {req.id}</p>
                      
                      <div className="flex flex-wrap gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                          <Palmtree className="h-3.5 w-3.5 text-primary" />
                          {req.type}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                          <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()} ({req.days} días)
                        </div>
                      </div>
                      {req.reason && <p className="text-xs text-gray-500 font-medium italic mt-2">"{req.reason}"</p>}
                    </div>
                  </div>

                  <div className="flex gap-3 md:flex-col lg:flex-row w-full md:w-auto">
                    <button 
                      onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-red-100 transition-all border border-red-100"
                    >
                      <XCircle className="h-4 w-4" /> Rechazar
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-emerald-100 transition-all border border-emerald-100 shadow-lg shadow-emerald-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Aprobar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 text-gray-400 font-bold italic">
                No hay solicitudes pendientes de aprobación.
              </div>
            )}

            {/* Histórico Reciente */}
            {allRequests.filter(r => r.status !== 'PENDING').length > 0 && (
               <div className="mt-8 space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Histórico Reciente</h3>
                  {allRequests.filter(r => r.status !== 'PENDING').slice(0, 5).map(req => (
                    <div key={req.id} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center opacity-70">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center font-black text-xs text-gray-400 border">
                                {req.employee.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-900">{req.employee.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">{req.type} • {req.status}</p>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500">{new Date(req.startDate).toLocaleDateString()}</p>
                    </div>
                  ))}
               </div>
            )}
          </div>
        )}

        {activeTab === 'BALANCES' && (
          <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar por empleado o departamento..." 
                  className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:border-primary w-64" 
                />
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white border-b">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Empleado</th>
                  <th className="px-6 py-4">Antigüedad</th>
                  <th className="px-6 py-4">Días por Ley</th>
                  <th className="px-6 py-4 text-primary">Saldo Disponible</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEmployees.map((emp, i) => {
                  const years = calculateYears(emp.joinDate);
                  const lawDays = calculateDaysByLaw(years);
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-sm text-gray-900">{emp.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{emp.department || 'Sin Depto.'}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-600">{years} Años</td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-600">{lawDays} Días</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "font-black text-sm px-3 py-1 rounded-lg",
                          emp.vacationBalance > 0 ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
                        )}>{emp.vacationBalance} Días</span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => openAdjustModal(emp)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary transition-colors"
                          title="Ajuste Manual"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'CALENDAR' && (
          <CalendarView employees={employees} />
        )}
      </div>

      {/* MODAL: AJUSTE MANUAL DE BALANCE */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="bg-primary p-8 text-white relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Edit2 className="h-20 w-20" />
              </div>
              <h3 className="text-2xl font-black">Ajustar Saldo</h3>
              <p className="text-primary-foreground/80 font-bold text-sm mt-1">{selectedEmp?.name}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Días Disponibles</label>
                <input 
                  type="number" 
                  value={adjustDays}
                  onChange={(e) => setAdjustDays(e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-2xl px-5 py-4 font-bold text-lg focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  placeholder="Ej: 12"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveAdjustment}
                  className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-lg shadow-gray-200"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA SOLICITUD MANUAL RH */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="bg-gray-900 p-8 text-white relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Palmtree className="h-20 w-20" />
              </div>
              <h3 className="text-2xl font-black">Nueva Solicitud RH</h3>
              <p className="text-white/60 font-bold text-sm mt-1">Registra vacaciones de forma manual para un colaborador.</p>
            </div>
            <form onSubmit={handleManualRequest} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Seleccionar Colaborador</label>
                <select 
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  className="w-full bg-gray-50 border-gray-200 rounded-2xl px-5 py-4 font-bold text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                >
                  <option value="">Seleccionar...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.department})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fecha Inicio</label>
                  <input 
                    type="date" 
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-gray-50 border-gray-200 rounded-2xl px-5 py-4 font-bold text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fecha Fin</label>
                  <input 
                    type="date" 
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-gray-50 border-gray-200 rounded-2xl px-5 py-4 font-bold text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Días a Descontar</label>
                  <input 
                    type="number" 
                    required
                    value={formData.days}
                    onChange={(e) => setFormData({...formData, days: e.target.value})}
                    className="w-full bg-gray-50 border-gray-200 rounded-2xl px-5 py-4 font-bold text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                    placeholder="Ej: 5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tipo</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-gray-50 border-gray-200 rounded-2xl px-5 py-4 font-bold text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  >
                    <option value="ANNUAL">Vacaciones Anuales</option>
                    <option value="PERSONAL">Permiso Personal</option>
                    <option value="SICK">Incapacidad</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Motivo / Notas</label>
                <textarea 
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full bg-gray-50 border-gray-200 rounded-2xl px-5 py-4 font-bold text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all h-24 resize-none"
                  placeholder="Opcional..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Registrar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
