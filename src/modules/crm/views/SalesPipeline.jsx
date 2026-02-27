import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  Target, 
  DollarSign, 
  MoreVertical,
  ChevronRight,
  Clock
} from 'lucide-react';
import { crmService } from '@/api/crmService';
import { cn } from '@/lib/utils';

const STAGES = [
  { id: 'PROSPECTING', label: 'Prospección', color: 'bg-gray-100' },
  { id: 'PROPOSAL', label: 'Propuesta', color: 'bg-blue-50' },
  { id: 'NEGOTIATION', label: 'Negociación', color: 'bg-purple-50' },
  { id: 'CLOSED_WON', label: 'Ganada', color: 'bg-emerald-50' }
];

export default function SalesPipeline() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await crmService.getOpportunities();
    setOpportunities(data);
    setLoading(false);
  };

  const totalValue = opportunities.reduce((acc, curr) => 
    curr.stage !== 'CLOSED_LOST' ? acc + curr.value : acc, 0
  );

  return (
    <div className="space-y-8 pb-10">
      {/* CRM Header Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Pipeline Comercial</h2>
          <p className="text-sm text-gray-500 font-medium">Gestiona tus oportunidades de negocio y cuotas.</p>
        </div>
        
        <div className="flex items-center gap-6 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 pr-6 border-r">
            <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Valor Total</p>
              <p className="text-lg font-black text-gray-900">${totalValue.toLocaleString()}</p>
            </div>
          </div>
          <button className="bg-primary text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
            <Plus className="h-4 w-4" />
            Nueva Venta
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STAGES.map((stage) => {
          const stageOpps = opportunities.filter(o => o.stage === stage.id);
          const stageTotal = stageOpps.reduce((acc, curr) => acc + curr.value, 0);

          return (
            <div key={stage.id} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-[11px] text-gray-900 uppercase tracking-widest">{stage.label}</h3>
                  <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-1.5 py-0.5 rounded">
                    {stageOpps.length}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-400">${stageTotal.toLocaleString()}</p>
              </div>

              <div className={cn("min-h-[500px] rounded-3xl p-2 space-y-3", stage.color)}>
                {stageOpps.map((opp) => (
                  <div 
                    key={opp.id} 
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                        opp.priority === 'HIGH' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {opp.priority}
                      </span>
                      <button className="text-gray-300 hover:text-gray-600">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <h4 className="font-black text-gray-900 text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
                      {opp.client}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-medium mb-4">{opp.description}</p>
                    
                    <div className="flex justify-between items-end pt-3 border-t border-gray-50">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-gray-900">${opp.value.toLocaleString()}</p>
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase">
                          <Clock className="h-3 w-3" />
                          {opp.expectedClose}
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))}
                
                {stageOpps.length === 0 && (
                  <div className="h-20 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
                    <p className="text-[10px] font-bold text-gray-300 uppercase">Sin Oportunidades</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
