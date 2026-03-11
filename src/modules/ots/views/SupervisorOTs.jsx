import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Search, MoreHorizontal, Clock, Eye,
  X, Send, Trophy, Building2, User, Trash2, AlertCircle, FileText,
  MapPin, Loader2, Layers
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { otService } from '@/api/otService';
import { crmService } from '@/api/crmService';
import { hrService } from '@/api/hrService';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Custom Marker Icons
const otIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Fix Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapEvents({ onLocationSelect }) {
  useMapEvents({ click(e) { onLocationSelect(e.latlng); } });
  return null;
}

function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

export default function SupervisorOTs() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [ots, setOts] = useState([]);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [availableTechs, setAvailableTechs] = useState([]);
  const [techLocations, setTechLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mapCenter, setMapCenter] = useState([19.4326, -99.1332]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [otToDelete, setOtToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [extraFunds, setExtraFunds] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'ALL', priority: 'ALL' });

  const initialNewOT = {
    title: '', storeNumber: '', storeName: '', client: '', address: '', secondaryAddress: '',
    otAddress: '', otReference: '', lat: 19.4326, lng: -99.1332, clientEmail: '', clientPhone: '',
    contactName: '', contactEmail: '', contactPhone: '', leadTechId: '', leadTechName: '',
    assistantTechs: [], workDescription: '', arrivalTime: '09:00',
    scheduledDate: new Date().toISOString().split('T')[0],
    priority: 'MEDIUM', assignedFunds: 0
  };

  const [newOT, setNewOT] = useState(initialNewOT);

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        const locs = await otService.getTechnicianLocations();
        setTechLocations(locs);
      } catch (err) { }
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [o, c, t, allEmployees] = await Promise.all([
        otService.getOTs(),
        crmService.getClients(),
        otService.getTemplates(),
        hrService.getEmployees()
      ]);
      setOts(o);
      setClients(c);
      setTemplates(t);
      const techs = allEmployees.filter(emp => emp.roles.includes(ROLES.TECH) || emp.roles.includes('Tech'));
      setAvailableTechs(techs);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  /**
   * ✅ EXPORT AER (ARREGLADO):
   * - Carga imágenes desde .txt (base64 o dataURL)
   * - Mantiene proporción con "fit"
   * - Evita que el texto choque con logos
   * - Pone "placa blanca" para el logo derecho (contraste)
   */
  const handleExportAER = async (ot) => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper: carga base64/dataURL desde txt
    const loadDataUrlFromTxt = async (url) => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const raw = (await res.text()).trim();

        // Si ya viene data URL completo
        if (raw.startsWith('data:image/')) return raw;

        // Si viene solo base64 "pelón"
        return `data:image/png;base64,${raw}`;
      } catch (err) {
        console.error('Error cargando imagen:', url, err);
        return null;
      }
    };

    // Helper: inserta imagen ajustada (sin deformar)
    const addImageFit = (dataUrl, x, y, maxW, maxH, opts = {}) => {
      if (!dataUrl) return null;

      const fmt = dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      const props = doc.getImageProperties(dataUrl);
      const imgW = props.width || 1;
      const imgH = props.height || 1;

      const scale = Math.min(maxW / imgW, maxH / imgH);
      const w = imgW * scale;
      const h = imgH * scale;

      // alignment inside box
      const dx = opts.align === 'center' ? (maxW - w) / 2 : 0;
      const dy = opts.valign === 'middle' ? (maxH - h) / 2 : 0;

      doc.addImage(dataUrl, fmt, x + dx, y + dy, w, h, undefined, 'FAST');
      return { w, h };
    };

    const insignia = await loadDataUrlFromTxt('/img/base64 logo.txt');
    const logo = await loadDataUrlFromTxt('/img/oleacontrols.txt');

    // ===== Header =====
    const headerH = 64;

    // Fondo azul
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, headerH, 'F');

    // Logo izquierdo (insignia)
    const leftPad = 24;
    const topPad = 12;
    addImageFit(insignia, leftPad, topPad, 44, 44, { align: 'center', valign: 'middle' });

    // Logo derecho con placa blanca (para contraste)
    const rightPad = 24;
    const plateW = 140;
    const plateH = 36;
    const plateX = pageWidth - rightPad - plateW;
    const plateY = 14;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(plateX, plateY, plateW, plateH, 10, 10, 'F');

    addImageFit(logo, plateX + 10, plateY + 6, plateW - 20, plateH - 12, { align: 'center', valign: 'middle' });

    // Título centrado (con "zona segura" para no chocar con logos)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ACTA DE ENTREGA / RECEPCIÓN', pageWidth / 2, 30, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`FOLIO OFICIAL: ${ot.otNumber || 'N/A'}`, pageWidth / 2, 45, { align: 'center' });

    // ===== 2. Información General (Tabla) =====
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS GENERALES DEL SERVICIO', 24, headerH + 28);

    autoTable(doc, {
      startY: headerH + 34,
      head: [['CLIENTE', 'SUCURSAL', 'FECHA DE CIERRE', 'ESTADO']],
      body: [[
        String((ot.clientName || ot.client || 'N/A')).toUpperCase(),
        String((ot.storeName || 'OFICINA CENTRAL')).toUpperCase(),
        new Date(ot.finishedAt || ot.updatedAt || Date.now()).toLocaleString(),
        String((ot.status || 'N/A')).toUpperCase()
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 6
      },
      margin: { left: 24, right: 24 }
    });

    // ===== 3. Ubicación y Contacto =====
    const y1 = doc.lastAutoTable.finalY + 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('UBICACIÓN Y CONTACTO EN SITIO', 24, y1);

    autoTable(doc, {
      startY: y1 + 6,
      body: [
        ['DIRECCIÓN:', ot.address || 'N/A'],
        ['REFERENCIA:', ot.otReference || ot.otAddress || 'N/A'],
        ['ENCARGADO:', ot.contactName || 'N/A'],
        ['TELÉFONO:', ot.contactPhone || 'N/A']
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
      margin: { left: 24, right: 24 }
    });

    // ===== 4. Descripción Técnica =====
    const descY = doc.lastAutoTable.finalY + 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('REPORTE TÉCNICO DE ACTIVIDADES', 24, descY);

    // Caja de reporte (auto altura simple con wrap)
    const boxX = 24;
    const boxY = descY + 8;
    const boxW = pageWidth - 48;
    const boxH = 88;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(boxX, boxY, boxW, boxH, 10, 10, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    const reportText =
      ot.deliveryDetails ||
      ot.report ||
      ot.description ||
      ot.workDescription ||
      'No se proporcionó un reporte detallado.';

    const splitDesc = doc.splitTextToSize(String(reportText), boxW - 20);
    doc.text(splitDesc, boxX + 10, boxY + 18);

    // ===== 5. Equipo =====
    const staffY = boxY + boxH + 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('EQUIPO DE TRABAJO', 24, staffY);

    autoTable(doc, {
      startY: staffY + 6,
      head: [['RESPONSABILIDAD', 'NOMBRE DEL COLABORADOR']],
      body: [
        ['TÉCNICO LÍDER', ot.leadTechName || 'PENDIENTE'],
        ['SUPERVISOR', ot.supervisor?.name || 'CENTRAL OPERATIVA'],
        ['ASIGNADO POR', ot.assignedByName || 'SISTEMA AUTOMÁTICO']
      ],
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      margin: { left: 24, right: 24 }
    });

    // ===== 6. Firmas =====
    const footerY = pageHeight - 100;

    // Dibujar firmas antes de las líneas si existen
    if (ot.signature) {
      try {
        doc.addImage(ot.signature, 'PNG', 100, footerY - 60, 100, 50);
      } catch (e) { console.error("Error firma TSC", e); }
    }
    if (ot.clientSignature) {
      try {
        doc.addImage(ot.clientSignature, 'PNG', pageWidth - 200, footerY - 60, 100, 50);
      } catch (e) { console.error("Error firma Cliente", e); }
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(70, footerY, 230, footerY);
    doc.line(pageWidth - 230, footerY, pageWidth - 70, footerY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`TSC: ${ot.leadTechName || 'N/A'}`.toUpperCase(), 150, footerY + 14, { align: 'center' });
    doc.text('FIRMA DE CONFORMIDAD CLIENTE', pageWidth - 150, footerY + 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.text(
      'Este documento certifica la correcta ejecución de los trabajos descritos bajo los estándares de Olea Controls.',
      pageWidth / 2,
      pageHeight - 28,
      { align: 'center' }
    );
    doc.text(
      'Olea Controls © 2026 - Plataforma Global de Gestión Operativa',
      pageWidth / 2,
      pageHeight - 16,
      { align: 'center' }
    );

    doc.save(`AER_${ot.otNumber || ot.id}.pdf`);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const data = { ...newOT };
      if (extraFunds > 0) data.assignedFunds = (parseFloat(newOT.assignedFunds) || 0) + parseFloat(extraFunds);
      
      if (isEditMode) {
        await otService.updateOT(editingId, data);
      } else {
        await otService.saveOT({ ...data, supervisorId: currentUser.id });
      }
      
      setIsModalOpen(false);
      await loadData();
    } catch (err) { 
      alert("Error al procesar la OT: " + err.message); 
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    setNewOT(initialNewOT);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (ot) => {
    setNewOT({
      ...ot,
      workDescription: ot.description || ot.workDescription || '',
      scheduledDate: ot.scheduledDate
        ? new Date(ot.scheduledDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    });
    setEditingId(ot.id);
    setIsEditMode(true);
    setMapCenter([ot.lat || 19.4326, ot.lng || -99.1332]);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!otToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await otService.deleteOT(otToDelete.id);
      setIsDeleteModalOpen(false);
      setOtToDelete(null);
      await loadData();
    } catch (err) {
      alert("Error al eliminar OT: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLocationSearch = async () => {
    if (!newOT.address) return;
    setSearchLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newOT.address)}&countrycodes=mx&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setNewOT(prev => ({ ...prev, lat: parseFloat(lat), lng: parseFloat(lon), address: display_name }));
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (error) { console.error(error); }
    finally { setSearchLoading(false); }
  };

  const handleClientSelect = (clientId) => {
    if (!clientId) return;
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setNewOT(prev => ({
        ...prev,
        client: client.name,
        address: client.address,
        clientEmail: client.email || '',
        clientPhone: client.phone || '',
        lat: client.lat || prev.lat,
        lng: client.lng || prev.lng
      }));
      if (client.lat && client.lng) setMapCenter([client.lat, client.lng]);
    }
  };

  const handleTemplateSelect = (templateId) => {
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewOT(prev => ({
        ...prev,
        title: template.title,
        workDescription: template.workDescription || template.description,
        priority: template.priority,
        arrivalTime: template.arrivalTime
      }));
    }
  };

  const toggleAssistantTech = (tech) => {
    setNewOT(prev => {
      const exists = prev.assistantTechs?.find(t => t.id === tech.id);
      if (exists) return { ...prev, assistantTechs: prev.assistantTechs.filter(t => t.id !== tech.id) };
      return { ...prev, assistantTechs: [...(prev.assistantTechs || []), tech] };
    });
  };

  const filteredOts = ots.filter(ot => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (ot.id?.toLowerCase() || '').includes(searchLower) ||
      (ot.title?.toLowerCase() || '').includes(searchLower) ||
      (ot.client?.toLowerCase() || '').includes(searchLower) ||
      (ot.clientName?.toLowerCase() || '').includes(searchLower) ||
      (ot.otNumber?.toLowerCase() || '').includes(searchLower);
    const matchesStatus = filters.status === 'ALL' || ot.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">Control de Operaciones</h2>
          <p className="text-sm text-gray-500 font-medium mt-2">Monitoreo estratégico y auditoría técnica.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/ots/leaderboard')}
            className="bg-white border text-gray-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-50 shadow-sm"
          >
            <Trophy className="h-4 w-4 text-amber-500" /> Ranking
          </button>
          <button
            onClick={openCreateModal}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <ClipboardList className="h-4 w-4" /> Nueva OT
          </button>
        </div>
      </div>

      <div className="h-[350px] rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-inner relative z-0 bg-gray-50">
        <MapContainer center={[19.4326, -99.1332]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {ots.filter(o => o.lat && o.lng).map(ot => (
            <Marker key={ot.id} position={[ot.lat, ot.lng]} icon={otIcon}>
              <Popup>
                <div className="p-2 space-y-2">
                  <p className="font-black text-sm uppercase">{ot.otNumber}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">{ot.title}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por folio o cliente..."
              className="pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none w-full font-bold text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto">
            {['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map(s => (
              <button
                key={s}
                onClick={() => setFilters({ ...filters, status: s })}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all whitespace-nowrap",
                  filters.status === s ? "bg-gray-900 text-white shadow-md" : "bg-white text-gray-400 hover:bg-gray-50"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-white border-b">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Folio / Prioridad</th>
                <th className="px-6 py-5">Servicio y Cliente</th>
                <th className="px-6 py-5">Técnico / Fondo</th>
                <th className="px-6 py-5">Estado</th>
                <th className="px-8 py-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOts.map((ot) => (
                <tr key={ot.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="font-black text-sm text-gray-900">{ot.otNumber}</p>
                    <span
                      className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 rounded uppercase border",
                        ot.priority === 'HIGH'
                          ? "bg-red-50 text-red-600 border-red-100"
                          : "bg-blue-50 text-blue-600 border-blue-100"
                      )}
                    >
                      {ot.priority}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-bold text-sm text-gray-700 leading-tight">{ot.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{ot.clientName || ot.client}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase">
                        {ot.leadTechName?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-700 uppercase">{ot.leadTechName || 'Pendiente'}</p>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                            Fondo: ${ot.assignedFunds?.toLocaleString()}
                          </p>
                          {ot.assignedByName && (
                            <p className="text-[8px] text-indigo-500 font-black uppercase tracking-tighter flex items-center gap-1">
                              <Send className="h-2 w-2" /> {ot.assignedByName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={cn(
                        "text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border shadow-sm",
                        ot.status === 'COMPLETED'
                          ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-100"
                          : ot.status === 'IN_PROGRESS'
                            ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                            : "bg-gray-50 text-gray-400 border-gray-100"
                      )}
                    >
                      {ot.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {ot.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            if (ot.deliveryActUrl) {
                              window.open(ot.deliveryActUrl, '_blank');
                            } else {
                              handleExportAER(ot);
                            }
                          }}
                          className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 border border-emerald-100 transition-all shadow-sm"
                        >
                          <FileText className="h-4 w-4" /> {ot.deliveryActUrl ? 'Ver Acta' : 'Generar Acta'}
                        </button>
                      )}
                      <button onClick={() => navigate(`/ots/${ot.id}`)} className="p-2 text-gray-400 hover:text-primary transition-all">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => openEditModal(ot)} 
                        disabled={ot.status === 'COMPLETED'}
                        className={cn("p-2 transition-all", ot.status === 'COMPLETED' ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-primary")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => { setOtToDelete(ot); setIsDeleteModalOpen(true); }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Principal de OT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-center mb-8 border-b pb-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                    {isEditMode ? `Gestión: ${editingId}` : 'Nueva Orden de Trabajo'}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                    <Layers className="h-3 w-3 text-primary" /> Olea controls • Operaciones 2026
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-8">
                {/* Selectores Superiores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                    <label className="text-[9px] font-black uppercase text-primary tracking-widest ml-1">Importar Cliente CRM</label>
                    <select
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-4 text-xs font-black shadow-sm outline-none focus:border-primary"
                      onChange={e => handleClientSelect(e.target.value)}
                    >
                      <option value="">Seleccionar existente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                    <label className="text-[9px] font-black uppercase text-purple-500 tracking-widest ml-1">Usar Plantilla OT</label>
                    <select
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-4 text-xs font-black shadow-sm outline-none focus:border-purple-400"
                      onChange={e => handleTemplateSelect(e.target.value)}
                    >
                      <option value="">Seleccionar tipo...</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
                      <SectionHeader title="Identificación" icon={FileText} />
                      <InputField label="Título de la Orden" value={newOT.title} onChange={v => setNewOT({ ...newOT, title: v })} />
                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Tienda #" value={newOT.storeNumber} onChange={v => setNewOT({ ...newOT, storeNumber: v })} />
                        <InputField label="Nombre Sucursal" value={newOT.storeName} onChange={v => setNewOT({ ...newOT, storeName: v })} />
                      </div>
                    </div>

                    <div className="bg-blue-50/20 rounded-[2rem] border border-blue-100 p-6 shadow-sm space-y-4">
                      <SectionHeader title="Contacto en Sitio" icon={User} color="blue" />
                      <InputField label="Persona Encargada" value={newOT.contactName} onChange={v => setNewOT({ ...newOT, contactName: v })} />
                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Email Contacto" type="email" value={newOT.contactEmail} onChange={v => setNewOT({ ...newOT, contactEmail: v })} />
                        <InputField label="Teléfono Directo" value={newOT.contactPhone} onChange={v => setNewOT({ ...newOT, contactPhone: v })} />
                      </div>
                      <InputField label="Referencia de Acceso" value={newOT.otReference} onChange={v => setNewOT({ ...newOT, otReference: v })} />
                    </div>

                    <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
                      <SectionHeader title="Datos del Cliente" icon={Building2} color="gray" />
                      <InputField label="Razón Social / Empresa" value={newOT.client} onChange={v => setNewOT({ ...newOT, client: v })} />
                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Email Facturación" value={newOT.clientEmail} onChange={v => setNewOT({ ...newOT, clientEmail: v })} />
                        <InputField label="Teléfono Oficina" value={newOT.clientPhone} onChange={v => setNewOT({ ...newOT, clientPhone: v })} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
                      <SectionHeader title="Ubicación y Mapa" icon={MapPin} color="emerald" />
                      <div className="flex gap-2">
                        <input
                          required
                          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                          value={newOT.address}
                          onChange={e => setNewOT({ ...newOT, address: e.target.value })}
                          placeholder="Dirección..."
                        />
                        <button
                          type="button"
                          onClick={handleLocationSearch}
                          className="bg-gray-900 text-white px-4 rounded-xl hover:bg-black transition-all"
                        >
                          {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Dir. Secundaria" value={newOT.secondaryAddress} onChange={v => setNewOT({ ...newOT, secondaryAddress: v })} />
                        <InputField label="Zona / Referencia" value={newOT.otAddress} onChange={v => setNewOT({ ...newOT, otAddress: v })} />
                      </div>
                      <div className="h-[180px] rounded-2xl overflow-hidden border relative z-0">
                        <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={[newOT.lat, newOT.lng]} icon={otIcon} />
                          <MapEvents onLocationSelect={async (latlng) => {
                            setNewOT(prev => ({ ...prev, lat: latlng.lat, lng: latlng.lng }));
                            try {
                              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`);
                              const data = await res.json();
                              if (data && data.display_name) setNewOT(prev => ({ ...prev, address: data.display_name }));
                            } catch (err) { console.error(err); }
                          }} />
                          <ChangeView center={mapCenter} />
                        </MapContainer>
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-[2rem] p-6 text-white space-y-6 relative overflow-hidden shadow-xl">
                      <SectionHeader title="Logística y Fondos" icon={Clock} color="primary" dark />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-gray-500">Técnico Líder</label>
                          <select
                            required
                            className="w-full px-3 py-2 bg-gray-800 border-gray-700 text-white rounded-xl font-bold text-xs"
                            value={newOT.leadTechId}
                            onChange={e => setNewOT({
                              ...newOT,
                              leadTechId: e.target.value,
                              leadTechName: e.target.options[e.target.selectedIndex].text
                            })}
                          >
                            <option value="">Líder...</option>
                            {availableTechs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <InputField label="Fecha Programada" type="date" value={newOT.scheduledDate} onChange={v => setNewOT({ ...newOT, scheduledDate: v })} dark />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-gray-500">Equipo de Apoyo</label>
                        <div className="flex flex-wrap gap-2">
                          {availableTechs.filter(t => t.id !== newOT.leadTechId).map(tech => (
                            <button
                              key={tech.id}
                              type="button"
                              onClick={() => toggleAssistantTech(tech)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all",
                                newOT.assistantTechs?.some(t => t.id === tech.id)
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                  : "bg-gray-800 text-gray-400 border-gray-100 hover:border-gray-500"
                              )}
                            >
                              {tech.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700 flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-indigo-400 uppercase">Presupuesto OT</p>
                          <p className="text-xl font-black text-white">${(newOT.assignedFunds || 0).toLocaleString()}</p>
                        </div>

                        {isEditMode ? (
                          <div className="flex flex-col items-end gap-1">
                            <label className="text-[8px] font-black uppercase text-emerald-400">Extra</label>
                            <input
                              type="number"
                              className="w-24 px-2 py-1 bg-gray-900 border border-emerald-500/30 rounded-lg text-white font-black text-xs"
                              value={extraFunds}
                              onChange={e => setExtraFunds(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <label className="text-[8px] font-black uppercase text-gray-500">Monto Inicial</label>
                            <input
                              type="number"
                              className="w-24 px-2 py-1 bg-gray-800 border-gray-700 rounded-lg text-white font-black text-xs"
                              value={newOT.assignedFunds}
                              onChange={e => setNewOT({ ...newOT, assignedFunds: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Prioridad" value={newOT.priority} onChange={v => setNewOT({ ...newOT, priority: v })} isSelect options={['LOW', 'MEDIUM', 'HIGH']} dark />
                        <InputField label="Hora Llegada" type="time" value={newOT.arrivalTime} onChange={v => setNewOT({ ...newOT, arrivalTime: v })} dark />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Instrucciones</label>
                        <textarea
                          rows="2"
                          className="w-full px-4 py-3 bg-gray-800 border-gray-700 text-white rounded-xl font-bold text-[11px] resize-none outline-none focus:border-primary shadow-inner"
                          value={newOT.workDescription}
                          onChange={e => setNewOT({ ...newOT, workDescription: e.target.value })}
                          placeholder="Labor técnica..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 text-gray-400 font-black text-xs uppercase hover:text-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-primary text-white px-12 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-primary/90 transition-all active:scale-95 min-w-[200px] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
                      </>
                    ) : (
                      isEditMode ? 'Actualizar Orden' : 'Publicar y Notificar'
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminación */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 text-center space-y-8 animate-in zoom-in-95">
            <div className="h-24 w-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-100">
              <AlertCircle className="h-12 w-12" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">¿Eliminar Orden?</h3>
              <p className="text-base font-bold text-gray-400 mt-3 leading-relaxed">Esta acción es irreversible.</p>
            </div>
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</> : 'Eliminar Permanente'}
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                disabled={isDeleting}
                className="w-full bg-gray-50 text-gray-400 py-5 rounded-2xl font-black text-xs uppercase disabled:opacity-30"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, color = "primary", dark = false }) {
  return (
    <div className={cn("flex items-center gap-3 border-b pb-4", dark ? "border-white/10" : "border-gray-100")}>
      <div className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm",
        color === 'primary'
          ? "bg-primary/10 text-primary"
          : color === 'blue'
            ? "bg-blue-100 text-blue-600"
            : color === 'emerald'
              ? "bg-emerald-100 text-emerald-600"
              : "bg-gray-100 text-gray-700"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <h4 className={cn("text-xs font-black uppercase tracking-widest", dark ? "text-white" : "text-gray-900")}>{title}</h4>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", dark = false, isSelect = false, options = [], readOnly = false }) {
  return (
    <div className="space-y-1.5">
      <label className={cn("text-[9px] font-black uppercase tracking-wider ml-1", dark ? "text-gray-500" : "text-gray-400")}>{label}</label>
      {isSelect ? (
        <select
          className={cn(
            "w-full px-4 py-2.5 border rounded-xl font-bold text-xs outline-none transition-all shadow-sm",
            dark ? "bg-gray-800 border-gray-700 text-white focus:border-primary" : "bg-gray-50 focus:bg-white focus:border-primary"
          )}
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type={type}
          readOnly={readOnly}
          className={cn(
            "w-full px-4 py-2.5 border rounded-xl font-bold text-xs outline-none transition-all shadow-sm",
            dark ? "bg-gray-800 border-gray-700 text-white focus:border-primary" : "bg-gray-50 focus:bg-white focus:border-primary"
          )}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}