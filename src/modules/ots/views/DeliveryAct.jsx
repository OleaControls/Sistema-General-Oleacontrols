import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { otService } from '@/api/otService';
import { ChevronLeft, Printer, Download, CheckCircle2, MapPin, Clock, User, Phone, Mail, Store, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-10 md:pb-20 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-900 transition-colors self-start sm:self-auto">
          <ChevronLeft className="h-5 w-5" /> Regresar
        </button>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => window.print()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm hover:bg-gray-50 transition-all shadow-sm">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Download className="h-4 w-4" /> Descargar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 print:shadow-none print:border-none">
        {/* Header del Acta */}
        <div className="bg-gray-900 p-6 md:p-10 text-white flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center font-black text-white text-lg md:text-xl">O</div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter">OleaControls <span className="text-primary">System</span></h1>
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-2 leading-tight">Acta de Entrega</h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] md:text-xs">Documento de conformidad de servicio</p>
          </div>
          <div className="text-left md:text-right border-t border-white/10 md:border-none pt-4 md:pt-0 w-full md:w-auto">
            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Folio de Servicio</p>
            <p className="text-2xl md:text-3xl font-black text-primary">{ot.id}</p>
            <p className="text-[10px] md:text-xs font-bold text-gray-400 mt-1 md:mt-2">{new Date(ot.finishedAt || ot.createdAt).toLocaleDateString('es-MX', { dateStyle: 'long' })}</p>
          </div>
        </div>

        <div className="p-6 md:p-10 space-y-8 md:space-y-10">
          {/* Información General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            <div className="space-y-6">
              <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Información del Cliente</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Store className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">Tienda / Sucursal</p>
                    <p className="text-sm md:text-base font-bold text-gray-900">{ot.storeNumber} - {ot.storeName}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <User className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">Atención a</p>
                    <p className="text-sm md:text-base font-bold text-gray-900">{ot.client}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">Dirección</p>
                    <p className="text-sm md:text-base font-bold text-gray-900 leading-tight">{ot.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Detalles del Servicio</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Clock className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">Horarios</p>
                    <p className="text-sm md:text-base font-bold text-gray-900">Llegada: {ot.arrivalTime} • Finalización: {ot.finishedAt ? new Date(ot.finishedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <User className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">Técnico Responsable</p>
                    <p className="text-sm md:text-base font-bold text-gray-900">{ot.leadTechName || ot.assignedToName}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">Estado Final</p>
                    <p className="text-sm md:text-base font-black text-emerald-600 uppercase">COMPLETADO / CONFORMIDAD</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ubicación del Servicio (Mapa) */}
          <div className="space-y-4">
            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Ubicación del Servicio</h3>
            <div className="h-48 md:h-64 w-full rounded-2xl md:rounded-3xl overflow-hidden border border-gray-100 shadow-sm relative z-0">
              <MapContainer 
                center={[ot.lat || 22.1444, ot.lng || -100.9167]} 
                zoom={16} 
                zoomControl={false}
                attributionControl={false}
                dragging={false}
                touchZoom={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[ot.lat || 22.1444, ot.lng || -100.9167]} />
              </MapContainer>
              <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-[500] bg-white px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl shadow-lg border border-gray-100 flex items-center gap-2 text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest">
                <MapPin className="h-3 w-3 md:h-4 md:h-4 text-primary" />
                {ot.lat?.toFixed(5)}, {ot.lng?.toFixed(5)}
              </div>
            </div>
          </div>

          {/* Descripción de Trabajos */}
          <div className="space-y-4">
            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Descripción de Trabajos Realizados</h3>
            <div className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 italic text-gray-700 leading-relaxed font-medium text-sm md:text-base">
              "{ot.workDescription}"
            </div>
          </div>

          {/* Trabajos Pendientes */}
          {ot.pendingTasks && (
            <div className="space-y-4">
              <h3 className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-widest border-b border-amber-100 pb-2">Observaciones / Pendientes</h3>
              <div className="bg-amber-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-amber-100 text-amber-900 leading-relaxed font-medium text-sm md:text-base">
                {ot.pendingTasks}
              </div>
            </div>
          )}

          {/* Evidencia Fotográfica */}
          {ot.completionPhotos && ot.completionPhotos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Evidencia Fotográfica</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {ot.completionPhotos.map((photo, i) => (
                  <div key={i} className="aspect-square bg-gray-100 rounded-xl md:rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <img src={photo} className="w-full h-full object-cover" alt={`Evidencia ${i+1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Firmas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 pt-6 md:pt-10">
            <div className="text-center space-y-4 md:space-y-6">
              <div className="h-24 md:h-32 flex items-end justify-center border-b-2 border-gray-900 pb-2 italic text-gray-400 font-serif text-sm md:text-base">
                <p>{ot.leadTechName || ot.assignedToName}</p>
              </div>
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Firma del Técnico</p>
            </div>
            <div className="text-center space-y-4 md:space-y-6">
              <div className="h-24 md:h-32 flex items-end justify-center border-b-2 border-gray-900 pb-2">
                {ot.signature && <span className="text-[10px] md:text-xs font-bold text-emerald-600 italic border border-emerald-100 bg-emerald-50 px-3 py-1 rounded-full">Firmado Digitalmente por Cliente</span>}
              </div>
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Firma de Conformidad Cliente</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 text-center text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] md:tracking-[0.2em] leading-relaxed">
          OleaControls System © 2026 - Control de Operaciones y Mantenimiento Industrial
        </div>
      </div>
    </div>
  );
}
