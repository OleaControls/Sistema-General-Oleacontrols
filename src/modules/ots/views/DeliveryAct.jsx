import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { otService } from '@/api/otService';
import { ChevronLeft, Printer, Download, CheckCircle2, MapPin, Clock, User, Phone, Mail, Store } from 'lucide-react';

export default function DeliveryAct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ot, setOt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOT();
  }, [id]);

  const loadOT = async () => {
    setLoading(true);
    const data = await otService.getById(id);
    setOt(data);
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center font-bold text-gray-400 italic">Cargando acta de entrega...</div>;
  if (!ot) return <div className="p-10 text-center font-bold text-red-400 italic">Orden de trabajo no encontrada.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between no-print">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-900 transition-colors">
          <ChevronLeft className="h-5 w-5" /> Regresar
        </button>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Download className="h-4 w-4" /> Descargar PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 print:shadow-none print:border-none">
        {/* Header del Acta */}
        <div className="bg-gray-900 p-10 text-white flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary h-10 w-10 rounded-xl flex items-center justify-center font-black text-white text-xl">O</div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">OleaControls <span className="text-primary">System</span></h1>
            </div>
            <h2 className="text-4xl font-black mb-2">Acta de Entrega</h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Documento de conformidad de servicio</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Folio de Servicio</p>
            <p className="text-3xl font-black text-primary">{ot.id}</p>
            <p className="text-xs font-bold text-gray-400 mt-2">{new Date(ot.finishedAt || ot.createdAt).toLocaleDateString('es-MX', { dateStyle: 'long' })}</p>
          </div>
        </div>

        <div className="p-10 space-y-10">
          {/* Información General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Información del Cliente</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Store className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Tienda / Sucursal</p>
                    <p className="font-bold text-gray-900">{ot.storeNumber} - {ot.storeName}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <User className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Atención a</p>
                    <p className="font-bold text-gray-900">{ot.client}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Dirección</p>
                    <p className="font-bold text-gray-900 leading-tight">{ot.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Detalles del Servicio</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Clock className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Horarios</p>
                    <p className="font-bold text-gray-900">Llegada: {ot.arrivalTime} • Finalización: {ot.finishedAt ? new Date(ot.finishedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <User className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Técnico Responsable</p>
                    <p className="font-bold text-gray-900">{ot.assignedToName}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Estado Final</p>
                    <p className="font-black text-emerald-600 uppercase">COMPLETADO / CONFORMIDAD</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Descripción de Trabajos */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Descripción de Trabajos Realizados</h3>
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 italic text-gray-700 leading-relaxed font-medium">
              "{ot.workDescription}"
            </div>
          </div>

          {/* Trabajos Pendientes */}
          {ot.pendingTasks && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest border-b border-amber-100 pb-2">Observaciones / Pendientes</h3>
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-amber-900 leading-relaxed font-medium">
                {ot.pendingTasks}
              </div>
            </div>
          )}

          {/* Evidencia Fotográfica */}
          {ot.completionPhotos && ot.completionPhotos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Evidencia Fotográfica</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ot.completionPhotos.map((photo, i) => (
                  <div key={i} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
                    <img src={photo} className="w-full h-full object-cover" alt={`Evidencia ${i+1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Firmas */}
          <div className="grid grid-cols-2 gap-20 pt-10">
            <div className="text-center space-y-6">
              <div className="h-32 flex items-end justify-center border-b-2 border-gray-900 pb-2 italic text-gray-400 font-serif">
                {/* Aquí iría la firma del técnico */}
                <p>{ot.assignedToName}</p>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Firma del Técnico</p>
            </div>
            <div className="text-center space-y-6">
              <div className="h-32 flex items-end justify-center border-b-2 border-gray-900 pb-2">
                {ot.signature && <span className="text-xs font-bold text-gray-400 italic">Firmado Digitalmente por Cliente</span>}
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Firma de Conformidad Cliente</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
          OleaControls System © 2026 - Control de Operaciones y Mantenimiento Industrial
        </div>
      </div>
    </div>
  );
}
