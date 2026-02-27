import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Mail, Phone, MapPin, ChevronRight, Filter } from 'lucide-react';
import { hrService } from '@/api/hrService';
import { cn } from '@/lib/utils';

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const data = await hrService.getEmployees();
    setEmployees(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Capital Humano</h2>
          <p className="text-sm text-gray-500 font-medium">Gestiona el talento y expedientes de Olea Controls.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o ID..." 
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:border-primary outline-none w-full md:w-64 transition-all"
            />
          </div>
          <button className="bg-primary text-white p-2 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <UserPlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-3xl" />)
        ) : employees.map((emp) => (
          <div 
            key={emp.id}
            onClick={() => navigate(`/hr/employee/${emp.id}`)}
            className="group bg-white rounded-3xl border border-gray-100 p-6 hover:border-primary/30 hover:shadow-2xl hover:shadow-gray-200/50 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <img src={emp.avatar} alt={emp.name} className="h-16 w-16 rounded-2xl object-cover border-2 border-gray-50 group-hover:scale-105 transition-transform" />
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full uppercase">Activo</span>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-gray-900 text-lg group-hover:text-primary transition-colors">{emp.name}</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{emp.role}</p>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                <div className="h-7 w-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                {emp.email}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                <div className="h-7 w-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                  <MapPin className="h-4 w-4" />
                </div>
                {emp.location}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase">
              <span>Ingreso: {emp.joinDate}</span>
              <div className="flex items-center gap-1 text-primary">
                Ver Expediente <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
