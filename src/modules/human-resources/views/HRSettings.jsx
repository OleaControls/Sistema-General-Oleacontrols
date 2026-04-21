import React, { useState, useEffect } from 'react';
import { Settings, Save, Sliders, Shield, FileText, Download, Plus, Zap, BookOpen } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

function ReglamentoPanel() {
  const { user } = useAuth();
  const [reglamento, setReglamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiFetch('/api/config?key=REGLAMENTO')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.url) setReglamento(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('El archivo no debe superar 20 MB.'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const uploadRes = await apiFetch('/api/upload', {
          method: 'POST',
          body: JSON.stringify({ file: reader.result, folder: 'reglamento' }),
        });
        if (!uploadRes.ok) throw new Error('Error al subir el archivo');
        const { url } = await uploadRes.json();
        const meta = { url, name: file.name, uploadedAt: new Date().toISOString(), uploadedBy: user.name };
        const configRes = await apiFetch('/api/config', {
          method: 'POST',
          body: JSON.stringify({ key: 'REGLAMENTO', value: meta }),
        });
        if (!configRes.ok) throw new Error('Error al guardar configuración');
        setReglamento(meta);
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        setUploading(false);
      }
    };
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-gray-50/50 flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-blue-500" />
        <div className="flex-1">
          <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Reglamento Interno</h3>
          <p className="text-[10px] font-bold text-gray-400 mt-0.5">El PDF publicado será visible para todos los colaboradores en su perfil.</p>
        </div>
        {reglamento && (
          <span style={{
            fontSize: 9, fontWeight: 800, color: '#059669',
            background: '#ecfdf5', border: '1px solid #a7f3d0',
            borderRadius: 20, padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Publicado
          </span>
        )}
      </div>

      <div className="p-6 space-y-4">
        {loading ? (
          <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ) : reglamento ? (
          <>
            {/* Documento actual */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              border: '1px solid #bfdbfe', borderRadius: 16, padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, background: 'rgba(37,99,235,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FileText style={{ width: 20, height: 20, color: '#2563eb' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#1e3a8a' }} className="truncate">{reglamento.name}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginTop: 2 }}>
                    Subido por <strong>{reglamento.uploadedBy}</strong>
                    {' · '}
                    {new Date(reglamento.uploadedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a
                  href={reglamento.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12,
                    background: '#2563eb', color: '#fff', textDecoration: 'none',
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}
                >
                  <FileText style={{ width: 12, height: 12 }} /> Ver
                </a>
                <a
                  href={reglamento.url} download
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12,
                    background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', textDecoration: 'none',
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}
                >
                  <Download style={{ width: 12, height: 12 }} /> PDF
                </a>
              </div>
            </div>

            {/* Reemplazar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              border: '2px dashed #e2e8f0', borderRadius: 16, padding: '14px 20px',
            }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Reemplazar documento</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Sube un PDF nuevo — se publicará de inmediato a todos los usuarios.</p>
              </div>
              <label style={{ cursor: uploading ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                <input type="file" accept=".pdf" className="hidden" disabled={uploading} onChange={handleUpload} />
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 12,
                  background: uploading ? '#f1f5f9' : '#0f172a',
                  color: uploading ? '#94a3b8' : '#fff',
                  fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {uploading
                    ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #94a3b8', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /> Subiendo…</>
                    : <><Zap style={{ width: 14, height: 14 }} /> Subir nuevo</>}
                </span>
              </label>
            </div>
          </>
        ) : (
          /* Sin reglamento */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            padding: '40px 20px', textAlign: 'center',
            border: '2px dashed #e2e8f0', borderRadius: 20,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen style={{ width: 24, height: 24, color: '#cbd5e1' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>Sin reglamento publicado</p>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, maxWidth: 320 }}>
                Sube el PDF del reglamento interno para que todos los colaboradores puedan consultarlo desde su perfil.
              </p>
            </div>
            <label style={{ cursor: uploading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
              <input type="file" accept=".pdf" className="hidden" disabled={uploading} onChange={handleUpload} />
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 16,
                background: uploading ? '#f1f5f9' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: uploading ? '#94a3b8' : '#fff',
                fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                boxShadow: uploading ? 'none' : '0 4px 20px rgba(37,99,235,0.3)',
                cursor: 'inherit',
              }}>
                {uploading
                  ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #94a3b8', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /> Subiendo…</>
                  : <><Plus style={{ width: 16, height: 16 }} /> Publicar Reglamento</>}
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HRSettings() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Configuración RH</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Parámetros del sistema, políticas de vacaciones y catálogos.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <Save className="h-4 w-4" /> Guardar Cambios
        </button>
      </div>

      <ReglamentoPanel />

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50 flex items-center gap-3">
          <Sliders className="h-5 w-5 text-primary" />
          <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Políticas de Vacaciones (Ley Federal MX)</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Días de inicio (1er Año)</label>
              <input type="number" defaultValue="12" className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold text-gray-900 outline-none focus:border-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Incremento Anual (Días)</label>
              <input type="number" defaultValue="2" className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold text-gray-900 outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm font-bold text-gray-700">Permitir acumulación de días no disfrutados (Carry-over) al siguiente año.</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50 flex items-center gap-3">
          <Shield className="h-5 w-5 text-amber-500" />
          <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Aprobaciones y Flujos</h3>
        </div>
        <div className="p-6 space-y-4">
          {[
            { name: 'Aprobación de Vacaciones', desc: 'Requiere firma del Jefe Directo y validación de RH.' },
            { name: 'Justificantes Médicos', desc: 'Aprobación automática al subir documento PDF (Sujeto a auditoría).' },
            { name: 'Solicitud de EPP', desc: 'Notifica a almacén/operaciones para entrega física.' }
          ].map((flow, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-2xl hover:border-primary/30 transition-colors">
              <div>
                <p className="font-black text-sm text-gray-900">{flow.name}</p>
                <p className="text-[10px] font-bold text-gray-500 mt-1">{flow.desc}</p>
              </div>
              <button className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20">Modificar Flujo</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
