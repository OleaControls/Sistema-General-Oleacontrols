import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, FileText, User, Mail, MapPin, CheckCircle2, 
  Camera, Trash2, Plus, Send, X, Signature as SignatureIcon,
  ShieldCheck, Smartphone, Info, Download, Loader2, Store, Phone, Hash
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { otService } from '@/api/otService';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SYSTEM_TYPES = [
    { id: 'SDI', label: 'SDI: Sistema De Incendio' },
    { id: 'SCA', label: 'SCA: Control de Acceso' },
    { id: 'CCTV', label: 'CCTV: Circuito Cerrado TV' },
    { id: 'SSA', label: 'SSA: Sonido Ambiental' },
    { id: 'RMC', label: 'RMC: Aire Acondicionado' },
    { id: 'MDE', label: 'MDE: Muro de Electrónica' }
];

export default function DeliveryAct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ot, setOt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const tscSigPad = useRef(null);
  const clientSigPad = useRef(null);

  const [formData, setFormData] = useState({
    systemType: '',
    deliveryDetails: '',
    pendingTasks: [{ id: Date.now(), description: '' }],
    clientName: '',
    clientLastName: '',
    clientEmail: '',
    photos: []
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await otService.getOTDetail(id);
        setOt(data);
        if (data) {
            setFormData(prev => ({
                ...prev,
                clientName: data.contactName?.split(' ')[0] || '',
                clientLastName: data.contactName?.split(' ').slice(1).join(' ') || '',
                clientEmail: data.contactEmail || ''
            }));
        }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddPending = () => {
    setFormData({ ...formData, pendingTasks: [...formData.pendingTasks, { id: Date.now(), description: '' }] });
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setFormData(prev => ({ ...prev, photos: [...prev.photos, reader.result] }));
        };
    });
  };

  const generatePDF = async (data) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper para cargar base64 desde archivos en public
    const loadBase64 = async (url) => {
      try {
        const res = await fetch(url);
        const text = await res.text();
        return `data:image/png;base64,${text.trim()}`;
      } catch (err) {
        console.error("Error cargando logo:", url, err);
        return null;
      }
    };

    const insigniaB64 = await loadBase64('/img/base64 logo.txt');
    const logoB64 = await loadBase64('/img/oleacontrols.txt');

    // 1. Encabezado con Estilo Corporativo (Azul Navy/Royal)
    doc.setFillColor(30, 58, 138); // Azul corporativo elegante
    doc.rect(0, 0, pageWidth, 50, 'F');

    if (insigniaB64) doc.addImage(insigniaB64, 'PNG', 15, 10, 30, 30);
    if (logoB64) doc.addImage(logoB64, 'PNG', pageWidth - 75, 18, 60, 15);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ACTA DE ENTREGA / RECEPCIÓN", pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`FOLIO OFICIAL: ${ot.otNumber}`, pageWidth / 2, 35, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    // 2. Información General (Tabla)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS GENERALES DEL SERVICIO", 15, 60);

    autoTable(doc, {
        startY: 65,
        head: [['FECHA CIERRE', 'FOLIO OT', 'CLIENTE', 'SUCURSAL']],
        body: [[
            new Date().toLocaleString('es-MX'),
            ot.otNumber,
            (ot.clientName || ot.client || 'N/A').toUpperCase(),
            (ot.storeName || 'OFICINA CENTRAL').toUpperCase()
        ]],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4 }
    });

    // 3. Detalles del Sistema y Ubicación
    const currentY = doc.lastAutoTable.finalY + 15;
    doc.setFont("helvetica", "bold");
    doc.text("ALCANCE TÉCNICO Y UBICACIÓN", 15, currentY);

    autoTable(doc, {
        startY: currentY + 5,
        body: [
            ['SISTEMA:', (formData.systemType || 'N/A').toUpperCase()],
            ['DIRECCIÓN:', ot.address || 'N/A'],
            ['CONTACTO CLIENTE:', `${formData.clientName} ${formData.clientLastName}`.toUpperCase()],
            ['CORREO CLIENTE:', formData.clientEmail || 'N/A']
        ],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    // 4. Reporte Detallado
    const descY = doc.lastAutoTable.finalY + 15;
    doc.setFont("helvetica", "bold");
    doc.text("DETALLES DE ENTREGA / RECEPCIÓN", 15, descY);

    doc.setFillColor(248, 250, 252);
    doc.rect(15, descY + 5, pageWidth - 30, 40, 'F');
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitDetails = doc.splitTextToSize(formData.deliveryDetails || "Sin detalles adicionales.", pageWidth - 40);
    doc.text(splitDetails, 20, descY + 15);

    // 5. Tabla de Pendientes
    const pendingY = descY + 55;
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES / PENDIENTES EN SITIO", 15, pendingY);

    // Corregido: Usar formData si data no tiene pendingTasks (caso de generación inmediata)
    const tasksToPrint = (data.pendingTasks || formData.pendingTasks || [])
        .filter(p => p.description && p.description.trim() !== '');

    autoTable(doc, {
        startY: pendingY + 5,
        head: [['#', 'DESCRIPCIÓN DEL PENDIENTE / OBSERVACIÓN']],
        body: tasksToPrint.length > 0 
            ? tasksToPrint.map((p, i) => [i + 1, p.description.toUpperCase()])
            : [['-', 'SIN PENDIENTES REGISTRADOS']],
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105] },
        styles: { fontSize: 8 }
    });

    // 6. Firmas
    let sigY = doc.lastAutoTable.finalY + 40;
    if (sigY > pageHeight - 100) { doc.addPage(); sigY = 50; }

    // Obtener imágenes de firma (priorizar canvas actual, sino usar data de la DB)
    const tscSignature = !tscSigPad.current?.isEmpty() ? tscSigPad.current.toDataURL() : ot.signature;
    const clientSignature = !clientSigPad.current?.isEmpty() ? clientSigPad.current.toDataURL() : ot.clientSignature;

    if (tscSignature) {
        try {
            doc.addImage(tscSignature, 'PNG', 30, sigY - 30, 50, 25);
        } catch (e) { console.error("Error firma TSC", e); }
    }
    if (clientSignature) {
        try {
            doc.addImage(clientSignature, 'PNG', pageWidth - 80, sigY - 30, 50, 25);
        } catch (e) { console.error("Error firma Cliente", e); }
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(20, sigY, 90, sigY);
    doc.line(pageWidth - 90, sigY, pageWidth - 20, sigY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`TSC: ${ot.leadTechName || user.name}`.toUpperCase(), 55, sigY + 10, { align: 'center' });
    doc.text(`CLIENTE: ${formData.clientName} ${formData.clientLastName}`.toUpperCase(), pageWidth - 55, sigY + 10, { align: 'center' });

    // 7. Anexo Fotográfico
    if (formData.photos.length > 0) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text("EVIDENCIA FOTOGRÁFICA", pageWidth / 2, 20, { align: 'center' });
        
        let photoY = 40;
        formData.photos.forEach((photo, index) => {
            if (photoY > pageHeight - 80) { doc.addPage(); photoY = 20; }
            doc.addImage(photo, 'JPEG', 30, photoY, 150, 100);
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(7);
            doc.text(`EVIDENCIA #${index + 1} - OT: ${ot.otNumber}`, pageWidth / 2, photoY + 105, { align: 'center' });
            photoY += 120;
        });
    }

    doc.save(`AER_${ot.otNumber}.pdf`);
  };

  const handleFinish = async () => {
    if (tscSigPad.current.isEmpty() || clientSigPad.current.isEmpty()) {
        alert("Ambas firmas son obligatorias.");
        return;
    }
    setIsSaving(true);
    try {
        const updateData = {
            status: 'COMPLETED',
            systemType: formData.systemType,
            deliveryDetails: formData.deliveryDetails,
            pendingTasks: formData.pendingTasks,
            signature: tscSigPad.current.toDataURL(),
            clientSignature: clientSigPad.current.toDataURL(),
            photos: formData.photos,
            finishedAt: new Date().toISOString()
        };
        await otService.updateOT(ot.id, updateData);
        generatePDF(updateData);
        navigate(`/ots/${ot.id}`);
    } catch (err) {
        alert("Error: " + err.message);
    } finally { setIsSaving(false); }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse">CARGANDO ACTA...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <header className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
        <button onClick={() => navigate(-1)} className="p-3 hover:bg-gray-50 rounded-2xl transition-all border group">
          <ChevronLeft className="h-6 w-6 text-gray-400 group-hover:text-primary" />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">ACTA DE ENTREGA / RECEPCIÓN</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] mt-1">Folio: {ot.otNumber}</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden">
            <div className="p-10 space-y-12">
              
              {/* Contexto */}
              <div className="space-y-6">
                <SectionTitle title="1. Datos del Servicio" icon={Store} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                        <p className="text-sm font-black text-gray-800 uppercase">{ot.clientName || ot.client}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sistema</p>
                        <select 
                            className="w-full bg-transparent border-none outline-none font-black text-sm text-primary p-0"
                            value={formData.systemType}
                            onChange={e => setFormData({...formData, systemType: e.target.value})}
                        >
                            <option value="">Seleccionar...</option>
                            {SYSTEM_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    </div>
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-6">
                <SectionTitle title="2. Alcance de Entrega" icon={FileText} />
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción de lo Entregado/Recibido *</label>
                    <textarea 
                        rows="6"
                        className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] outline-none focus:bg-white focus:border-primary font-medium text-sm transition-all shadow-inner"
                        placeholder="Describe los trabajos realizados..."
                        value={formData.deliveryDetails}
                        onChange={e => setFormData({...formData, deliveryDetails: e.target.value})}
                    />
                </div>

                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between px-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observaciones / Pendientes</label>
                        <button onClick={handleAddPending} className="flex items-center gap-2 text-[10px] font-black text-primary uppercase bg-primary/5 px-4 py-2 rounded-xl hover:bg-primary hover:text-white transition-all">
                            <Plus className="h-4 w-4" /> Añadir Observación
                        </button>
                    </div>
                    <div className="space-y-3">
                        {formData.pendingTasks.map((task, idx) => (
                            <div key={task.id} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                                <div className="h-12 w-12 shrink-0 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-black text-sm">
                                    {idx + 1}
                                </div>
                                <input 
                                    className="flex-1 px-5 py-2 border rounded-2xl font-bold text-sm outline-none focus:border-primary shadow-sm"
                                    placeholder="Descripción del pendiente..."
                                    value={task.description}
                                    onChange={e => {
                                        const newTasks = [...formData.pendingTasks];
                                        newTasks[idx].description = e.target.value;
                                        setFormData({...formData, pendingTasks: newTasks});
                                    }}
                                />
                                <button onClick={() => setFormData({...formData, pendingTasks: formData.pendingTasks.filter(p => p.id !== task.id)})} className="p-3 text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
              </div>

              {/* Firmas */}
              <div className="space-y-8">
                <SectionTitle title="3. Firmas de Conformidad" icon={SignatureIcon} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Técnico Responsable (TSC)</p>
                        <div className="border-2 border-gray-100 rounded-[2rem] bg-gray-50/50 overflow-hidden shadow-inner">
                            <SignatureCanvas ref={tscSigPad} penColor="black" canvasProps={{ className: "w-full h-48 cursor-crosshair" }} />
                        </div>
                        <div className="flex justify-between items-center px-4">
                            <p className="text-[10px] font-black text-primary uppercase">{user.name}</p>
                            <button onClick={() => tscSigPad.current.clear()} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Borrar</button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Firma del Cliente</p>
                        <div className="border-2 border-gray-100 rounded-[2rem] bg-gray-50/50 overflow-hidden shadow-inner">
                            <SignatureCanvas ref={clientSigPad} penColor="navy" canvasProps={{ className: "w-full h-48 cursor-crosshair" }} />
                        </div>
                        <div className="space-y-2 mt-4 px-2">
                            <div className="grid grid-cols-2 gap-2">
                                <input className="px-4 py-2 bg-gray-50 border rounded-xl text-xs font-bold" placeholder="Nombre" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} />
                                <input className="px-4 py-2 bg-gray-50 border rounded-xl text-xs font-bold" placeholder="Apellido" value={formData.clientLastName} onChange={e => setFormData({...formData, clientLastName: e.target.value})} />
                            </div>
                            <input className="w-full px-4 py-2 bg-gray-50 border rounded-xl text-xs font-bold" placeholder="Email para envío de acta" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} />
                        </div>
                        <div className="flex justify-end px-4">
                            <button onClick={() => clientSigPad.current.clear()} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Borrar</button>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Fotos y Acción */}
        <div className="space-y-8">
            <div className="bg-white rounded-[3rem] border p-8 shadow-xl space-y-6">
                <SectionTitle title="Evidencia" icon={Camera} />
                <div className="grid grid-cols-2 gap-3">
                    {formData.photos.map((photo, i) => (
                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border group shadow-sm">
                            <img src={photo} className="w-full h-full object-cover" />
                            <button onClick={() => setFormData({...formData, photos: formData.photos.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary transition-all text-gray-400 hover:text-primary">
                        <Plus className="h-8 w-8 mb-1" />
                        <span className="text-[9px] font-black uppercase">Subir Foto</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                    </label>
                </div>
            </div>

            <div className="bg-gray-900 rounded-[3rem] p-10 text-center space-y-6 shadow-2xl">
                <ShieldCheck className="h-16 w-16 text-primary mx-auto opacity-50" />
                <div className="space-y-2">
                    <h4 className="text-white font-black text-lg uppercase tracking-tighter">Finalizar Servicio</h4>
                    <p className="text-gray-400 text-xs font-medium">Al procesar, se guardará el historial y se enviará el PDF al cliente.</p>
                </div>
                <button 
                    onClick={handleFinish}
                    disabled={isSaving}
                    className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    Cerrar Acta
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, icon: Icon }) {
    return (
        <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">{title}</h3>
        </div>
    );
}
