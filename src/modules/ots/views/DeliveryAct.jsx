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
    photos: [],
    // Eliminamos tscSignature y clientSignature del state para evitar re-renders innecesarios
  });

  // Quitamos el useEffect que restauraba firmas ya que causaba conflictos al scroll/resize en móviles

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
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

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

  // --- 1. ENCABEZADO MINIMALISTA Y ELEGANTE ---
  doc.setFillColor(15, 23, 42); // Navy Dark
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Logos más pequeños y balanceados
  if (insigniaB64) doc.addImage(insigniaB64, 'PNG', margin, 8, 24, 24);
  if (logoB64) doc.addImage(logoB64, 'PNG', pageWidth - margin - 45, 12, 45, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ACTA DE ENTREGA / RECEPCIÓN", pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`COMPROBANTE OFICIAL DE SERVICIO TÉCNICO`, pageWidth / 2, 28, { align: 'center' });

  // --- 2. INFORMACIÓN DE CONTROL (Cinta Gris) ---
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 40, pageWidth, 12, 'F');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`FOLIO: ${ot.otNumber}`, margin, 48);
  doc.text(`FECHA: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}`, pageWidth - margin, 48, { align: 'right' });

  // --- 3. DATOS DEL CLIENTE Y UBICACIÓN ---
  let currentY = 60;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text("INFORMACIÓN DEL CLIENTE Y SITIO", margin, currentY);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY + 2, margin + 60, currentY + 2);

  autoTable(doc, {
      startY: currentY + 6,
      margin: { left: margin, right: margin },
      body: [
          ['CLIENTE:', (ot.clientName || ot.client || 'N/A').toUpperCase(), 'SUCURSAL:', (ot.storeName || 'N/A').toUpperCase()],
          ['DIRECCIÓN:', (ot.address || ot.otAddress || 'N/A').toUpperCase(), 'NÚM. TIENDA:', (ot.storeNumber || 'N/A')],
          ['CONTACTO:', `${data.clientName || formData.clientName} ${data.clientLastName || formData.clientLastName}`.toUpperCase(), 'EMAIL:', (data.clientEmail || formData.clientEmail || 'N/A').toLowerCase()]
      ],
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 2, textColor: [51, 65, 85] },
      columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 25 },
          2: { fontStyle: 'bold', cellWidth: 25 }
      }
  });

  // --- 4. DETALLES TÉCNICOS ---
  currentY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(10);
  doc.text("ALCANCE DEL SERVICIO", margin, currentY);
  doc.line(margin, currentY + 2, margin + 40, currentY + 2);

  autoTable(doc, {
      startY: currentY + 6,
      margin: { left: margin, right: margin },
      body: [
          ['SISTEMA ATENDIDO:', (data.systemType || formData.systemType || 'N/A').toUpperCase()],
          ['DESCRIPCIÓN ORIGINAL:', (ot.description || 'N/A').toUpperCase()],
          ['PRIORIDAD:', (ot.priority || 'NORMAL').toUpperCase()]
      ],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, fillColor: [248, 250, 252] } }
  });

  // --- 5. REPORTE DE ACTIVIDADES ---
  currentY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(10);
  doc.text("REPORTE DE TRABAJOS REALIZADOS", margin, currentY);
  doc.line(margin, currentY + 2, margin + 60, currentY + 2);

  const splitDetails = doc.splitTextToSize(data.deliveryDetails || formData.deliveryDetails || "Sin detalles adicionales.", contentWidth - 10);
  const detailsHeight = (splitDetails.length * 4) + 10;

  doc.setFillColor(254, 254, 254);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY + 6, contentWidth, Math.max(25, detailsHeight));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(splitDetails, margin + 5, currentY + 14);

  // --- 6. OBSERVACIONES Y PENDIENTES ---
  currentY += Math.max(25, detailsHeight) + 15;
  const tasksToPrint = (data.pendingTasks || formData.pendingTasks || [])
      .filter(p => p.description && p.description.trim() !== '');

  if (tasksToPrint.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PENDIENTES / OBSERVACIONES EN SITIO", margin, currentY);

      autoTable(doc, {
          startY: currentY + 5,
          margin: { left: margin, right: margin },
          head: [['ID', 'DESCRIPCIÓN DEL PENDIENTE']],
          body: tasksToPrint.map((p, i) => [i + 1, p.description.toUpperCase()]),
          theme: 'striped',
          headStyles: { fillColor: [71, 85, 105], fontSize: 7 },
          styles: { fontSize: 7, cellPadding: 2 }
      });
      currentY = doc.lastAutoTable.finalY + 20;
  } else {
      currentY += 10;
  }

  // --- 7. FIRMAS (Control de salto de página) ---
  if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 40;
  }

  const tscSignature = data.tscSignature || ot.signature;
  const clientSignature = data.clientSignature || ot.clientSignature;

  // Líneas de firma
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 10, currentY + 25, margin + 70, currentY + 25);
  doc.line(pageWidth - margin - 70, currentY + 25, pageWidth - margin - 10, currentY + 25);

  // Imágenes de firma
  if (tscSignature) {
      try { doc.addImage(tscSignature, 'PNG', margin + 20, currentY, 40, 20); } catch (e) {}
  }
  if (clientSignature) {
      try { doc.addImage(clientSignature, 'PNG', pageWidth - margin - 60, currentY, 40, 20); } catch (e) {}
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("FIRMA TÉCNICO RESPONSABLE", margin + 40, currentY + 30, { align: 'center' });
  doc.text("FIRMA DE CONFORMIDAD CLIENTE", pageWidth - margin - 40, currentY + 30, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text((ot.leadTechName || user.name || 'N/A').toUpperCase(), margin + 40, currentY + 34, { align: 'center' });
  doc.text(`${data.clientName || formData.clientName} ${data.clientLastName || formData.clientLastName}`.toUpperCase(), pageWidth - margin - 40, currentY + 34, { align: 'center' });

  // Pie de página en todas las páginas (excepto anexos)
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text("Este documento es un comprobante digital de servicio generado por Olea Controls Platform. Prohibida su reproducción total o parcial sin autorización.", pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // --- 8. ANEXO FOTOGRÁFICO ---
  const photosToPrint = data.photos || formData.photos || [];
  if (photosToPrint.length > 0) {
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text("ANEXO: EVIDENCIA FOTOGRÁFICA", pageWidth / 2, 16, { align: 'center' });

      let photoY = 35;
      const photoWidth = 80;
      const photoHeight = 60;

      photosToPrint.forEach((photo, index) => {
          const isLeft = index % 2 === 0;
          const xPos = isLeft ? margin : pageWidth - margin - photoWidth;

          if (!isLeft && index > 0) {
              // Ya procesamos la de la derecha, bajamos Y para la siguiente fila
          } else if (index > 0 && isLeft) {
              photoY += photoHeight + 15;
          }

          if (photoY > pageHeight - photoHeight - 20) {
              doc.addPage();
              photoY = 20;
          }

          try {
              // Determinar el formato de la imagen desde el dataURI
              const format = photo.includes('png') ? 'PNG' : 'JPEG';
              doc.addImage(photo, format, xPos, photoY, photoWidth, photoHeight);
              doc.setTextColor(100, 116, 139);
              doc.setFontSize(6);
              doc.text(`EVIDENCIA #${index + 1} - OT: ${ot.otNumber}`, xPos + (photoWidth/2), photoY + photoHeight + 5, { align: 'center' });
          } catch (e) {
              console.error("Error al añadir foto al PDF", e);
          }

          if (!isLeft) photoY += photoHeight + 15;
      });
  }

  // Descargar el archivo localmente para el técnico
  try { doc.save(`AER_${ot.otNumber}.pdf`); } catch (e) { console.error("Error al descargar PDF local:", e); }

  // Devolver como base64 para subir a R2
  return doc.output('datauristring'); 
  };

  const handleFinish = async () => {
  if (tscSigPad.current.isEmpty() || clientSigPad.current.isEmpty()) {
      alert("Ambas firmas son obligatorias.");
      return;
  }
  setIsSaving(true);
  try {
      // 1. Obtener firmas actuales
      const tscSigBase64 = tscSigPad.current.toDataURL();
      const clientSigBase64 = clientSigPad.current.toDataURL();

      // 2. Subir firmas y fotos por separado para evitar Payload Too Large
      const [tscSigUrl, clientSigUrl] = await Promise.all([
          otService.uploadFile(tscSigBase64, 'signatures'),
          otService.uploadFile(clientSigBase64, 'signatures')
      ]);

      const photoUrls = await Promise.all(
          formData.photos.map(p => p.startsWith('data:') ? otService.uploadFile(p, 'evidences') : Promise.resolve(p))
      );

      // 3. Generar PDF con los datos actuales (usando URLs de las imágenes subidas o base64 para el PDF)
      const pdfBase64 = await generatePDF({
          ...formData,
          tscSignature: tscSigBase64,
          clientSignature: clientSigBase64,
          photos: formData.photos // El generador de PDF usa los base64 locales para mayor velocidad
      });

      // 4. Subir el PDF
      const pdfUrl = await otService.uploadFile(pdfBase64, 'delivery-acts');

      const updateData = {
          status: 'COMPLETED',
          systemType: formData.systemType,
          deliveryDetails: formData.deliveryDetails,
          pendingTasks: formData.pendingTasks,
          signature: tscSigUrl,
          clientSignature: clientSigUrl,
          deliveryActUrl: pdfUrl, 
          photos: photoUrls,
          finishedAt: new Date().toISOString()
      };

      // 5. Actualizar en el servidor con las URLs ya procesadas
      await otService.updateOT(ot.id, updateData);

      navigate('/ots');
  } catch (err) {
      console.error("Error crítico al finalizar acta:", err);
      alert("Error al finalizar el acta: " + err.message);
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
                            <button onClick={() => { tscSigPad.current.clear() }} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Borrar</button>
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
                            <button onClick={() => { clientSigPad.current.clear() }} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Borrar</button>
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
