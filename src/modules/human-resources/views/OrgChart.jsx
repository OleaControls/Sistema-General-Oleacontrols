import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Network, Download, Plus, ChevronRight, ChevronDown, 
  Briefcase, Sparkles, ZoomIn, ZoomOut, Maximize2,
  Hand, Move, Eye
} from 'lucide-react';
import { hrService } from '@/api/hrService';
import { cn } from '@/lib/utils';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

export default function OrgChart() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await hrService.getEmployees();
      setEmployees(data);
      
      const buildTree = (parentId = null) => {
        return data
          .filter(emp => emp.reportsTo === parentId)
          .map(emp => ({
            ...emp,
            children: buildTree(emp.id)
          }));
      };

      const rootNodes = buildTree(null);
      setTree(rootNodes);
    } catch (err) {
      console.error('Error loading org chart:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!chartRef.current) return;
    setIsExporting(true);
    
    try {
      // Capturamos como JPEG que es mucho más compatible y ligero que PNG
      const dataUrl = await toJpeg(chartRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true, // Evita errores de tipografía
      });

      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Org_OleaControls_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Error al generar PDF. Prueba reduciendo el zoom antes de exportar.');
    } finally {
      setIsExporting(false);
    }
  };

  const TreeNode = ({ node, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    // Colores HEX puros para máxima compatibilidad
    const levelStyles = [
      { border: '2px solid #0f172a', backgroundColor: '#0f172a', color: '#ffffff' }, // Root
      { border: '2px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f172a' }, // Level 1
      { border: '2px solid #f1f5f9', backgroundColor: '#ffffff', color: '#0f172a' }, // Level 2
      { border: '2px solid #f8fafc', backgroundColor: '#f8fafc', color: '#0f172a' }, // Level 3+
    ];

    const currentStyle = levelStyles[Math.min(level, 3)];

    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* Conector superior */}
          {level > 0 && (
            <div style={{ backgroundColor: '#cbd5e1', width: '2px', height: '30px' }} />
          )}
          
          <div 
            onClick={() => navigate(`/hr/employee/${node.id}`)}
            style={currentStyle}
            className="p-4 rounded-2xl w-60 transition-all cursor-pointer relative z-10 shadow-sm hover:shadow-md border-2"
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img 
                  src={node.avatar} 
                  alt={node.name} 
                  className="h-10 w-10 rounded-xl object-cover border border-gray-100" 
                />
                <div 
                  style={{ 
                    backgroundColor: node.status === 'ACTIVE' ? '#10b981' : '#f59e0b',
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    border: '2px solid #fff'
                  }} 
                />
              </div>

              <div className="text-left min-w-0 flex-1">
                <p className="font-bold text-[13px] truncate leading-tight">
                  {node.name}
                </p>
                <p className={cn(
                    "text-[9px] font-medium uppercase tracking-tight truncate mt-0.5",
                    level === 0 ? "text-gray-400" : "text-blue-600"
                )}>
                  {node.position || 'Staff'}
                </p>
              </div>
            </div>
            
            {hasChildren && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                style={{ 
                    position: 'absolute',
                    bottom: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    width: '24px',
                    height: '24px',
                    borderRadius: '8px'
                }}
                className="flex items-center justify-center shadow-sm z-20 hover:bg-gray-50"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
              </button>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="pt-8 relative flex gap-6 justify-center">
            {/* Conector horizontal */}
            {node.children.length > 1 && (
                <div 
                    style={{ 
                        position: 'absolute',
                        top: '0',
                        left: '60px',
                        right: '60px',
                        height: '2px',
                        backgroundColor: '#cbd5e1'
                    }} 
                />
            )}
            
            {node.children.map((child) => (
              <div key={child.id} className="relative">
                {/* Conector vertical T */}
                {node.children.length > 1 && (
                   <div style={{ backgroundColor: '#cbd5e1', width: '2px', height: '10px', margin: '0 auto' }} />
                )}
                <TreeNode node={child} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-white border-b shrink-0">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-black text-gray-900 leading-none">Estructura Olea</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Organigrama Dinámico</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            disabled={isExporting}
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border text-gray-700 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5" /> 
            {isExporting ? '...' : 'PDF'}
          </button>
          <button 
            onClick={() => navigate('/hr/directory')}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-200 flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> Equipo
          </button>
        </div>
      </div>

      {/* Area del Organigrama con Zoom & Pan */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 font-bold animate-pulse">
            CARGANDO ESTRUCTURA...
          </div>
        ) : (
          <TransformWrapper
            initialScale={0.8}
            minScale={0.2}
            maxScale={2}
            centerOnInit={true}
            limitToBounds={false}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Floating Controls */}
                <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2" data-html2canvas-ignore="true">
                  <button onClick={() => zoomIn()} className="p-3 bg-white border rounded-full shadow-xl text-gray-600 hover:text-blue-600 transition-colors">
                    <ZoomIn className="h-5 w-5" />
                  </button>
                  <button onClick={() => zoomOut()} className="p-3 bg-white border rounded-full shadow-xl text-gray-600 hover:text-blue-600 transition-colors">
                    <ZoomOut className="h-5 w-5" />
                  </button>
                  <button onClick={() => resetTransform()} className="p-3 bg-blue-600 border border-blue-700 rounded-full shadow-xl text-white hover:bg-blue-700 transition-colors">
                    <Maximize2 className="h-5 w-5" />
                  </button>
                </div>

                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                  <div 
                    ref={chartRef}
                    className="p-20 bg-gray-50 flex justify-center min-w-[2000px] min-h-[1000px]"
                  >
                    <div className="pt-10">
                      {tree && tree.map(root => (
                        <TreeNode key={root.id} node={root} />
                      ))}
                    </div>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}

        {/* Info Celular */}
        <div className="absolute bottom-6 left-6 z-40 md:hidden pointer-events-none">
            <div className="bg-gray-900/80 backdrop-blur text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl border border-white/10">
                <Move className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Arrastra para mover</span>
            </div>
        </div>
      </div>
    </div>
  );
}
