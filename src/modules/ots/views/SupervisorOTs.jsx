import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Search, MoreHorizontal, Clock, Eye,
  X, Send, Trophy, Building2, User, Trash2, AlertCircle, FileText,
  MapPin, Loader2, Layers, ChevronDown, ChevronUp, Receipt, TrendingDown,
  DollarSign, ChevronLeft, ChevronRight, Check, Briefcase, Zap, Star, MessageSquare
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { otService } from '@/api/otService';
import { crmService } from '@/api/crmService';
import { hrService } from '@/api/hrService';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Custom Marker Icons — DivIcon SVG (no external URLs)
const otIcon = new L.DivIcon({
  html: `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 0C4.92 0 0 4.92 0 11C0 19.25 11 30 11 30C11 30 22 19.25 22 11C22 4.92 17.08 0 11 0Z" fill="#3b82f6"/>
    <circle cx="11" cy="11" r="4.5" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -32],
});

const techIcon = new L.DivIcon({
  html: `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 0C4.92 0 0 4.92 0 11C0 19.25 11 30 11 30C11 30 22 19.25 22 11C22 4.92 17.08 0 11 0Z" fill="#10b981"/>
    <circle cx="11" cy="11" r="4.5" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -32],
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
  useEffect(() => { map.setView(center, 15); }, [center, map]);
  return null;
}

// Mapa principal memoizado — no re-renderiza cuando cambia el estado del modal
const OTsMap = memo(function OTsMap({ ots, techLocations, otIcon, techIcon }) {
  return (
    <MapContainer center={[19.4326, -99.1332]} zoom={11} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {ots.filter(o => o.lat && o.lng).map(ot => (
        <Marker key={ot.id} position={[ot.lat, ot.lng]} icon={otIcon}>
          <Popup>
            <div className="p-1 space-y-0.5">
              <p className="font-black text-xs">{ot.otNumber}</p>
              <p className="text-[10px] text-gray-500">{ot.title}</p>
              {ot.leadTechName && <p className="text-[10px] text-blue-600">{ot.leadTechName}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
      {Object.values(techLocations).map(tech =>
        tech.lat && tech.lng ? (
          <Marker key={`tech-${tech.id}`} position={[tech.lat, tech.lng]} icon={techIcon}>
            <Popup>
              <div style={{minWidth:160}} className="p-1 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#10b981'}} />
                  <p className="font-black text-xs text-green-700">{tech.name}</p>
                </div>
                {tech.lastUpdate ? (() => {
                  const d = new Date(tech.lastUpdate);
                  const dia = d.toLocaleDateString('es-MX', { weekday: 'long' });
                  const fecha = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                  const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <div className="space-y-0.5">
                      <p style={{textTransform:'capitalize'}} className="text-[10px] font-semibold text-gray-700">{dia}</p>
                      <p className="text-[10px] text-gray-500">{fecha}</p>
                      <p className="text-[10px] font-mono font-bold" style={{color:'#3b82f6'}}>{hora}</p>
                    </div>
                  );
                })() : (
                  <p className="text-[10px] text-gray-400 italic">Sin ubicación registrada</p>
                )}
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
});

export default function SupervisorOTs() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [ots, setOts] = useState([]);
  const [expandedOtId, setExpandedOtId] = useState(null);
  const [otFinancials, setOtFinancials] = useState({});
  const [loadingFinancials, setLoadingFinancials] = useState({});
  const [clients, setClients] = useState([]);
  const [otClients, setOtClients] = useState([]);
  const [otClientSearch, setOtClientSearch] = useState('');
  const [showOtClientDropdown, setShowOtClientDropdown] = useState(false);
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
  const [filters, setFilters] = useState({ status: 'ALL', priority: 'ALL', techId: 'ALL' });

  // Paginación server-side
  const OT_PAGE_SIZE = 50;
  const [otPage, setOtPage]   = useState(1);
  const [otTotal, setOtTotal] = useState(0);
  const searchDebounceRef     = useRef(null);
  const [formStep, setFormStep] = useState(1);

  const initialNewOT = {
    title: '', storeNumber: '', storeName: '', client: '', address: '', secondaryAddress: '',
    otAddress: '', otReference: '', lat: 19.4326, lng: -99.1332, clientEmail: '', clientPhone: '',
    contactName: '', contactEmail: '', contactPhone: '', leadTechId: '', leadTechName: '',
    assistantTechs: [], workDescription: '', arrivalTime: '09:00',
    scheduledDate: new Date().toISOString().split('T')[0],
    priority: 'MEDIUM', assignedFunds: 0, techMetas: '', techHasVehicle: false
  };

  const [newOT, setNewOT] = useState(initialNewOT);

  // Normaliza la respuesta de la API: siempre devuelve { data: T[], total: number }
  const parseOTsResponse = (json) => {
    if (Array.isArray(json)) return { data: json, total: json.length };
    const data = Array.isArray(json?.data) ? json.data : [];
    const total = typeof json?.total === 'number' ? json.total : data.length;
    return { data, total };
  };

  // Carga de OTs — recibe el número de página explícitamente para evitar closures obsoletos
  const loadOTs = async (page, search, status, techId) => {
    try {
      const params = { page, limit: OT_PAGE_SIZE };
      if (search)                     params.search = search;
      if (status && status !== 'ALL') params.status = status;
      if (techId && techId !== 'ALL') params.techId = techId;
      const raw = await otService.getOTsPaginated(params);
      const { data, total } = parseOTsResponse(raw);
      setOts(data);
      setOtTotal(total);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [rawOTs, c, oc, t, allEmployees] = await Promise.all([
          otService.getOTsPaginated({ page: 1, limit: OT_PAGE_SIZE }),
          crmService.getClients(),
          otService.getOTClients(),
          otService.getTemplates(),
          hrService.getEmployees()
        ]);
        const { data, total } = parseOTsResponse(rawOTs);
        setOts(data);
        setOtTotal(total);
        setClients(Array.isArray(c) ? c : []);
        setOtClients(Array.isArray(oc) ? oc : []);
        setTemplates(Array.isArray(t) ? t : []);
        const techs = Array.isArray(allEmployees)
          ? allEmployees.filter(emp => emp.roles?.includes(ROLES.TECH) || emp.roles?.includes('Tech'))
          : [];
        setAvailableTechs(techs);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    init();

    const fetchTechLocations = async () => {
      try { setTechLocations(await otService.getTechnicianLocations()); } catch (_) {}
    };
    fetchTechLocations();
    const interval = setInterval(fetchTechLocations, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Alias para que llamadas internas (ej: después de guardar una OT) recarguen la página actual
  const loadData = () => loadOTs(otPage, searchTerm, filters.status, filters.techId);

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
      head: [['CLIENTE', 'NOMBRE DE SITIO', 'FECHA DE CIERRE', 'ESTADO']],
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

  const toggleOtAccordion = (otId) => {
    if (expandedOtId === otId) {
      setExpandedOtId(null);
      return;
    }

    setExpandedOtId(otId);

    const ot = ots.find(o => o.id === otId);
    if (ot && ot.financials) {
      setOtFinancials(prev => ({ ...prev, [otId]: ot.financials }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const data = { ...newOT };
      if (extraFunds > 0) data.assignedFunds = (parseFloat(newOT.assignedFunds) || 0) + parseFloat(extraFunds);

      let savedOT;
      if (isEditMode) {
        savedOT = await otService.updateOT(editingId, data);
      } else {
        savedOT = await otService.saveOT({ ...data, supervisorId: currentUser.id });
      }

      // Si hay técnico asignado, crear/actualizar la meta diaria para asistencia técnica
      if (newOT.leadTechId && newOT.scheduledDate) {
        try {
          const folio      = savedOT?.otNumber || savedOT?.id || (isEditMode ? editingId : null);
          const goalBase   = {
            date:           newOT.scheduledDate,
            clientName:     newOT.client || newOT.storeName || 'Sin cliente',
            clientLocation: newOT.address || '',
            notes:          newOT.techMetas || '',
            otNumber:       folio,
          };

          // Técnico líder (lleva vehículo si se marcó)
          await apiFetch('/api/tech-attendance/goals', {
            method: 'POST',
            body: JSON.stringify({ ...goalBase, techId: newOT.leadTechId, hasVehicle: newOT.techHasVehicle || false }),
          });

          // Técnicos de apoyo — assistantTechs y supportTechs (sin vehículo propio por defecto)
          // Metas independientes por técnico → se crean en paralelo, en una sola pasada
          await Promise.all(
            [...(newOT.assistantTechs || []), ...(newOT.supportTechs || [])].flatMap(at =>
              at?.id
                ? [apiFetch('/api/tech-attendance/goals', {
                    method: 'POST',
                    body: JSON.stringify({ ...goalBase, techId: at.id, hasVehicle: false }),
                  })]
                : []
            )
          );
        } catch (_) { /* no bloquear el guardado de la OT si falla la meta */ }
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
    setFormStep(1);
    setOtClientSearch('');
    setShowOtClientDropdown(false);
    setIsModalOpen(true);
  };

  const openEditModal = async (ot) => {
    setNewOT({
      ...initialNewOT,
      ...ot,
      workDescription:  ot.description || ot.workDescription || '',
      scheduledDate:    ot.scheduledDate ? ot.scheduledDate.split('T')[0] : new Date().toISOString().split('T')[0],
      arrivalTime:      ot.arrivalTime  || '09:00',
      techMetas:        '',
      techHasVehicle:   false,
      assistantTechs:   Array.isArray(ot.assistantTechs) ? ot.assistantTechs : [],
    });
    setEditingId(ot.id);
    setIsEditMode(true);
    setFormStep(1);
    setMapCenter([ot.lat || 19.4326, ot.lng || -99.1332]);
    setIsModalOpen(true);

    // Cargar techMetas y techHasVehicle desde TechDailyGoal si existe un goal vinculado
    const otNum = ot.otNumber || ot.id;
    if (otNum) {
      try {
        const res = await apiFetch(`/api/tech-attendance/goals?otNumber=${encodeURIComponent(otNum)}`);
        if (res.ok) {
          const goals = await res.json();
          if (goals?.length > 0) {
            const goal = goals[0];
            setNewOT(prev => ({
              ...prev,
              techMetas:      goal.notes      || '',
              techHasVehicle: goal.hasVehicle || false,
            }));
          }
        }
      } catch { /* no bloquear la apertura del modal */ }
    }
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

  const handleOTClientSelect = (otClient) => {
    setNewOT(prev => ({
      ...prev,
      client: otClient.name,
      storeNumber: otClient.storeNumber || prev.storeNumber,
      storeName: otClient.storeName || prev.storeName,
      address: otClient.address || prev.address,
      otReference: otClient.otReference || prev.otReference,
      clientEmail: otClient.email || prev.clientEmail,
      clientPhone: otClient.phone || prev.clientPhone,
      contactName: otClient.contact || prev.contactName,
      contactPhone: otClient.phone || prev.contactPhone,
      lat: otClient.lat || prev.lat,
      lng: otClient.lng || prev.lng
    }));
    if (otClient.lat && otClient.lng) setMapCenter([otClient.lat, otClient.lng]);
    setOtClientSearch(otClient.storeName ? `${otClient.name} — ${otClient.storeName}` : otClient.name);
    setShowOtClientDropdown(false);
  };

  const filteredOtClientSuggestions = useMemo(() =>
    otClientSearch.length > 0
      ? otClients.filter(c => {
          const q = otClientSearch.toLowerCase();
          return [c.name, c.storeName, c.storeNumber, c.contact].some(v => v?.toLowerCase().includes(q));
        }).slice(0, 8)
      : otClients.slice(0, 8),
  [otClientSearch, otClients]);

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

  // Búsqueda con debounce → recarga desde servidor, resetea a página 1
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setOtPage(1);
      loadOTs(1, value, filters.status, filters.techId); // pasa el value nuevo directamente, no el state
    }, 350);
  };

  // Cambio de filtro de status → recarga inmediata desde servidor
  const handleStatusFilter = (newStatus) => {
    setFilters(prev => ({ ...prev, status: newStatus }));
    setOtPage(1);
    loadOTs(1, searchTerm, newStatus, filters.techId); // pasa el newStatus directamente, no el state
  };

  // Cambio de filtro por técnico → recarga inmediata desde servidor (líder + apoyo)
  const handleTechFilter = (newTechId) => {
    setFilters(prev => ({ ...prev, techId: newTechId }));
    setOtPage(1);
    loadOTs(1, searchTerm, filters.status, newTechId); // pasa el techId nuevo directamente, no el state
  };

  // Navegar de página — llama a loadOTs directamente con el número nuevo
  const goToPage = (newPage) => {
    setOtPage(newPage);
    loadOTs(newPage, searchTerm, filters.status, filters.techId);
  };

  // Filtrado local solo por priority (no enviado al servidor)
  const filteredOts = useMemo(() =>
    filters.priority === 'ALL' ? ots : ots.filter(ot => ot.priority === filters.priority),
  [ots, filters.priority]);

  const kpis = {
    total:       otTotal,
    pending:     ots.filter(o => o.status === 'UNASSIGNED' || o.status === 'PENDING').length,
    accepted:    ots.filter(o => o.status === 'ACCEPTED').length,
    inProgress:  ots.filter(o => o.status === 'IN_PROGRESS').length,
    completed:   ots.filter(o => o.status === 'COMPLETED' || o.status === 'VALIDATED').length,
    urgent:      ots.filter(o => (o.priority === 'URGENT' || o.priority === 'HIGH') && o.status !== 'COMPLETED' && o.status !== 'VALIDATED').length,
  };

  const STATUS_META = {
    ALL:         { label: 'Todas',       color: 'text-slate-600',   dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600 border-slate-200' },
    PENDING:     { label: 'Sin Asignar', color: 'text-slate-500',   dot: 'bg-slate-300',   badge: 'bg-slate-50 text-slate-500 border-slate-200' },
    UNASSIGNED:  { label: 'Sin Asignar', color: 'text-slate-500',   dot: 'bg-slate-300',   badge: 'bg-slate-50 text-slate-500 border-slate-200' },
    ASSIGNED:    { label: 'Asignada',    color: 'text-violet-600',  dot: 'bg-violet-400',  badge: 'bg-violet-50 text-violet-600 border-violet-200' },
    ACCEPTED:    { label: 'Aceptada',    color: 'text-sky-700',     dot: 'bg-sky-500',     badge: 'bg-sky-50 text-sky-700 border-sky-200' },
    IN_PROGRESS: { label: 'En Proceso',  color: 'text-amber-700',   dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    COMPLETED:   { label: 'Completada',  color: 'text-emerald-700', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    VALIDATED:   { label: 'Validada',    color: 'text-blue-700',    dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  };

  const PRIORITY_META = {
    URGENT: { label: 'Urgente', badge: 'bg-red-50 text-red-700 border-red-200',           bar: 'bg-red-500' },
    HIGH:   { label: 'Alta',    badge: 'bg-orange-50 text-orange-700 border-orange-200',  bar: 'bg-orange-500' },
    MEDIUM: { label: 'Media',   badge: 'bg-blue-50 text-blue-600 border-blue-200',        bar: 'bg-blue-400' },
    LOW:    { label: 'Baja',    badge: 'bg-slate-50 text-slate-500 border-slate-200',     bar: 'bg-slate-300' },
  };

  return (
    <div className="space-y-4 pb-24">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 pb-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-9 w-1 rounded-full bg-blue-500 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-500 mb-0.5">
              Operaciones · {new Date().getFullYear()}
            </p>
            <h1 className="text-[1.75rem] font-extrabold text-gray-900 leading-none tracking-tight">
              Control de Operaciones
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {kpis.total} órdenes totales
              {kpis.inProgress > 0 && <> · <span className="text-amber-600 font-semibold">{kpis.inProgress} en proceso</span></>}
              {kpis.urgent > 0 && <> · <span className="text-red-500 font-semibold">{kpis.urgent} alta prioridad</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pb-1">
          <button
            onClick={() => navigate('/ots/leaderboard')}
            className="cursor-pointer h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 font-semibold text-xs flex items-center gap-2 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" /> Ranking
          </button>
          <button
            onClick={openCreateModal}
            className="cursor-pointer h-9 px-5 rounded-xl bg-blue-600 text-white font-semibold text-xs flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <ClipboardList className="h-3.5 w-3.5" /> Nueva OT
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total',         value: kpis.total,      sub: 'todas las órdenes', color: '#3b82f6', bg: '#eff6ff',  icon: <ClipboardList className="h-4 w-4" style={{color:'#3b82f6'}} /> },
          { label: 'Sin Asignar',   value: kpis.pending,    sub: 'esperando técnico', color: '#94a3b8', bg: '#f8fafc',  icon: <Clock className="h-4 w-4" style={{color:'#94a3b8'}} /> },
          { label: 'Aceptadas',     value: kpis.accepted,   sub: 'confirmadas',       color: '#0ea5e9', bg: '#f0f9ff',  icon: <Check className="h-4 w-4" style={{color:'#0ea5e9'}} /> },
          { label: 'En Proceso',    value: kpis.inProgress, sub: 'actualmente',       color: '#d97706', bg: '#fffbeb',  icon: <Zap className="h-4 w-4" style={{color:'#d97706'}} />,  pulse: kpis.inProgress > 0 },
          { label: 'Completadas',   value: kpis.completed,  sub: 'finalizadas',       color: '#10b981', bg: '#ecfdf5',  icon: <Star className="h-4 w-4" style={{color:'#10b981'}} /> },
          { label: 'Alta Prioridad',value: kpis.urgent,     sub: 'urgente / alta',    color: '#ef4444', bg: '#fef2f2',  icon: <AlertCircle className="h-4 w-4" style={{color:'#ef4444'}} />, pulse: kpis.urgent > 0 },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{background: card.color, opacity: card.value > 0 ? 1 : 0.2}} />
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{background: card.bg}}>
                {card.icon}
              </div>
              {card.pulse && <div className="h-2 w-2 rounded-full animate-pulse" style={{background: card.color}} />}
            </div>
            <div>
              <p className="text-2xl font-black tabular-nums leading-none" style={{color: card.value > 0 ? card.color : '#cbd5e1'}}>
                {card.value}
              </p>
              <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MAPA + PANEL LATERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mapa */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-xs font-bold text-gray-700">Mapa de Operaciones</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                <p className="text-[9px] font-semibold text-gray-400">{ots.filter(o => o.lat && o.lng).length} OTs</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-[9px] font-semibold text-gray-400">{Object.keys(techLocations).length} técnicos</p>
              </div>
            </div>
          </div>
          <div className="relative z-0 flex-1 min-h-[240px]">
            <OTsMap ots={ots} techLocations={techLocations} otIcon={otIcon} techIcon={techIcon} />
          </div>
        </div>

        {/* Panel lateral */}
        <div className="flex flex-col gap-3">
          {/* En Proceso ahora */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-xs font-bold text-gray-700">En proceso ahora</p>
              </div>
              <span className={cn("text-[10px] font-mono font-black tabular-nums px-2 py-0.5 rounded-lg", kpis.inProgress > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-300")}>
                {kpis.inProgress}
              </span>
            </div>
            <div className="p-3 space-y-1">
              {ots.filter(o => o.status === 'IN_PROGRESS').slice(0, 5).map(o => (
                <button
                  key={o.id}
                  onClick={() => navigate(`/ots/${o.id}`)}
                  className="cursor-pointer w-full flex items-center gap-2.5 text-left hover:bg-amber-50/60 rounded-xl px-2.5 py-2 transition-colors duration-150 group"
                >
                  <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">
                    {o.leadTechName?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-gray-800 truncate leading-none">{o.otNumber}</p>
                    <p className="text-[9px] text-gray-400 truncate mt-0.5">{o.clientName || o.client}</p>
                  </div>
                  <Eye className="h-3 w-3 text-gray-200 group-hover:text-amber-400 transition-colors shrink-0" />
                </button>
              ))}
              {kpis.inProgress === 0 && (
                <p className="text-[10px] text-gray-300 font-semibold text-center py-5">Sin órdenes activas</p>
              )}
            </div>
          </div>

          {/* Urgentes */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                <p className="text-xs font-bold text-gray-700">Alta prioridad</p>
              </div>
              {kpis.urgent > 0 && <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />}
            </div>
            <div className="p-3 space-y-1">
              {ots.filter(o => (o.priority === 'URGENT' || o.priority === 'HIGH') && o.status !== 'COMPLETED' && o.status !== 'VALIDATED').slice(0, 4).map(o => (
                <div key={o.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-red-50/40 transition-colors">
                  <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", o.priority === 'URGENT' ? 'bg-red-500' : 'bg-orange-400')} />
                  <p className="text-[10px] font-semibold text-gray-700 truncate flex-1">{o.otNumber}</p>
                  <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-lg border shrink-0", PRIORITY_META[o.priority]?.badge)}>
                    {PRIORITY_META[o.priority]?.label}
                  </span>
                </div>
              ))}
              {kpis.urgent === 0 && (
                <p className="text-[10px] text-gray-300 font-semibold text-center py-3">Sin alertas</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE ÓRDENES */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-5 pt-4 pb-0 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0">
            {/* Tabs */}
            <div className="flex items-end gap-0 overflow-x-auto">
              {['ALL', 'UNASSIGNED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].map(s => {
                const meta = STATUS_META[s];
                const isActive = filters.status === s;
                const count = s === 'ALL' ? otTotal : ots.filter(o => o.status === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusFilter(s)}
                    className={cn(
                      "cursor-pointer shrink-0 flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-wide border-b-2 transition-all duration-150 whitespace-nowrap",
                      isActive
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"
                    )}
                  >
                    {isActive && <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />}
                    {meta.label}
                    <span className={cn("font-mono text-[9px]", isActive ? "text-blue-400" : "text-gray-300")}>{count}</span>
                  </button>
                );
              })}
            </div>
            {/* Filtros: técnico + búsqueda */}
            <div className="flex items-center gap-2 mb-2 sm:mb-1 shrink-0">
              {/* Filtro por técnico */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                <select
                  value={filters.techId}
                  onChange={(e) => handleTechFilter(e.target.value)}
                  className={cn(
                    "cursor-pointer appearance-none pl-9 pr-8 py-2 bg-gray-50 border rounded-xl outline-none text-sm font-medium focus:bg-white focus:ring-1 focus:ring-blue-100 transition-all duration-150 max-w-[180px] truncate",
                    filters.techId !== 'ALL'
                      ? "border-blue-200 text-blue-700 bg-blue-50/50"
                      : "border-gray-100 text-gray-700 focus:border-blue-200"
                  )}
                >
                  <option value="ALL">Todos los técnicos</option>
                  {availableTechs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
              </div>
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar folio o cliente..."
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-medium text-gray-700 placeholder:text-gray-300 focus:bg-white focus:border-blue-200 focus:ring-1 focus:ring-blue-100 transition-all duration-150 w-56"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="w-10 px-4 py-3" />
                <th className="px-5 py-3 text-left">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Folio</span>
                </th>
                <th className="px-5 py-3 text-left">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Servicio · Cliente</span>
                </th>
                <th className="px-5 py-3 text-left">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Técnico · Fondos</span>
                </th>
                <th className="px-5 py-3 text-left">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Estado</span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <ClipboardList className="h-8 w-8 text-gray-150 mx-auto mb-3 text-gray-200" />
                    <p className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-widest">Sin órdenes</p>
                  </td>
                </tr>
              )}

              {filteredOts.map((ot) => {
                const prioMeta   = PRIORITY_META[ot.priority] || PRIORITY_META.MEDIUM;
                const statMeta   = STATUS_META[ot.status]     || STATUS_META.PENDING;
                const isExpanded = expandedOtId === ot.id;

                return (
                  <React.Fragment key={ot.id}>
                    <tr
                      onClick={() => toggleOtAccordion(ot.id)}
                      className={cn(
                        "cursor-pointer border-b border-gray-50 transition-colors duration-100 group relative",
                        isExpanded ? "bg-blue-50/30" : "hover:bg-gray-50/70"
                      )}
                    >
                      {/* Borde izquierdo de prioridad */}
                      <td className="w-10 px-0 pl-2 relative">
                        <div className={cn("absolute left-0 top-3 bottom-3 w-[3px] rounded-full", prioMeta.bar)} />
                        <div className="flex justify-center">
                          <div className={cn(
                            "h-5 w-5 rounded-md flex items-center justify-center transition-colors duration-100",
                            isExpanded ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                          )}>
                            {isExpanded
                              ? <ChevronUp className="h-3 w-3" />
                              : <ChevronDown className="h-3 w-3" />}
                          </div>
                        </div>
                      </td>

                      {/* Folio + prioridad */}
                      <td className="px-5 py-4">
                        <p className="font-mono font-bold text-[13px] text-gray-900 leading-none">{ot.otNumber}</p>
                        <span className={cn("inline-flex items-center gap-1 mt-1.5 text-[8px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase", prioMeta.badge)}>
                          {prioMeta.label}
                        </span>
                      </td>

                      {/* Servicio + cliente */}
                      <td className="px-5 py-4 max-w-[240px]">
                        <p className="font-semibold text-sm text-gray-800 leading-tight truncate">{ot.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3 text-gray-300 shrink-0" />
                          <p className="text-[10px] text-gray-400 font-medium truncate">{ot.clientName || ot.client || '—'}</p>
                        </div>
                        {ot.scheduledDate && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-gray-200 shrink-0" />
                            <p className="text-[9px] text-gray-300 font-mono">
                              {new Date(ot.scheduledDate.split('T')[0] + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Técnico + fondos */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0",
                            ot.leadTechName ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-300"
                          )}>
                            {ot.leadTechName?.charAt(0) || '—'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700 leading-none truncate max-w-[110px]">
                              {ot.leadTechName || 'Sin asignar'}
                            </p>
                            <p className="text-[9px] font-mono text-gray-400 mt-0.5">
                              ${ot.assignedFunds?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wide",
                          statMeta.badge
                        )}>
                          <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", statMeta.dot, ot.status === 'IN_PROGRESS' && "animate-pulse")} />
                          {statMeta.label}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {ot.status === 'COMPLETED' && (
                            <button
                              onClick={() => ot.deliveryActUrl ? window.open(ot.deliveryActUrl, '_blank') : handleExportAER(ot)}
                              className="cursor-pointer flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg text-[9px] font-bold hover:bg-emerald-100 transition-colors duration-150"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {ot.deliveryActUrl ? 'Acta' : 'Generar'}
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/ots/${ot.id}`)}
                            aria-label="Ver detalle"
                            className="cursor-pointer h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(ot)}
                            disabled={ot.status === 'COMPLETED'}
                            aria-label="Editar"
                            className={cn("h-8 w-8 flex items-center justify-center rounded-lg transition-colors duration-150",
                              ot.status === 'COMPLETED'
                                ? "text-gray-200 cursor-not-allowed"
                                : "cursor-pointer text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            )}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setOtToDelete(ot); setIsDeleteModalOpen(true); }}
                            aria-label="Eliminar"
                            className="cursor-pointer h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Acordeón financiero ── */}
                    {isExpanded && (
                      <tr className="bg-blue-50/20 border-b border-gray-100">
                        <td colSpan={6} className="px-6 py-5">
                          {loadingFinancials[ot.id] ? (
                            <div className="flex items-center gap-3 py-4">
                              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                              <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Cargando estado financiero...</p>
                            </div>
                          ) : otFinancials[ot.id] ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Resumen financiero */}
                              <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                                <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                                  <DollarSign className="h-4 w-4 text-blue-400" />
                                  <p className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500">Estado Financiero</p>
                                </div>
                                <div className="space-y-2.5">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[9px] font-medium text-gray-400">Presupuesto</span>
                                    <span className="font-mono font-bold text-sm text-gray-800">${otFinancials[ot.id].assignedFunds.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[9px] font-medium text-gray-400">Gastado</span>
                                    <span className="font-mono font-bold text-sm text-red-500">−${otFinancials[ot.id].totalSpent.toLocaleString()}</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={cn("h-full rounded-full", otFinancials[ot.id].isOverLimit ? "bg-red-500" : "bg-emerald-500")}
                                      style={{ width: `${Math.min((otFinancials[ot.id].totalSpent / Math.max(otFinancials[ot.id].assignedFunds, 1)) * 100, 100)}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between items-baseline pt-1 border-t border-gray-50">
                                    <span className="text-[9px] font-bold text-gray-500">Balance</span>
                                    <span className={cn("font-mono font-black text-base", otFinancials[ot.id].balance < 0 ? "text-red-600" : "text-emerald-600")}>
                                      ${otFinancials[ot.id].balance.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                {otFinancials[ot.id].isOverLimit && (
                                  <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                                    <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                    <p className="text-[8px] font-mono font-bold text-red-600 uppercase">Excedente — requiere auditoría</p>
                                  </div>
                                )}
                              </div>

                              {/* Tabla de gastos */}
                              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/40">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="h-3.5 w-3.5 text-gray-400" />
                                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500">Desglose de Gastos</p>
                                  </div>
                                  <span className="text-[8px] font-mono font-bold text-gray-400 bg-white border border-gray-100 px-2 py-0.5 rounded-md">
                                    {otFinancials[ot.id].expenses.length} reg.
                                  </span>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto">
                                  {otFinancials[ot.id].expenses.length === 0 ? (
                                    <div className="py-8 text-center">
                                      <p className="text-[9px] font-mono text-gray-300 uppercase">Sin gastos registrados</p>
                                    </div>
                                  ) : (
                                    <table className="w-full">
                                      <thead className="sticky top-0 bg-white border-b border-gray-50">
                                        <tr>
                                          {['Fecha', 'Categoría', 'Concepto', 'Monto'].map((h, i) => (
                                            <th key={h} className={cn("px-4 py-2 text-[8px] font-mono font-bold uppercase tracking-widest text-gray-400", i === 3 && "text-right")}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50">
                                        {otFinancials[ot.id].expenses.map(expense => (
                                          <tr key={expense.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-4 py-2.5 font-mono text-[10px] text-gray-400 whitespace-nowrap">
                                              {new Date(expense.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                            </td>
                                            <td className="px-4 py-2.5">
                                              <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md uppercase">{expense.category}</span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                              <p className="text-[10px] font-medium text-gray-700 line-clamp-1">{expense.description || expense.concept}</p>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono font-bold text-[11px] text-gray-800">
                                              ${expense.amount?.toLocaleString()}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] font-mono font-bold text-red-400 uppercase py-4">Error al cargar datos financieros.</p>
                          )}

                          {/* ── Calificaciones de encuestas ── */}
                          {(() => {
                            const evals = ot.evaluations || [];
                            if (evals.length === 0) return null;
                            const TYPE_LABEL = {
                              CUSTOMER_TECH: 'Satisfacción · Técnico',
                              CUSTOMER_EXEC: 'Experiencia · Ejecutivo',
                              OPS_TECH: 'Eficiencia · Operativa',
                            };
                            const TYPE_COLOR = {
                              CUSTOMER_TECH: 'text-emerald-600 bg-emerald-50 border-emerald-100',
                              CUSTOMER_EXEC: 'text-violet-600 bg-violet-50 border-violet-100',
                              OPS_TECH: 'text-amber-600 bg-amber-50 border-amber-100',
                            };
                            const Stars = ({ value, max = 5 }) => (
                              <div className="flex gap-0.5">
                                {Array.from({ length: max }).map((_, i) => (
                                  <Star key={i} className={cn("h-3 w-3", i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                                ))}
                              </div>
                            );
                            return (
                              <div className="mt-4 bg-white rounded-xl border border-gray-100 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/40">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500">Calificaciones de Encuestas</p>
                                  </div>
                                  <span className="text-[8px] font-mono font-bold text-gray-400 bg-white border border-gray-100 px-2 py-0.5 rounded-md">
                                    {evals.length} resp.
                                  </span>
                                </div>
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {evals.map(ev => {
                                    const scores = [ev.score1, ev.score2, ev.score3].filter(s => s != null);
                                    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                                    return (
                                      <div key={ev.id} className="bg-gray-50 rounded-lg p-3.5 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className={cn("text-[8px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase", TYPE_COLOR[ev.type] || 'text-gray-500 bg-gray-100 border-gray-200')}>
                                            {TYPE_LABEL[ev.type] || ev.type}
                                          </span>
                                          <span className="text-[8px] font-mono text-gray-400">
                                            {new Date(ev.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                          </span>
                                        </div>
                                        {ev.target?.name && (
                                          <p className="text-[9px] font-medium text-gray-500">Técnico: <span className="font-bold text-gray-700">{ev.target.name}</span></p>
                                        )}
                                        <div className="space-y-1">
                                          {ev.score1 != null && (
                                            <div className="flex items-center justify-between">
                                              <span className="text-[8px] text-gray-400">P1</span>
                                              <Stars value={ev.score1} />
                                            </div>
                                          )}
                                          {ev.score2 != null && (
                                            <div className="flex items-center justify-between">
                                              <span className="text-[8px] text-gray-400">P2</span>
                                              <Stars value={ev.score2} />
                                            </div>
                                          )}
                                          {ev.score3 != null && (
                                            <div className="flex items-center justify-between">
                                              <span className="text-[8px] text-gray-400">P3</span>
                                              <Stars value={ev.score3} />
                                            </div>
                                          )}
                                        </div>
                                        {avg != null && (
                                          <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wide">Promedio</span>
                                            <div className="flex items-center gap-1">
                                              <Stars value={avg} />
                                              <span className="text-[9px] font-mono font-bold text-gray-700">{avg.toFixed(1)}</span>
                                            </div>
                                          </div>
                                        )}
                                        {ev.materialUsage && (
                                          <p className="text-[8px] text-gray-400">Material: <span className="font-bold text-gray-600">{ev.materialUsage}</span></p>
                                        )}
                                        {ev.improvements && (
                                          <div className="bg-blue-50 border border-blue-100 rounded-md px-2.5 py-2">
                                            <p className="text-[8px] font-bold text-blue-500 uppercase mb-0.5">Mejoras sugeridas</p>
                                            <p className="text-[9px] text-blue-700 leading-relaxed">{ev.improvements}</p>
                                          </div>
                                        )}
                                        {ev.comment && (
                                          <div className="bg-gray-100 rounded-md px-2.5 py-2">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Comentario</p>
                                            <p className="text-[9px] text-gray-600 leading-relaxed">{ev.comment}</p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {otTotal > OT_PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40">
            <p className="text-[10px] font-mono text-gray-400">
              Mostrando{' '}
              <span className="font-bold text-gray-600">
                {(otPage - 1) * OT_PAGE_SIZE + 1}–{Math.min(otPage * OT_PAGE_SIZE, otTotal)}
              </span>{' '}
              de <span className="font-bold text-gray-600">{otTotal}</span> OTs
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={otPage === 1}
                onClick={() => goToPage(otPage - 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-3 w-3" /> Anterior
              </button>
              {Array.from({ length: Math.ceil(otTotal / OT_PAGE_SIZE) }, (_, i) => i + 1)
                .filter(p => p === 1 || p === Math.ceil(otTotal / OT_PAGE_SIZE) || Math.abs(p - otPage) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} className="px-1 text-gray-300 text-[10px]">…</span>
                    : (
                      <button
                        key={p}
                        onClick={() => goToPage(p)}
                        className={cn(
                          "w-7 h-7 text-[10px] font-bold rounded-lg transition-all",
                          p === otPage
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-500 hover:bg-white hover:border border-gray-200"
                        )}
                      >
                        {p}
                      </button>
                    )
                )
              }
              <button
                disabled={otPage >= Math.ceil(otTotal / OT_PAGE_SIZE)}
                onClick={() => goToPage(otPage + 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Siguiente <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════ MODAL NUEVA OT — SPLIT PANEL ══════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full flex overflow-hidden" style={{ maxWidth: 960, maxHeight: '92vh' }}>

            {/* ── SIDEBAR IZQUIERDO ── */}
            <div className="w-64 shrink-0 bg-gray-950 flex flex-col overflow-hidden hidden md:flex">
              {/* Branding */}
              <div className="p-7 border-b border-white/5">
                <p className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-gray-600 mb-3">Olea Controls · Ops</p>
                <h2 className="text-lg font-black text-white leading-tight">
                  {isEditMode ? 'Editar\nOrden' : 'Nueva\nOrden de\nTrabajo'}
                </h2>
                {isEditMode && (
                  <p className="text-[9px] font-mono text-gray-500 mt-2">{editingId}</p>
                )}
              </div>

              {/* Stepper vertical */}
              <div className="p-6 flex-1">
                <p className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-gray-300 mb-5">Progreso</p>
                <div className="space-y-1">
                  {[
                    { n: 1, label: 'Identificación', sub: 'Cliente, sitio, prioridad' },
                    { n: 2, label: 'Ubicación',      sub: 'Dirección y contacto' },
                    { n: 3, label: 'Equipo',         sub: 'Técnicos y programación' },
                  ].map(({ n, label, sub }) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFormStep(n)}
                      className="cursor-pointer w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors duration-150 hover:bg-white/5 group"
                    >
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 text-xs font-mono font-black",
                        formStep > n  ? "bg-emerald-500 text-white"
                        : formStep === n ? "bg-white text-gray-950"
                        : "bg-white/5 text-gray-600"
                      )}>
                        {formStep > n ? <Check className="h-3.5 w-3.5" /> : n}
                      </div>
                      <div>
                        <p className={cn("text-[11px] font-bold leading-none transition-colors",
                          formStep === n ? "text-white" : formStep > n ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-400"
                        )}>{label}</p>
                        <p className="text-[9px] text-gray-400 mt-1 font-mono leading-tight">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Línea de progreso */}
                <div className="mt-8">
                  <div className="flex justify-between mb-2">
                    <p className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Completado</p>
                    <p className="text-[8px] font-mono text-gray-300">{Math.round(((formStep - 1) / 3) * 100)}%</p>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(((formStep - 1) / 3) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Preview card (live) */}
              {(newOT.title || newOT.client || newOT.storeName) && (
                <div className="p-4 mx-4 mb-4 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-2">Vista previa</p>
                  {newOT.title && <p className="text-[10px] font-bold text-white leading-tight line-clamp-2">{newOT.title}</p>}
                  {newOT.client && <p className="text-[9px] text-gray-500 mt-1 font-mono truncate">{newOT.client}</p>}
                  {newOT.priority && (
                    <span className={cn("inline-block mt-2 text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase",
                      newOT.priority === 'URGENT' ? 'bg-red-900/50 text-red-400'
                      : newOT.priority === 'HIGH' ? 'bg-orange-900/50 text-orange-400'
                      : newOT.priority === 'MEDIUM' ? 'bg-blue-900/50 text-blue-400'
                      : 'bg-gray-800 text-gray-500'
                    )}>
                      {newOT.priority === 'URGENT' ? 'Urgente' : newOT.priority === 'HIGH' ? 'Alta' : newOT.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                    </span>
                  )}
                </div>
              )}

              {/* Cerrar */}
              <div className="p-4 border-t border-white/5">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors text-[10px] font-mono font-bold uppercase tracking-widest"
                >
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
              </div>
            </div>

            {/* ── PANEL DERECHO (form + footer) ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

              {/* Header del panel */}
              <div className="shrink-0 px-8 pt-8 pb-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-gray-400 mb-1">
                      Paso {formStep} de 3
                    </p>
                    <h3 className="text-xl font-black text-gray-950 leading-none">
                      {formStep === 1 && 'Identificación del Servicio'}
                      {formStep === 2 && 'Ubicación y Contacto en Sitio'}
                      {formStep === 3 && 'Equipo, Programación y Fondos'}
                    </h3>
                  </div>
                  {/* Cerrar en mobile */}
                  <button
                    onClick={() => setIsModalOpen(false)}
                    aria-label="Cerrar"
                    className="cursor-pointer md:hidden h-9 w-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Contenido scrollable */}
              <div className="flex-1 overflow-y-auto">
                <form id="ot-form" onSubmit={handleFormSubmit}>

                  {/* ══ PASO 1 ══ */}
                  {formStep === 1 && (
                    <div className="px-8 py-7 space-y-6">

                      {/* Quick imports */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Autocompletado Clientes OT */}
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-400 block mb-2">Autocompletar Cliente OT</label>
                          <div className="relative">
                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none z-10" />
                            <input
                              type="text"
                              className="cursor-text w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-gray-400 focus:bg-white transition-colors"
                              placeholder="Buscar empresa o sitio..."
                              value={otClientSearch}
                              onChange={e => { setOtClientSearch(e.target.value); setShowOtClientDropdown(true); }}
                              onFocus={() => setShowOtClientDropdown(true)}
                              onBlur={() => setTimeout(() => setShowOtClientDropdown(false), 150)}
                            />
                            {showOtClientDropdown && filteredOtClientSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto">
                                {filteredOtClientSuggestions.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onMouseDown={() => handleOTClientSelect(c)}
                                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    <p className="text-xs font-bold text-gray-800 leading-none">{c.name}</p>
                                    {(c.storeNumber || c.storeName) && (
                                      <p className="text-[9px] font-mono text-gray-400 mt-0.5">
                                        {c.storeNumber && `#${c.storeNumber}`}{c.storeNumber && c.storeName && ' · '}{c.storeName}
                                      </p>
                                    )}
                                    {c.address && <p className="text-[9px] text-gray-300 truncate mt-0.5">{c.address}</p>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-400 block mb-2">Plantilla de Servicio</label>
                          <div className="relative">
                            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                            <select
                              className="cursor-pointer w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-gray-400 focus:bg-white transition-colors"
                              onChange={e => handleTemplateSelect(e.target.value)}
                            >
                              <option value="">Seleccionar tipo...</option>
                              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Separador */}
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[9px] font-mono text-gray-300 uppercase tracking-widest">datos de la orden</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>

                      {/* Título */}
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Título de la Orden *</label>
                        <input
                          required
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                          value={newOT.title}
                          onChange={e => setNewOT({ ...newOT, title: e.target.value })}
                          placeholder="Ej. Mantenimiento preventivo sistema eléctrico..."
                        />
                      </div>

                      {/* Sucursal + Cliente */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Clave de Sitio</label>
                          <input
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                            value={newOT.storeNumber}
                            onChange={e => setNewOT({ ...newOT, storeNumber: e.target.value })}
                            placeholder="152"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Nombre de Sitio</label>
                          <input
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                            value={newOT.storeName}
                            onChange={e => setNewOT({ ...newOT, storeName: e.target.value })}
                            placeholder="Coppel Insurgentes Norte"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Razón Social / Empresa</label>
                        <div className="relative">
                          <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                          <input
                            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                            value={newOT.client}
                            onChange={e => setNewOT({ ...newOT, client: e.target.value })}
                            placeholder="Coppel S.A. de C.V."
                          />
                        </div>
                      </div>

                      {/* Prioridad — tarjetas horizontales grandes */}
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-3">Prioridad</label>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { value: 'LOW',    label: 'Baja',    bar: 'bg-gray-400',    ring: 'ring-gray-900',   active: 'bg-gray-950 border-gray-950 text-white', idle: 'bg-white border-gray-200 text-gray-500 hover:border-gray-400' },
                            { value: 'MEDIUM', label: 'Media',   bar: 'bg-blue-500',    ring: 'ring-blue-500',   active: 'bg-blue-600 border-blue-600 text-white',  idle: 'bg-white border-gray-200 text-gray-600 hover:border-blue-300' },
                            { value: 'HIGH',   label: 'Alta',    bar: 'bg-orange-500',  ring: 'ring-orange-400', active: 'bg-orange-500 border-orange-500 text-white', idle: 'bg-white border-gray-200 text-gray-600 hover:border-orange-300' },
                            { value: 'URGENT', label: 'Urgente', bar: 'bg-red-500',     ring: 'ring-red-400',    active: 'bg-red-600 border-red-600 text-white',    idle: 'bg-white border-gray-200 text-gray-600 hover:border-red-300' },
                          ].map(p => {
                            const isActive = newOT.priority === p.value;
                            return (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() => setNewOT({ ...newOT, priority: p.value })}
                                className={cn(
                                  "cursor-pointer relative flex flex-col items-center justify-center py-4 rounded-xl border-2 text-xs font-bold transition-all duration-150",
                                  isActive ? p.active : p.idle
                                )}
                              >
                                <div className={cn("h-2 w-6 rounded-full mb-2.5", isActive ? 'bg-white/40' : p.bar)} />
                                {p.label}
                                {isActive && (
                                  <div className="absolute top-1.5 right-1.5">
                                    <Check className="h-3 w-3 text-white/70" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══ PASO 2 ══ */}
                  {formStep === 2 && (
                    <div className="px-8 py-7 space-y-6">

                      {/* Dirección */}
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Dirección Principal *</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                            <input
                              required
                              className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                              value={newOT.address}
                              onChange={e => setNewOT({ ...newOT, address: e.target.value })}
                              placeholder="Buscar o clic en el mapa..."
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleLocationSearch}
                            className="cursor-pointer shrink-0 h-11 px-4 bg-gray-950 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2 text-xs font-bold"
                          >
                            {searchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                            Buscar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Interior / Piso</label>
                          <input
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                            value={newOT.secondaryAddress}
                            onChange={e => setNewOT({ ...newOT, secondaryAddress: e.target.value })}
                            placeholder="Int. B, Piso 3..."
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Zona / Referencia</label>
                          <input
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                            value={newOT.otAddress}
                            onChange={e => setNewOT({ ...newOT, otAddress: e.target.value })}
                            placeholder="Frente al banco..."
                          />
                        </div>
                      </div>

                      {/* Mapa */}
                      <div>
                        <div className="rounded-xl overflow-hidden border border-gray-200 relative z-0" style={{ height: 220 }}>
                          <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[newOT.lat, newOT.lng]} icon={otIcon} />
                            <MapEvents onLocationSelect={async (latlng) => {
                              setNewOT(prev => ({ ...prev, lat: latlng.lat, lng: latlng.lng }));
                              try {
                                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`);
                                const data = await res.json();
                                if (data?.display_name) setNewOT(prev => ({ ...prev, address: data.display_name }));
                              } catch (err) { console.error(err); }
                            }} />
                            <ChangeView center={mapCenter} />
                          </MapContainer>
                        </div>
                        <p className="text-[9px] font-mono text-gray-400 mt-2 text-center">Haz clic en el mapa para ajustar la ubicación</p>
                      </div>

                      {/* Separador contacto */}
                      <div className="flex items-center gap-4 pt-1">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[9px] font-mono text-gray-300 uppercase tracking-widest">contacto en sitio</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Persona Responsable</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                            <input
                              className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                              value={newOT.contactName}
                              onChange={e => setNewOT({ ...newOT, contactName: e.target.value })}
                              placeholder="Nombre del encargado..."
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Email</label>
                          <input type="email"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                            value={newOT.contactEmail}
                            onChange={e => setNewOT({ ...newOT, contactEmail: e.target.value })}
                            placeholder="email@empresa.com"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Teléfono</label>
                          <input
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                            value={newOT.contactPhone}
                            onChange={e => setNewOT({ ...newOT, contactPhone: e.target.value })}
                            placeholder="55 0000 0000"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Referencia de Acceso</label>
                          <input
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                            value={newOT.otReference}
                            onChange={e => setNewOT({ ...newOT, otReference: e.target.value })}
                            placeholder="Acceso por puerta lateral, preguntar por Juan..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══ PASO 3 ══ */}
                  {formStep === 3 && (
                    <div className="px-8 py-7 space-y-6">

                      {/* Programación */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Fecha Programada</label>
                          <input type="date"
                            className="cursor-pointer w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all"
                            value={newOT.scheduledDate}
                            onChange={e => setNewOT({ ...newOT, scheduledDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Hora de Llegada</label>
                          <input type="time"
                            className="cursor-pointer w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all"
                            value={newOT.arrivalTime}
                            onChange={e => setNewOT({ ...newOT, arrivalTime: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Técnico líder */}
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Técnico Líder *</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                          <select
                            required
                            className="cursor-pointer w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all"
                            value={newOT.leadTechId}
                            onChange={e => setNewOT({
                              ...newOT,
                              leadTechId: e.target.value,
                              leadTechName: e.target.options[e.target.selectedIndex].text
                            })}
                          >
                            <option value="">Seleccionar técnico responsable...</option>
                            {availableTechs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Vehículo del técnico */}
                      <button
                        type="button"
                        onClick={() => setNewOT({ ...newOT, techHasVehicle: !newOT.techHasVehicle })}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                          newOT.techHasVehicle
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">🚗</span>
                          <div className="text-left">
                            <p className="text-xs font-black uppercase tracking-wider">
                              {newOT.techHasVehicle ? 'Técnico lleva vehículo' : 'Sin vehículo asignado'}
                            </p>
                            <p className="text-[10px] font-medium opacity-60 normal-case">
                              {newOT.techHasVehicle ? 'Se solicitará checklist de vehículo al técnico' : 'Solo se pedirá checklist de equipo personal'}
                            </p>
                          </div>
                        </div>
                        <div className={`h-6 w-10 rounded-full transition-colors relative shrink-0 ${newOT.techHasVehicle ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${newOT.techHasVehicle ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                      </button>

                      {/* Metas para el técnico */}
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">
                          Metas del técnico <span className="normal-case text-gray-300">(visible en asistencia técnica)</span>
                        </label>
                        <textarea
                          rows={3}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all resize-none placeholder:text-gray-300 leading-relaxed"
                          value={newOT.techMetas}
                          onChange={e => setNewOT({ ...newOT, techMetas: e.target.value })}
                          placeholder="Objetivos a cumplir, material requerido, verificaciones previas, condiciones especiales..."
                        />
                      </div>

                      {/* Equipo apoyo */}
                      {availableTechs.filter(t => t.id !== newOT.leadTechId).length > 0 && (
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-3">Equipo de Apoyo <span className="normal-case text-gray-300">(opcional)</span></label>
                          <div className="flex flex-wrap gap-2">
                            {availableTechs.filter(t => t.id !== newOT.leadTechId).map(tech => {
                              const isSelected = newOT.assistantTechs?.some(t => t.id === tech.id);
                              return (
                                <button
                                  key={tech.id}
                                  type="button"
                                  onClick={() => toggleAssistantTech(tech)}
                                  className={cn(
                                    "cursor-pointer flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-150",
                                    isSelected
                                      ? "bg-gray-950 border-gray-950 text-white shadow-sm"
                                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                                  )}
                                >
                                  <div className={cn(
                                    "h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-mono font-black shrink-0",
                                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                                  )}>
                                    {tech.name.charAt(0).toUpperCase()}
                                  </div>
                                  {tech.name}
                                  {isSelected && <Check className="h-3 w-3 text-white/70" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Presupuesto */}
                      <div className="bg-gray-950 rounded-2xl p-6">
                        <div className="flex items-end justify-between gap-6">
                          <div>
                            <p className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">
                              {isEditMode ? 'Presupuesto Total' : 'Presupuesto Inicial'}
                            </p>
                            <p className="text-4xl font-black font-mono text-white tabular-nums">
                              ${(isEditMode
                                ? (parseFloat(newOT.assignedFunds || 0) + parseFloat(extraFunds || 0))
                                : parseFloat(newOT.assignedFunds || 0)
                              ).toLocaleString('es-MX')}
                            </p>
                            <p className="text-[9px] font-mono text-gray-600 mt-1">MXN</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-600 block mb-2">
                              {isEditMode ? 'Agregar Fondos' : 'Monto'}
                            </label>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-500 font-mono font-bold text-sm">$</span>
                              <input
                                type="number"
                                className="w-32 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono font-bold text-sm outline-none focus:border-white/30 text-right"
                                value={isEditMode ? extraFunds : newOT.assignedFunds}
                                onChange={e => isEditMode
                                  ? setExtraFunds(e.target.value)
                                  : setNewOT({ ...newOT, assignedFunds: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Instrucciones */}
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Instrucciones Técnicas</label>
                        <textarea
                          rows={4}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all resize-none placeholder:text-gray-300 leading-relaxed"
                          value={newOT.workDescription}
                          onChange={e => setNewOT({ ...newOT, workDescription: e.target.value })}
                          placeholder="Describe el trabajo técnico a realizar, materiales necesarios, condiciones especiales de acceso o seguridad..."
                        />
                      </div>
                    </div>
                  )}

                </form>
              </div>

              {/* ── Footer ── */}
              <div className="shrink-0 px-8 py-5 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={formStep > 1 ? () => setFormStep(s => s - 1) : () => setIsModalOpen(false)}
                  className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {formStep > 1 ? 'Anterior' : 'Cancelar'}
                </button>

                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map(n => (
                    <div key={n} className={cn("h-1.5 rounded-full transition-all duration-300", formStep === n ? "w-6 bg-gray-950" : formStep > n ? "w-1.5 bg-emerald-500" : "w-1.5 bg-gray-200")} />
                  ))}
                </div>

                {formStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(s => s + 1)}
                    className="cursor-pointer flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gray-950 text-white text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm"
                  >
                    Siguiente <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="ot-form"
                    disabled={isSaving}
                    className="cursor-pointer flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gray-950 text-white text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-40"
                  >
                    {isSaving
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando...</>
                      : isEditMode ? 'Guardar Cambios' : 'Publicar Orden'
                    }
                  </button>
                )}
              </div>
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