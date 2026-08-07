import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calculator, Loader2, ArrowRight, FolderKanban } from 'lucide-react';
import projectService from '@/api/projectService';
import CotizadorTab from '../components/CotizadorTab';

// ── Cotizador como página suelta (entrada de la nav lateral) ───────────────
// Funciona como calculadora libre sin elegir proyecto; al seleccionar uno se
// habilita el guardado de partidas y el PDF. El proyecto elegido se refleja en
// la URL (?project=<id>) para poder compartir o recargar sin perderlo.
export default function CotizadorView() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const projectId = params.get('project') || '';

  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingProject, setLoadingProject] = useState(false);

  useEffect(() => {
    projectService.list()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoadingList(false));
  }, []);

  // Carga el proyecto completo (con sus partidas) cuando cambia la selección.
  useEffect(() => {
    if (!projectId) { setProject(null); return; }
    let cancelled = false;
    setLoadingProject(true);
    projectService.get(projectId)
      .then(p => { if (!cancelled) setProject(p); })
      .catch(() => { if (!cancelled) setProject(null); })
      .finally(() => { if (!cancelled) setLoadingProject(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const reload = () => {
    if (!projectId) return;
    projectService.get(projectId).then(setProject).catch(console.error);
  };

  const pick = (id) => {
    if (id) setParams({ project: id });
    else setParams({});
  };

  return (
    <div className="w-full space-y-6">
      {/* Encabezado */}
      <header className="bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Proyectos · Diseño</span>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">Cotizador de Retail</h1>
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                Ingeniería de diseño · tabulador por área
              </p>
            </div>
          </div>

          {project && (
            <button onClick={() => navigate(`/projects/${project.id}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all">
              Abrir proyecto <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Selector de proyecto destino */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
            Proyecto destino
          </label>
          {loadingList ? (
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando proyectos…
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <select value={projectId} onChange={(e) => pick(e.target.value)}
                className="proj-input max-w-md">
                <option value="">— Solo calcular (sin guardar) —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
                ))}
              </select>
              {loadingProject && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
              {projects.length === 0 && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                  <FolderKanban className="h-3.5 w-3.5" /> No hay proyectos creados todavía.
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <CotizadorStyle />
      <CotizadorTab project={project} onChanged={reload} />
    </div>
  );
}

// El estilo de inputs vive en ProjectDetail; como esta vista es independiente
// necesita su propia copia de la clase.
function CotizadorStyle() {
  return (
    <style>{`
      .proj-input {
        width: 100%; padding: 0.7rem 0.95rem; background: #f8fafc;
        border: 1.5px solid #e5e7eb; border-radius: 0.85rem; font-size: 0.8rem;
        font-weight: 600; color: #0f172a; outline: none;
        transition: border-color .18s, box-shadow .18s, background .18s;
      }
      .proj-input::placeholder { color: #94a3b8; font-weight: 500; }
      .proj-input:hover { border-color: #cbd5e1; }
      .proj-input:focus {
        border-color: var(--color-primary, #2563eb); background: #fff;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #2563eb) 12%, transparent);
      }
      textarea.proj-input { resize: vertical; line-height: 1.5; }
      select.proj-input { cursor: pointer; }
    `}</style>
  );
}
