import React, { useState, useEffect } from 'react';
import {
  Award, Briefcase, Calendar, FileText, Download, User,
  FileSignature, Palmtree, HardHat, Mail, MapPin, Phone,
  Clock, CheckCircle2, AlertTriangle, Sparkles,
  Star, TrendingUp, Users, DollarSign, Shield, X,
  ChevronRight, Building2, BadgeCheck, Zap, Plus, ClipboardList, ChevronDown, Trash2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';
import { hrService } from '@/api/hrService';
import { cn } from '@/lib/utils';

// ── Métricas individuales ─────────────────────────────────────────────────────
const MetricsSection = ({ targetId }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/evaluations?targetId=${targetId}&days=15`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setMetrics(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetId]);

  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
      {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
    </div>
  );

  if (!metrics?.current || metrics.current.total === 0) return (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-100">
      <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
        <Star className="h-5 w-5 text-amber-500" />
      </div>
      <div>
        <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Sin evaluaciones recientes</p>
        <p className="text-[10px] font-bold text-amber-600 mt-0.5">No hay datos suficientes en los últimos 15 días.</p>
      </div>
    </div>
  );

  const { current } = metrics;
  const avgTotal = current.totalAvg || 0;
  let projectedBonus = 0;
  if (avgTotal >= 4.8) projectedBonus = 1500;
  else if (avgTotal >= 4.5) projectedBonus = 1000;
  else if (avgTotal >= 4.0) projectedBonus = 500;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricTile label="Satisfacción" value={(current.avg1||0).toFixed(1)} icon={Star}
        hex="#f59e0b" lightBg="#fffbeb" suffix="/5" />
      <MetricTile label="Liderazgo" value={(current.avg2||0).toFixed(1)} icon={TrendingUp}
        hex="#3b82f6" lightBg="#eff6ff" suffix="/5" />
      <MetricTile label="Feedbacks" value={current.total||0} icon={Users}
        hex="#8b5cf6" lightBg="#f5f3ff" />
      <div style={{
        background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
        borderRadius: 16, padding: '16px 20px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-16, right:-16, width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.1)' }} />
        <DollarSign style={{ width:14, height:14, color:'rgba(255,255,255,0.7)', marginBottom:8 }} />
        <p style={{ fontSize:22, fontWeight:900, color:'#fff', lineHeight:1 }}>
          ${projectedBonus.toLocaleString()}
        </p>
        <p style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:6 }}>
          Bono proyectado
        </p>
      </div>
    </div>
  );
};

function MetricTile({ label, value, icon: Icon, hex, lightBg, suffix = '' }) {
  return (
    <div style={{ background: lightBg, borderRadius: 16, padding: '16px 20px' }}>
      <Icon style={{ width:14, height:14, color: hex, marginBottom:8 }} />
      <p style={{ fontSize:22, fontWeight:900, color:'#0f172a', lineHeight:1 }}>
        {value}{suffix && <span style={{ fontSize:13, fontWeight:700, color:'#94a3b8' }}>{suffix}</span>}
      </p>
      <p style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:6 }}>
        {label}
      </p>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const PROFILE_TABS = [
  { id: 'OVERVIEW',    label: 'Perfil',       icon: User },
  { id: 'TIMEOFF',     label: 'Tiempo libre', icon: Palmtree },
  { id: 'ASSETS',      label: 'Equipamiento', icon: HardHat },
  { id: 'DOCUMENTS',   label: 'Documentos',   icon: FileText },
  { id: 'REGLAMENTO',  label: 'Reglamento',   icon: Shield },
  { id: 'AUDITORIA',   label: 'Auditoría',    icon: ClipboardList },
];

const STATUS_STYLES = {
  PENDING:  { bg:'#fffbeb', text:'#d97706', label:'Pendiente' },
  APPROVED: { bg:'#ecfdf5', text:'#059669', label:'Aprobado'  },
  REJECTED: { bg:'#fff1f2', text:'#e11d48', label:'Rechazado' },
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function MyProfile() {
  const { user, updateUser } = useAuth();
  const [employee, setEmployee]           = useState(null);
  const [vacationInfo, setVacationInfo]   = useState(null);
  const [assets, setAssets]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState('OVERVIEW');
  const [isUploading, setIsUploading]               = useState(false);
  const [reglamento, setReglamento]                 = useState(null);
  const [loadingReglamento, setLoadingReglamento]   = useState(true);
  const [isUploadingReglamento, setIsUploadingReglamento] = useState(false);
  const [showRequestModal, setShowRequestModal]     = useState(false);

  // Auditoría
  const emptyItems = (n) => Array.from({ length: n }, () => ({ desc: '' }));
  const [audits, setAudits]             = useState([]);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [isSavingAudit, setIsSavingAudit] = useState(false);
  const [expandedAudit, setExpandedAudit] = useState(null);
  const [auditForm, setAuditForm] = useState({
    projectName: '', auditDate: '', isLeader: false, actionArea: '',
    didWell: emptyItems(3), didPoor: emptyItems(2), improvements: emptyItems(2),
  });
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [formData, setFormData] = useState({
    startDate: '', endDate: '', days: '', reason: '', type: 'ANNUAL',
  });

  useEffect(() => {
    (async () => {
      const allEmployees = await hrService.getEmployees();
      const emp = allEmployees.find(e => e.email === user.email || e.id === user.id);
      if (emp) {
        const [details, vInfo, assetList] = await Promise.all([
          hrService.getEmployeeDetail(emp.id),
          hrService.getVacationStatus(emp.id).catch(() => null),
          hrService.getAssets(emp.id).catch(() => []),
        ]);
        setEmployee(details);
        setVacationInfo(vInfo);
        setAssets(assetList);
      } else {
        setEmployee({ ...user });
      }
      setLoading(false);
    })();
  }, [user]);

  // Cargar reglamento y auditorías
  useEffect(() => {
    apiFetch('/api/config?key=REGLAMENTO')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.url) setReglamento(data); })
      .catch(() => {})
      .finally(() => setLoadingReglamento(false));
  }, []);

  useEffect(() => {
    if (!employee?.id) return;
    apiFetch(`/api/personal-audits?employeeId=${employee.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAudits(data))
      .catch(() => {})
      .finally(() => setLoadingAudits(false));
  }, [employee?.id]);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const diff = Math.ceil(Math.abs(new Date(formData.endDate) - new Date(formData.startDate)) / 86400000) + 1;
      if (!isNaN(diff) && diff > 0) setFormData(p => ({ ...p, days: diff.toString() }));
    }
  }, [formData.startDate, formData.endDate]);

  const handleVacationRequest = async (e) => {
    e.preventDefault();
    if (!employee?.id || isSubmitting) return;
    const requested = parseInt(formData.days);
    if (requested > (vacationInfo?.vacationBalance || 0)) {
      alert(`No puedes solicitar ${requested} días. Tu saldo es ${vacationInfo?.vacationBalance} días.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await hrService.requestVacation({ ...formData, employeeId: employee.id });
      setShowRequestModal(false);
      setFormData({ startDate:'', endDate:'', days:'', reason:'', type:'ANNUAL' });
      alert('Solicitud enviada exitosamente.');
      const vInfo = await hrService.getVacationStatus(employee.id);
      setVacationInfo(vInfo);
    } catch (err) {
      alert('Error al enviar: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canManageReglamento = user.role === ROLES.ADMIN || user.role === ROLES.HR;

  const handleReglamentoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('El archivo no debe superar 20 MB.'); return; }
    setIsUploadingReglamento(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        // Subir a R2
        const uploadRes = await apiFetch('/api/upload', {
          method: 'POST',
          body: JSON.stringify({ file: reader.result, folder: 'reglamento' }),
        });
        if (!uploadRes.ok) throw new Error('Error al subir el archivo');
        const { url } = await uploadRes.json();

        // Guardar URL en SystemConfig
        const meta = {
          url,
          name: file.name,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.name,
        };
        const configRes = await apiFetch('/api/config', {
          method: 'POST',
          body: JSON.stringify({ key: 'REGLAMENTO', value: meta }),
        });
        if (!configRes.ok) throw new Error('Error al guardar la configuración');

        setReglamento(meta);
        setIsUploadingReglamento(false);
      };
    } catch (err) {
      alert('Error: ' + err.message);
      setIsUploadingReglamento(false);
    }
  };

  const handleSaveAudit = async (e) => {
    e.preventDefault();
    if (isSavingAudit) return;
    setIsSavingAudit(true);
    try {
      const payload = {
        employeeId: employee.id,
        projectName: auditForm.projectName,
        auditDate: auditForm.auditDate,
        isLeader: auditForm.isLeader,
        actionArea: auditForm.actionArea,
        didWell:       auditForm.didWell.map(i => i.desc).filter(Boolean),
        didPoor:       auditForm.didPoor.map(i => i.desc).filter(Boolean),
        improvements:  auditForm.improvements.map(i => i.desc).filter(Boolean),
      };
      const res = await apiFetch('/api/personal-audits', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar');
      }
      const saved = await res.json();
      setAudits(prev => [saved, ...prev]);
      setShowAuditForm(false);
      setAuditForm({
        projectName: '', auditDate: '', isLeader: false, actionArea: '',
        didWell: emptyItems(3), didPoor: emptyItems(2), improvements: emptyItems(2),
      });
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsSavingAudit(false);
    }
  };

  const handleDeleteAudit = async (id) => {
    if (!confirm('¿Eliminar esta auditoría? Esta acción no se puede deshacer.')) return;
    setAudits(prev => prev.filter(a => a.id !== id));
    try {
      await apiFetch(`/api/personal-audits?id=${id}`, { method: 'DELETE' });
    } catch {
      const r = await apiFetch(`/api/personal-audits?employeeId=${employee.id}`);
      if (r.ok) setAudits(await r.json());
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Máximo 5 MB.'); return; }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const res = await apiFetch('/api/employees', {
          method: 'PUT',
          body: JSON.stringify({ id: employee.id, avatar: reader.result }),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setEmployee(p => ({ ...p, avatar: updated.avatar }));
        updateUser({ id: employee.id, avatar: updated.avatar });
        setIsUploading(false);
      };
    } catch {
      alert('No se pudo actualizar la foto.');
      setIsUploading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando perfil…</p>
    </div>
  );

  const isCollaborator = user.role === ROLES.COLLABORATOR;
  const roleLabel = {
    [ROLES.ADMIN]: 'Administrador', [ROLES.OPS]: 'Operaciones',
    [ROLES.TECH]: 'Técnico', [ROLES.HR]: 'Recursos Humanos',
    [ROLES.SALES]: 'Ventas', [ROLES.COLLABORATOR]: 'Colaborador',
  }[user.role] || user.role;

  const vacBalance  = vacationInfo?.vacationBalance ?? 0;
  const vacPending  = vacationInfo?.vacationRequests?.filter(r => r.status === 'PENDING').length ?? 0;
  const vacRenewal  = vacationInfo?.vacationLastRenewal
    ? new Date(vacationInfo.vacationLastRenewal).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
    : 'No registrada';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0c1a35 100%)',
        borderRadius: 28, overflow: 'hidden', position: 'relative',
      }}>
        {/* Orbes decorativos */}
        <div style={{ position:'absolute', top:-60, right:-40, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle, #3b82f630, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:'40%', width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, #8b5cf620, transparent 70%)', pointerEvents:'none' }} />

        <div className="relative p-8 flex flex-col sm:flex-row gap-7 items-center sm:items-end">
          {/* Avatar */}
          <div className="relative group cursor-pointer flex-shrink-0" onClick={() => document.getElementById('avatar-input').click()}>
            <div style={{
              width: 112, height: 112, borderRadius: 28,
              border: '3px solid rgba(255,255,255,0.15)',
              overflow: 'hidden', position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              <img
                src={employee.avatar}
                alt={employee.name}
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                className={isUploading ? 'opacity-40 blur-sm' : 'group-hover:scale-105 transition-transform duration-300'}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <User style={{ width:24, height:24, color:'#fff' }} />
              </div>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {/* Anillo pulsante */}
            <div style={{
              position:'absolute', inset:-5, borderRadius:34,
              border:'2px solid rgba(59,130,246,0.3)',
              animation:'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
              pointerEvents:'none',
            }} />
            <input id="avatar-input" type="file" accept="image/*" className="hidden"
              onChange={handleAvatarChange} disabled={isUploading} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div>
              <h1 style={{ fontSize:28, fontWeight:900, color:'#f8fafc', lineHeight:1.05, letterSpacing:'-0.02em' }}>
                {employee.name}
              </h1>
              <p style={{ fontSize:13, color:'#94a3b8', fontWeight:600, marginTop:6 }}>
                {employee.email}
              </p>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <span style={{
                fontSize:10, fontWeight:800, color:'#93c5fd',
                background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.25)',
                borderRadius:20, padding:'4px 12px', textTransform:'uppercase', letterSpacing:'0.06em',
              }}>{roleLabel}</span>
              {employee.department && (
                <span style={{
                  fontSize:10, fontWeight:800, color:'#a78bfa',
                  background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.25)',
                  borderRadius:20, padding:'4px 12px', textTransform:'uppercase', letterSpacing:'0.06em',
                }}>{employee.department}</span>
              )}
              <span style={{
                fontSize:10, fontWeight:800, color:'#6ee7b7',
                background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.25)',
                borderRadius:20, padding:'4px 12px', textTransform:'uppercase', letterSpacing:'0.06em',
              }}>
                <CheckCircle2 style={{ width:10, height:10, display:'inline', marginRight:4, verticalAlign:'middle' }} />
                Activo
              </span>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="flex gap-3 flex-shrink-0">
            {[
              { label:'Vacaciones', value: vacBalance, icon: Palmtree, color:'#34d399' },
              { label:'Activos', value: assets.length, icon: HardHat, color:'#60a5fa' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={{
                background:'rgba(255,255,255,0.06)', backdropFilter:'blur(12px)',
                border:'1px solid rgba(255,255,255,0.1)', borderRadius:18,
                padding:'14px 18px', textAlign:'center', minWidth:80,
              }}>
                <Icon style={{ width:16, height:16, color, margin:'0 auto 6px' }} />
                <p style={{ fontSize:22, fontWeight:900, color:'#f8fafc', lineHeight:1 }}>{value}</p>
                <p style={{ fontSize:9, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs integrados en el hero */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'0 28px', display:'flex', gap:4, overflowX:'auto' }}>
          {PROFILE_TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'14px 18px', fontSize:11, fontWeight:800,
                textTransform:'uppercase', letterSpacing:'0.06em',
                border:'none', borderBottom: active ? '2px solid #60a5fa' : '2px solid transparent',
                background:'none', cursor:'pointer', whiteSpace:'nowrap',
                color: active ? '#93c5fd' : '#475569',
                transition:'all 0.2s',
              }}>
                <tab.icon style={{ width:14, height:14 }} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENIDO DE TABS ────────────────────────────────────────────────── */}

      {/* ── OVERVIEW ── */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-3 duration-400">

          {/* Columna izquierda */}
          <div className="space-y-5">

            {/* Contacto */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 className="font-black text-gray-900 text-[11px] uppercase tracking-widest flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Phone className="h-3 w-3 text-blue-500" />
                </div>
                Información de Contacto
              </h3>
              <div className="space-y-4">
                {[
                  { label:'ID Empleado', value: employee.id || 'TEMP-USER', icon: BadgeCheck, color:'#6366f1' },
                  { label:'Email',       value: employee.email,              icon: Mail,       color:'#3b82f6' },
                  { label:'Teléfono',    value: employee.phone || '—',       icon: Phone,      color:'#0ea5e9' },
                  { label:'Ubicación',   value: employee.location || '—',    icon: MapPin,     color:'#14b8a6' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div style={{ width:34, height:34, borderRadius:10, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon style={{ width:14, height:14, color }} />
                    </div>
                    <div>
                      <p style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
                      <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginTop:1 }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desde */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="font-black text-gray-900 text-[11px] uppercase tracking-widest flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Calendar className="h-3 w-3 text-emerald-500" />
                </div>
                Antigüedad
              </h3>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  Fecha de Ingreso
                </p>
                <p style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginTop:4 }}>
                  {employee.joinDate || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  Expediente completo
                </span>
              </div>
            </div>

            {/* Insignias */}
            {!isCollaborator && employee.certifications?.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h3 className="font-black text-gray-900 text-[11px] uppercase tracking-widest flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Award className="h-3 w-3 text-amber-500" />
                  </div>
                  Mis Insignias
                </h3>
                <div className="flex flex-wrap gap-2">
                  {employee.certifications.map(c => (
                    <div key={c.id} title={c.name} style={{
                      width:44, height:44, borderRadius:14,
                      background:'#fffbeb', border:'1px solid #fef3c7',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Award style={{ width:20, height:20, color:'#f59e0b' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-5">

            {/* Bienvenida */}
            <div style={{
              background:'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)',
              border:'1px solid #e0e7ff', borderRadius:24, padding:'24px 28px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              overflow:'hidden', position:'relative',
            }}>
              <div style={{ position:'absolute', right:-20, top:-20, opacity:0.12, pointerEvents:'none' }}>
                <Sparkles style={{ width:96, height:96, color:'#6366f1' }} />
              </div>
              <div>
                <p style={{ fontSize:11, fontWeight:800, color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>
                  Bienvenido de vuelta
                </p>
                <h2 style={{ fontSize:24, fontWeight:900, color:'#1e1b4b', lineHeight:1.1, margin:0 }}>
                  Hola, {employee.name?.split(' ')[0]}
                </h2>
                <p style={{ fontSize:13, color:'#6366f1', fontWeight:600, marginTop:8, opacity:0.7 }}>
                  Aquí puedes gestionar todas tus solicitudes de Capital Humano.
                </p>
              </div>
              <div style={{ flexShrink:0 }}>
                <div style={{
                  background:'white', borderRadius:18, padding:'12px 20px',
                  border:'1px solid #e0e7ff', textAlign:'center',
                  boxShadow:'0 4px 20px rgba(99,102,241,0.1)',
                }}>
                  <p style={{ fontSize:28, fontWeight:900, color:'#4f46e5', lineHeight:1 }}>24h</p>
                  <p style={{ fontSize:9, fontWeight:800, color:'#a5b4fc', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>
                    Capacitación
                  </p>
                </div>
              </div>
            </div>

            {/* Métricas */}
            {(user.role === ROLES.TECH || user.role === ROLES.OPS || user.role === ROLES.SALES) && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h3 className="font-black text-gray-900 text-[11px] uppercase tracking-widest flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Zap className="h-3 w-3 text-violet-500" />
                  </div>
                  Mi Desempeño — Últimos 15 días
                </h3>
                <MetricsSection targetId={user.id} />
              </div>
            )}

            {/* Días de vacaciones */}
            <div className="grid grid-cols-2 gap-4">
              <div style={{
                background:'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                border:'1px solid #a7f3d0', borderRadius:20, padding:'20px 24px',
              }}>
                <Palmtree style={{ width:18, height:18, color:'#059669', marginBottom:8 }} />
                <p style={{ fontSize:32, fontWeight:900, color:'#064e3b', lineHeight:1 }}>{vacBalance}</p>
                <p style={{ fontSize:10, fontWeight:800, color:'#6ee7b7', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:6 }}>
                  Días disponibles
                </p>
                <div style={{ height:4, background:'rgba(0,0,0,0.1)', borderRadius:999, marginTop:12, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100,(vacBalance/20)*100)}%`, background:'#059669', borderRadius:999 }} />
                </div>
              </div>
              <div style={{
                background:'linear-gradient(135deg, #eff6ff, #dbeafe)',
                border:'1px solid #bfdbfe', borderRadius:20, padding:'20px 24px',
              }}>
                <Clock style={{ width:18, height:18, color:'#2563eb', marginBottom:8 }} />
                <p style={{ fontSize:32, fontWeight:900, color:'#1e3a8a', lineHeight:1 }}>{vacPending}</p>
                <p style={{ fontSize:10, fontWeight:800, color:'#93c5fd', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:6 }}>
                  Solicitudes pendientes
                </p>
                <button
                  onClick={() => setActiveTab('TIMEOFF')}
                  style={{
                    display:'flex', alignItems:'center', gap:4, marginTop:12,
                    fontSize:9, fontWeight:800, color:'#3b82f6',
                    textTransform:'uppercase', letterSpacing:'0.06em',
                    background:'none', border:'none', cursor:'pointer', padding:0,
                  }}
                >
                  Ver solicitudes <ChevronRight style={{ width:12, height:12 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VACACIONES ── */}
      {activeTab === 'TIMEOFF' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Tiempo Libre</h3>
              <p className="text-sm font-medium text-gray-400 mt-1">Consulta saldos y gestiona solicitudes de vacaciones y permisos.</p>
            </div>
            <button
              onClick={() => setShowRequestModal(true)}
              style={{
                display:'flex', alignItems:'center', gap:8,
                background:'linear-gradient(135deg, #0f172a, #1e293b)',
                color:'#fff', border:'none', cursor:'pointer',
                padding:'12px 24px', borderRadius:16,
                fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em',
                boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
              }}
            >
              <Palmtree style={{ width:14, height:14 }} />
              Nueva Solicitud
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label:'Días disponibles', value: vacBalance,    color:'#059669', bg:'#ecfdf5', border:'#a7f3d0', icon: Palmtree },
              { label:'Solicitudes en proceso', value: vacPending, color:'#d97706', bg:'#fffbeb', border:'#fde68a', icon: Clock },
              { label:'Última renovación', value: vacRenewal,  color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', icon: Calendar, small: true },
            ].map(({ label, value, color, bg, border, icon: Icon, small }) => (
              <div key={label} style={{ background: bg, border:`1px solid ${border}`, borderRadius:20, padding:'20px 24px' }}>
                <Icon style={{ width:16, height:16, color, marginBottom:10 }} />
                <p style={{ fontSize: small ? 16 : 32, fontWeight:900, color:'#0f172a', lineHeight:1 }}>{value}</p>
                <p style={{ fontSize:9, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:6, opacity:0.8 }}>
                  {label}
                </p>
                {!small && (
                  <div style={{ height:4, background:'rgba(0,0,0,0.08)', borderRadius:999, marginTop:12, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100,(vacBalance/20)*100)}%`, background:color, borderRadius:999 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Historial */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Mis Solicitudes</h4>
            {vacationInfo?.vacationRequests?.length > 0 ? (
              <div className="space-y-3">
                {vacationInfo.vacationRequests.map((req, i) => {
                  const s = STATUS_STYLES[req.status] || STATUS_STYLES.PENDING;
                  return (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'14px 18px', background:'#f8fafc',
                      border:'1px solid #f1f5f9', borderRadius:16,
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                        <div style={{
                          width:40, height:40, borderRadius:12,
                          background: s.bg, display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <Palmtree style={{ width:18, height:18, color: s.text }} />
                        </div>
                        <div>
                          <p style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>
                            {req.type === 'ANNUAL' ? 'Vacaciones' : req.type === 'PERSONAL' ? 'Permiso Personal' : 'Incapacidad'}
                            {' '}· {req.days} días
                          </p>
                          <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.04em', marginTop:2 }}>
                            {new Date(req.startDate).toLocaleDateString('es-MX')} → {new Date(req.endDate).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        fontSize:9, fontWeight:800, color: s.text,
                        background: s.bg, border:`1px solid ${s.text}30`,
                        borderRadius:20, padding:'4px 12px', textTransform:'uppercase', letterSpacing:'0.06em',
                      }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8' }}>
                <Palmtree style={{ width:32, height:32, margin:'0 auto 12px', opacity:0.3 }} />
                <p style={{ fontSize:12, fontWeight:700 }}>Sin solicitudes registradas</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DOCUMENTOS ── */}
      {activeTab === 'DOCUMENTS' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Expediente Digital</h3>
            <p className="text-sm font-medium text-gray-400 mt-1">Consulta y descarga tus documentos oficiales.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name:'Contrato Laboral 2024',            type:'PDF',     status:'OK' },
              { name:'Recibo Nómina (Q1 – Feb)',          type:'PDF/XML', status:'OK' },
              { name:'Constancia Situación Fiscal',       type:'PDF',     status:'PENDING' },
              { name:'Carta de Confidencialidad',         type:'PDF',     status:'OK' },
            ].map((doc, i) => (
              <div key={i} style={{
                background:'#fff', border: doc.status === 'OK' ? '1px solid #e2e8f0' : '1px solid #fde68a',
                borderRadius:20, padding:'18px 20px',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                transition:'all 0.2s',
              }}
              className="hover:shadow-md hover:-translate-y-0.5"
              >
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{
                    width:44, height:44, borderRadius:14,
                    background: doc.status === 'OK' ? '#eff6ff' : '#fffbeb',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <FileText style={{ width:20, height:20, color: doc.status === 'OK' ? '#3b82f6' : '#d97706' }} />
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>{doc.name}</p>
                    <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.04em', marginTop:2 }}>
                      {doc.type}
                    </p>
                  </div>
                </div>
                {doc.status === 'OK' ? (
                  <button style={{
                    width:38, height:38, borderRadius:12,
                    background:'#f8fafc', border:'1px solid #e2e8f0',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', transition:'all 0.2s',
                  }}
                  className="hover:bg-blue-500 hover:border-blue-500 [&:hover_svg]:text-white"
                  >
                    <Download style={{ width:16, height:16, color:'#64748b' }} />
                  </button>
                ) : (
                  <span style={{
                    display:'flex', alignItems:'center', gap:4,
                    fontSize:9, fontWeight:800, color:'#d97706',
                    background:'#fffbeb', border:'1px solid #fde68a',
                    borderRadius:20, padding:'4px 10px', textTransform:'uppercase', letterSpacing:'0.04em',
                  }}>
                    <AlertTriangle style={{ width:10, height:10 }} /> Falta
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ACTIVOS ── */}
      {activeTab === 'ASSETS' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Equipamiento y EPP</h3>
            <p className="text-sm font-medium text-gray-400 mt-1">Activos asignados bajo tu resguardo.</p>
          </div>
          {assets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assets.map(asset => (
                <div key={asset.id} style={{
                  background:'#fff', border:'1px solid #e2e8f0', borderRadius:20,
                  padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between',
                  transition:'all 0.2s',
                }}
                className="hover:shadow-md hover:border-emerald-200"
                >
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{
                      width:44, height:44, borderRadius:14, background:'#f0fdf4',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {asset.category === 'EPP'
                        ? <HardHat style={{ width:20, height:20, color:'#059669' }} />
                        : <Briefcase style={{ width:20, height:20, color:'#059669' }} />
                      }
                    </div>
                    <div>
                      <p style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>{asset.name}</p>
                      <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.04em', marginTop:2 }}>
                        {asset.category} · S/N: {asset.serialNumber || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span style={{
                      fontSize:9, fontWeight:800, color:'#059669',
                      background:'#ecfdf5', border:'1px solid #a7f3d0',
                      borderRadius:20, padding:'4px 10px', textTransform:'uppercase', letterSpacing:'0.04em',
                      display:'block',
                    }}>Asignado</span>
                    <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8', marginTop:4, textTransform:'uppercase' }}>
                      {new Date(asset.assignedDate).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              background:'#fff', border:'2px dashed #e2e8f0', borderRadius:24,
              padding:'60px 20px', textAlign:'center',
              display:'flex', flexDirection:'column', alignItems:'center', gap:12,
            }}>
              <div style={{ width:56, height:56, borderRadius:18, background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Briefcase style={{ width:24, height:24, color:'#cbd5e1' }} />
              </div>
              <p style={{ fontSize:14, fontWeight:900, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                Sin activos asignados
              </p>
              <p style={{ fontSize:12, fontWeight:500, color:'#94a3b8', maxWidth:280 }}>
                No tienes herramientas ni EPP registrados bajo tu responsabilidad.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL SOLICITUD ── */}
      {showRequestModal && (
        <div style={{
          position:'fixed', inset:0, zIndex:50,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16,
          background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)',
        }}
        className="animate-in fade-in duration-200"
        >
          <div style={{
            background:'#fff', borderRadius:28, width:'100%', maxWidth:500,
            overflow:'hidden', boxShadow:'0 40px 120px rgba(0,0,0,0.3)',
          }}
          className="animate-in zoom-in-95 duration-300"
          >
            {/* Header modal */}
            <div style={{
              background:'linear-gradient(135deg, #0f172a, #1e293b)',
              padding:'28px 32px', position:'relative', overflow:'hidden',
            }}>
              <div style={{ position:'absolute', top:-30, right:-30, opacity:0.08, pointerEvents:'none' }}>
                <Palmtree style={{ width:100, height:100, color:'#fff' }} />
              </div>
              <div className="flex items-start justify-between relative">
                <div>
                  <p style={{ fontSize:10, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
                    Capital Humano
                  </p>
                  <h3 style={{ fontSize:22, fontWeight:900, color:'#f8fafc', margin:0 }}>Nueva Solicitud</h3>
                  <p style={{ fontSize:12, color:'#64748b', fontWeight:600, marginTop:6 }}>
                    Completa los datos para enviar a RH.
                  </p>
                </div>
                <button onClick={() => setShowRequestModal(false)} style={{
                  width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.08)',
                  border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', color:'#94a3b8',
                }}>
                  <X style={{ width:16, height:16 }} />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleVacationRequest} style={{ padding:'28px 32px' }} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label:'Fecha Inicio', field:'startDate', type:'date' },
                  { label:'Fecha Fin',    field:'endDate',   type:'date' },
                ].map(({ label, field, type }) => (
                  <div key={field} className="space-y-2">
                    <label style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', display:'block' }}>
                      {label}
                    </label>
                    <input
                      type={type} required
                      value={formData[field]}
                      onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                      style={{
                        width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0',
                        borderRadius:14, padding:'12px 16px', fontSize:13, fontWeight:700,
                        outline:'none', boxSizing:'border-box',
                      }}
                      className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', display:'block' }}>
                    Días Solicitados
                  </label>
                  <input
                    type="number" readOnly value={formData.days}
                    style={{
                      width:'100%', background:'#f1f5f9', border:'1px solid #e2e8f0',
                      borderRadius:14, padding:'12px 16px', fontSize:13, fontWeight:800,
                      outline:'none', cursor:'not-allowed', boxSizing:'border-box',
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', display:'block' }}>
                    Tipo de Permiso
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                    style={{
                      width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0',
                      borderRadius:14, padding:'12px 16px', fontSize:13, fontWeight:700,
                      outline:'none', boxSizing:'border-box',
                    }}
                    className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  >
                    <option value="ANNUAL">Vacaciones Anuales</option>
                    <option value="PERSONAL">Permiso Personal</option>
                    <option value="SICK">Incapacidad (Con Receta)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', display:'block' }}>
                  Motivo / Notas adicionales
                </label>
                <textarea
                  value={formData.reason}
                  onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Ej: Viaje familiar, trámite personal…"
                  style={{
                    width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0',
                    borderRadius:14, padding:'12px 16px', fontSize:13, fontWeight:600,
                    outline:'none', resize:'none', height:88, boxSizing:'border-box',
                  }}
                  className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowRequestModal(false)} style={{
                  flex:1, background:'#f1f5f9', border:'none', borderRadius:14,
                  padding:'14px', fontSize:11, fontWeight:800, color:'#475569',
                  cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em',
                }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} style={{
                  flex:1,
                  background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  border:'none', borderRadius:14, padding:'14px',
                  fontSize:11, fontWeight:800, color:'#fff',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  textTransform:'uppercase', letterSpacing:'0.06em',
                  boxShadow: isSubmitting ? 'none' : '0 4px 20px rgba(37,99,235,0.3)',
                }}>
                  {isSubmitting ? 'Enviando…' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AUDITORÍA ── */}
      {activeTab === 'AUDITORIA' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Auditoría Personal</h3>
              <p className="text-sm font-medium text-gray-400 mt-1">Registro diario de desempeño y áreas de mejora.</p>
            </div>
            <button
              onClick={() => setShowAuditForm(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: showAuditForm ? '#f1f5f9' : 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: showAuditForm ? '#475569' : '#fff',
                border: showAuditForm ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer', padding: '12px 24px', borderRadius: 16,
                fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                boxShadow: showAuditForm ? 'none' : '0 4px 20px rgba(0,0,0,0.15)',
                transition: 'all 0.2s',
              }}
            >
              {showAuditForm
                ? <><X style={{ width: 14, height: 14 }} /> Cancelar</>
                : <><Plus style={{ width: 14, height: 14 }} /> Nueva Auditoría</>}
            </button>
          </div>

          {/* Formulario */}
          {showAuditForm && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Header form */}
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '24px 28px' }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Nueva entrada
                </p>
                <h4 style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc', margin: 0 }}>Auditoría Personal</h4>
              </div>

              <form onSubmit={handleSaveAudit} className="p-7 space-y-6">
                {/* Fila 1: Proyecto + Fecha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block' }}>
                      Nombre del Proyecto *
                    </label>
                    <input
                      required
                      type="text"
                      value={auditForm.projectName}
                      onChange={e => setAuditForm(p => ({ ...p, projectName: e.target.value }))}
                      placeholder="Ej: Instalación Planta Norte"
                      style={{
                        width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 14, padding: '12px 16px', fontSize: 13, fontWeight: 700,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block' }}>
                      Fecha y Hora *
                    </label>
                    <input
                      required
                      type="datetime-local"
                      value={auditForm.auditDate}
                      onChange={e => setAuditForm(p => ({ ...p, auditDate: e.target.value }))}
                      style={{
                        width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 14, padding: '12px 16px', fontSize: 13, fontWeight: 700,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                {/* Fila 2: Líder + Área */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Toggle Líder */}
                  <div className="space-y-2">
                    <label style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block' }}>
                      ¿Eres Líder? *
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ label: 'Sí', value: true }, { label: 'No', value: false }].map(opt => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => setAuditForm(p => ({ ...p, isLeader: opt.value }))}
                          style={{
                            flex: 1, padding: '12px 0', borderRadius: 14, fontSize: 12, fontWeight: 800,
                            cursor: 'pointer', transition: 'all 0.15s',
                            background: auditForm.isLeader === opt.value
                              ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                              : '#f8fafc',
                            color: auditForm.isLeader === opt.value ? '#fff' : '#64748b',
                            border: auditForm.isLeader === opt.value ? 'none' : '1px solid #e2e8f0',
                            boxShadow: auditForm.isLeader === opt.value ? '0 4px 14px rgba(37,99,235,0.25)' : 'none',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block' }}>
                      Área de Acción *
                    </label>
                    <input
                      required
                      type="text"
                      value={auditForm.actionArea}
                      onChange={e => setAuditForm(p => ({ ...p, actionArea: e.target.value }))}
                      placeholder="Ej: Eléctrica, Mecánica, Supervisión…"
                      style={{
                        width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 14, padding: '12px 16px', fontSize: 13, fontWeight: 700,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                {/* Secciones de items */}
                {[
                  { key: 'didWell',      label: '¿Qué hice bien?',         min: 3, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                  { key: 'didPoor',      label: '¿Qué hice mal?',          min: 2, color: '#dc2626', bg: '#fff1f2', border: '#fecaca' },
                  { key: 'improvements', label: '¿Cómo podemos mejorar?',  min: 2, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                ].map(({ key, label, min, color, bg, border }) => (
                  <div key={key} className="space-y-3">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        {label} <span style={{ color, fontWeight: 900 }}>· mín {min}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setAuditForm(p => ({ ...p, [key]: [...p[key], { desc: '' }] }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 9, fontWeight: 800, color,
                          background: bg, border: `1px solid ${border}`,
                          borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}
                      >
                        <Plus style={{ width: 10, height: 10 }} /> Agregar
                      </button>
                    </div>
                    <div className="space-y-2">
                      {auditForm[key].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, background: bg,
                            border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 10, fontWeight: 900, color,
                          }}>
                            {idx + 1}
                          </div>
                          <input
                            required
                            type="text"
                            value={item.desc}
                            onChange={e => setAuditForm(p => {
                              const arr = [...p[key]];
                              arr[idx] = { desc: e.target.value };
                              return { ...p, [key]: arr };
                            })}
                            placeholder={`Acción ${idx + 1}…`}
                            style={{
                              flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0',
                              borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600,
                              outline: 'none', boxSizing: 'border-box',
                            }}
                            className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                          />
                          {auditForm[key].length > min && (
                            <button
                              type="button"
                              onClick={() => setAuditForm(p => {
                                const arr = p[key].filter((_, i) => i !== idx);
                                return { ...p, [key]: arr };
                              })}
                              style={{
                                width: 28, height: 28, borderRadius: 8, background: '#fff1f2',
                                border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', flexShrink: 0,
                              }}
                            >
                              <X style={{ width: 12, height: 12, color: '#dc2626' }} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Botones */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAuditForm(false)}
                    style={{
                      flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 14,
                      padding: 14, fontSize: 11, fontWeight: 800, color: '#475569',
                      cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAudit}
                    style={{
                      flex: 2,
                      background: isSavingAudit ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      border: 'none', borderRadius: 14, padding: 14,
                      fontSize: 11, fontWeight: 800, color: '#fff',
                      cursor: isSavingAudit ? 'not-allowed' : 'pointer',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      boxShadow: isSavingAudit ? 'none' : '0 4px 20px rgba(37,99,235,0.3)',
                    }}
                  >
                    {isSavingAudit ? 'Guardando…' : 'Guardar Auditoría'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Historial */}
          <div className="space-y-3">
            {loadingAudits ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-2xl border animate-pulse" />
              ))
            ) : audits.length === 0 ? (
              <div style={{
                background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 24,
                padding: '56px 20px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList style={{ width: 24, height: 24, color: '#cbd5e1' }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sin auditorías registradas
                </p>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', maxWidth: 280 }}>
                  Registra tu primera auditoría personal para llevar un seguimiento de tu desempeño diario.
                </p>
              </div>
            ) : (
              audits.map(audit => {
                const isOpen = expandedAudit === audit.id;
                const dateStr = new Date(audit.auditDate).toLocaleDateString('es-MX', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div key={audit.id} style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
                    overflow: 'hidden', transition: 'box-shadow 0.2s',
                  }}
                  className="hover:shadow-md"
                  >
                    {/* Cabecera clickeable */}
                    <button
                      type="button"
                      onClick={() => setExpandedAudit(isOpen ? null : audit.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                        padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                        border: '1px solid #bfdbfe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ClipboardList style={{ width: 20, height: 20, color: '#2563eb' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 3 }} className="truncate">
                          {audit.projectName}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {dateStr}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 800,
                            color: audit.isLeader ? '#059669' : '#64748b',
                            background: audit.isLeader ? '#ecfdf5' : '#f1f5f9',
                            border: `1px solid ${audit.isLeader ? '#a7f3d0' : '#e2e8f0'}`,
                            borderRadius: 20, padding: '2px 10px', textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>
                            {audit.isLeader ? 'Líder' : 'Colaborador'}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 800, color: '#6366f1',
                            background: '#f5f3ff', border: '1px solid #e0e7ff',
                            borderRadius: 20, padding: '2px 10px', textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>
                            {audit.actionArea}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={ev => { ev.stopPropagation(); handleDeleteAudit(audit.id); }}
                          style={{
                            width: 32, height: 32, borderRadius: 10, background: '#fff1f2',
                            border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 style={{ width: 13, height: 13, color: '#dc2626' }} />
                        </button>
                        <ChevronDown style={{
                          width: 18, height: 18, color: '#94a3b8',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s',
                        }} />
                      </div>
                    </button>

                    {/* Detalle expandible */}
                    {isOpen && (
                      <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f1f5f9' }} className="animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                          {[
                            { label: '¿Qué hice bien?',        items: audit.didWell,      color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                            { label: '¿Qué hice mal?',         items: audit.didPoor,      color: '#dc2626', bg: '#fff1f2', border: '#fecaca' },
                            { label: '¿Cómo podemos mejorar?', items: audit.improvements, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                          ].map(({ label, items, color, bg, border }) => (
                            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: '14px 16px' }}>
                              <p style={{ fontSize: 9, fontWeight: 900, color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                                {label}
                              </p>
                              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {(items || []).map((item, i) => (
                                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <span style={{
                                      width: 18, height: 18, borderRadius: 6, background: `${color}20`,
                                      border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 9, fontWeight: 900, color, flexShrink: 0, marginTop: 1,
                                    }}>
                                      {i + 1}
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── REGLAMENTO ── */}
      {activeTab === 'REGLAMENTO' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Reglamento Interno</h3>
            <p className="text-sm font-medium text-gray-400 mt-1">
              Documento oficial de políticas y normas de la empresa.
            </p>
          </div>

          {loadingReglamento ? (
            <div className="h-48 bg-white rounded-3xl border animate-pulse" />
          ) : reglamento ? (
            /* ── Reglamento disponible ── */
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                padding: '32px 36px',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Shield style={{ width: 28, height: 28, color: '#93c5fd' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Documento Vigente
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc', lineHeight: 1.2 }} className="truncate">
                    {reglamento.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                    Subido por <span style={{ color: '#94a3b8', fontWeight: 700 }}>{reglamento.uploadedBy}</span>
                    {' · '}
                    {new Date(reglamento.uploadedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="p-6 flex flex-col sm:flex-row gap-3">
                <a
                  href={reglamento.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(37,99,235,0.25)',
                    textDecoration: 'none',
                  }}
                >
                  <FileText style={{ width: 16, height: 16 }} />
                  Ver Reglamento
                </a>
                <a
                  href={reglamento.url}
                  download
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-gray-100"
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    textDecoration: 'none',
                  }}
                >
                  <Download style={{ width: 16, height: 16 }} />
                  Descargar PDF
                </a>
              </div>

              {/* Zona de reemplazo — solo ADMIN / HR */}
              {canManageReglamento && (
                <div className="px-6 pb-6">
                  <div style={{
                    border: '2px dashed #e2e8f0',
                    borderRadius: 16, padding: '20px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Reemplazar documento</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>PDF · máximo 20 MB</p>
                    </div>
                    <label style={{ cursor: isUploadingReglamento ? 'not-allowed' : 'pointer' }}>
                      <input type="file" accept=".pdf" className="hidden" disabled={isUploadingReglamento} onChange={handleReglamentoUpload} />
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '10px 20px', borderRadius: 12,
                        background: isUploadingReglamento ? '#f1f5f9' : '#0f172a',
                        color: isUploadingReglamento ? '#94a3b8' : '#fff',
                        fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                        transition: 'all 0.2s',
                      }}>
                        {isUploadingReglamento
                          ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #94a3b8', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /> Subiendo…</>
                          : <><Zap style={{ width: 14, height: 14 }} /> Subir nuevo</>}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Sin reglamento aún ── */
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 28, padding: '56px 36px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 24, background: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield style={{ width: 32, height: 32, color: '#94a3b8' }} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Sin reglamento publicado</p>
                <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, maxWidth: 340 }}>
                  {canManageReglamento
                    ? 'Sube el reglamento interno para que todos los colaboradores puedan consultarlo.'
                    : 'El equipo de administración aún no ha publicado el reglamento.'}
                </p>
              </div>
              {canManageReglamento && (
                <label style={{ cursor: isUploadingReglamento ? 'not-allowed' : 'pointer', marginTop: 8 }}>
                  <input type="file" accept=".pdf" className="hidden" disabled={isUploadingReglamento} onChange={handleReglamentoUpload} />
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '14px 28px', borderRadius: 16,
                    background: isUploadingReglamento ? '#f1f5f9' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: isUploadingReglamento ? '#94a3b8' : '#fff',
                    fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                    boxShadow: isUploadingReglamento ? 'none' : '0 4px 20px rgba(37,99,235,0.3)',
                    transition: 'all 0.2s', cursor: 'inherit',
                  }}>
                    {isUploadingReglamento
                      ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #94a3b8', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /> Subiendo…</>
                      : <><Plus style={{ width: 16, height: 16 }} /> Publicar Reglamento</>}
                  </span>
                </label>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
