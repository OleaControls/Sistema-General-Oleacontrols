import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Users, Download, Plus, ChevronRight, ChevronDown, User, Briefcase, MapPin, Sparkles } from 'lucide-react';
import { hrService } from '@/api/hrService';
import { cn } from '@/lib/utils';

export default function OrgChart() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await hrService.getEmployees();
    setEmployees(data);
    
    // Build tree structure
    const buildTree = (parentId = null) => {
      return data
        .filter(emp => emp.reportsTo === parentId)
        .map(emp => ({
          ...emp,
          children: buildTree(emp.id)
        }));
    };

    // If multiple root nodes (null or not found parent), handle them
    const rootNodes = buildTree(null);
    setTree(rootNodes);
    setLoading(false);
  };

  const TreeNode = ({ node, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="flex flex-col items-center">
        <div className="relative group">
          {/* Connector Line above (except level 0) */}
          {level > 0 && <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-gray-200" />}
          
          <div className={cn(
            "bg-white border-2 p-4 rounded-3xl shadow-sm w-64 transition-all relative z-10",
            level === 0 ? "border-gray-900 bg-gray-900 text-white" : "border-gray-100 hover:border-primary/30"
          )}>
            <div className="flex items-center gap-3">
              <img src={node.avatar} alt={node.name} className="h-10 w-10 rounded-xl object-cover border-2 border-white shadow-sm" />
              <div className="text-left min-w-0">
                <p className={cn("font-black text-sm truncate", level === 0 ? "text-white" : "text-gray-900")}>{node.name}</p>
                <p className={cn("text-[9px] font-bold uppercase tracking-widest truncate", level === 0 ? "text-gray-400" : "text-primary")}>
                  {node.position || 'Colaborador'}
                </p>
              </div>
            </div>
            
            {hasChildren && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full border flex items-center justify-center transition-colors z-20 shadow-sm",
                    level === 0 ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-100 text-gray-400 hover:text-primary"
                )}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="pt-12 relative flex gap-8">
            {/* Horizontal Line Connector */}
            {node.children.length > 1 && (
                <div className="absolute top-0 left-[calc(12.5%+32px)] right-[calc(12.5%+32px)] h-px bg-gray-200" />
            )}
            
            {node.children.map((child, idx) => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 min-h-screen pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Organigrama Dinámico</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestión jerárquica en tiempo real de Olea Controls.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border text-gray-700 px-5 py-3 rounded-2xl font-bold text-sm hover:border-gray-300 transition-all shadow-sm">
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button 
            onClick={() => navigate('/hr/directory')}
            className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" /> Gestionar Personal
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-[3rem] shadow-sm p-12 overflow-auto min-h-[600px] flex justify-center bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]">
        {loading ? (
          <div className="flex items-center justify-center h-64 font-black text-gray-300 uppercase tracking-widest animate-pulse">
            Generando estructura...
          </div>
        ) : tree && tree.length > 0 ? (
          <div className="flex flex-col items-center gap-12">
            {tree.map(root => (
              <TreeNode key={root.id} node={root} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <Network className="h-12 w-12 text-gray-200" />
            <p className="text-gray-400 font-bold italic">No se ha definido una jerarquía. Asigna supervisores en el Directorio.</p>
          </div>
        )}
      </div>

      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] flex items-start gap-4">
        <div className="bg-emerald-500 text-white p-2 rounded-xl">
            <Briefcase className="h-5 w-5" />
        </div>
        <div>
            <h4 className="font-black text-emerald-900 text-sm uppercase tracking-wider">¿Cómo organizar?</h4>
            <p className="text-xs text-emerald-700 font-medium mt-1 leading-relaxed">
                El organigrama se genera automáticamente basado en el campo <strong>"Reporta a (Superior)"</strong> dentro de la edición de cada empleado. 
                Para mover a alguien de posición, edita su perfil en el Directorio y cambia su superior inmediato.
            </p>
        </div>
      </div>
    </div>
  );
}
