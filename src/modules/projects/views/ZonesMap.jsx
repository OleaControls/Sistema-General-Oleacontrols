import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Map as MapIcon, Plus, RefreshCw, Loader2, X, Trash2, Pencil, Crosshair,
  FolderKanban, ClipboardList, Users, Boxes, AlertTriangle, MapPin, Phone, Sparkles,
} from 'lucide-react';
import { TILE_LAYER } from '@/lib/mapTiles';
import zoneService from '@/api/zoneService';
import projectService from '@/api/projectService';
import { cn } from '@/lib/utils';
import {
  PRIORITIES, PRIORITY_KEYS, priorityMeta, typeMeta, activityLabel,
  otPriorityMeta, fmtDate, telHref,
} from '../utils/reglas';

// ── Mapa de Operaciones ────────────────────────────────────────────────────
// Zonifica la operación: qué proyectos, asignaciones, técnicos y equipos vive
// cada zona. El vínculo es por nombre, así que una zona escrita a mano en un
// proyecto aparece aquí aunque no esté dada de alta: se marca como suelta y se
// puede catalogar con un clic.

const CENTRO_MX = [23.6345, -102.5528];

// Paleta para las zonas que no eligieron color.
const COLORES = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#dc2626', '#0891b2', '#c026d3', '#65a30d'];
const colorDe = (zona, i) => zona?.color || COLORES[i % COLORES.length];

const EMPTY_ZONE = {
  name: '', code: '', description: '', color: COLORES[0], address: '',
  supervisorName: '', priority: 'MEDIA', status: 'ACTIVA',
  latitude: '', longitude: '', radiusKm: '', notes: '',
};

export default function ZonesMap() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');       // nombre de la zona
  const [modal, setModal] = useState(null);           // { ...zona } | null
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      setData(await zoneService.panorama());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    projectService.employees().then(setEmployees).catch(() => {});
  }, []);

  const zones = data?.zones || [];
  const projects = data?.projects || [];
  const assignments = data?.assignments || [];

  const zoneByName = useMemo(
    () => Object.fromEntries(zones.map((z, i) => [z.name, { ...z, color: colorDe(z, i) }])),
    [zones]
  );

  // Lo que todavía no se zonifica: es el trabajo pendiente del gerente.
  const sinZona = {
    projects: projects.filter(p => !(p.zone || '').trim()).length,
    assignments: assignments.filter(a => !(a.zone || '').trim()).length,
  };

  const totales = zones.reduce((a, z) => ({
    projects: a.projects + z.projects,
    assignments: a.assignments + z.assignments,
    unassigned: a.unassigned + z.unassigned,
    equipment: a.equipment + z.equipment,
    technicians: a.technicians + z.technicians,
  }), { projects: 0, assignments: 0, unassigned: 0, equipment: 0, technicians: 0 });

  const zonaSel = selected ? zoneByName[selected] : null;
  const proyectosZona = selected ? projects.filter(p => (p.zone || '') === selected) : [];
  const asignacionesZona = selected ? assignments.filter(a => (a.zone || '') === selected) : [];

  // Pines: las asignaciones con coordenadas, coloreadas por su zona.
  const pines = assignments.filter(a => a.latitude && a.longitude);
  const centro = zonaSel?.latitude && zonaSel?.longitude
    ? [zonaSel.latitude, zonaSel.longitude]
    : (pines[0] ? [pines[0].latitude, pines[0].longitude] : CENTRO_MX);

  const guardar = async () => {
    if (!modal?.name?.trim()) { setError('La zona necesita un nombre.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...modal,
        latitude: modal.latitude === '' ? null : Number(modal.latitude),
        longitude: modal.longitude === '' ? null : Number(modal.longitude),
        radiusKm: modal.radiusKm === '' ? null : Number(modal.radiusKm),
      };
      if (modal.id && !modal.virtual) await zoneService.update(modal.id, payload);
      else await zoneService.create(payload);
      setModal(null);
      setError('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const archivar = async (z) => {
    if (!confirm(`¿Archivar la zona "${z.name}"? Los proyectos y asignaciones conservan el nombre.`)) return;
    try {
      await zoneService.remove(z.id);
      if (selected === z.name) setSelected('');
      await load();
    } catch (e) { setError(e.message); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <header className="bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <MapIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                Sistema General · Proyectos
              </span>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                Mapa de Operaciones
              </h1>
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                Zonifica proyectos, asignaciones, técnicos y equipo para eficientar la operación
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModal({ ...EMPTY_ZONE })}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all">
              <Plus className="h-3.5 w-3.5" /> Nueva zona
            </button>
            <button onClick={load}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all">
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </button>
          </div>
        </div>
        {error && <p className="mt-4 text-[11px] font-black text-red-500 uppercase tracking-wider">{error}</p>}
      </header>

      {/* ── Indicadores ────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon={MapIcon} label="Zonas" value={zones.length} />
        <Tile icon={FolderKanban} label="Proyectos zonificados" value={totales.projects} />
        <Tile icon={ClipboardList} label="Asignaciones en zona" value={totales.assignments} />
        <Tile icon={Users} label="Técnicos en zona" value={totales.technicians} />
        <Tile icon={Boxes} label="Equipos" value={totales.equipment} />
        <Tile icon={AlertTriangle} label="Sin zonificar"
          value={sinZona.projects + sinZona.assignments}
          tone={sinZona.projects + sinZona.assignments > 0 ? 'warn' : undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        {/* ── Mapa ─────────────────────────────────────────────────────── */}
        <div className="bg-white p-2 rounded-3xl border shadow-sm overflow-hidden">
          <div className="relative z-0 h-[30rem] rounded-[1.35rem] overflow-hidden">
            <MapContainer center={centro} zoom={zonaSel ? 11 : 5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer {...TILE_LAYER} />
              <FlyTo center={centro} zoom={zonaSel ? 11 : 5} />

              {/* Cobertura declarada de cada zona */}
              {zones.filter(z => z.latitude && z.longitude && z.radiusKm).map((z, i) => (
                <Circle key={z.id} center={[z.latitude, z.longitude]} radius={z.radiusKm * 1000}
                  pathOptions={{
                    color: colorDe(z, i),
                    fillColor: colorDe(z, i),
                    fillOpacity: selected === z.name ? 0.18 : 0.07,
                    weight: selected === z.name ? 2 : 1,
                  }}
                  eventHandlers={{ click: () => setSelected(z.name) }}>
                  <Popup>
                    <strong>{z.name}</strong><br />
                    {z.projects} proyectos · {z.assignments} asignaciones
                  </Popup>
                </Circle>
              ))}

              {/* Asignaciones abiertas con coordenadas */}
              {pines.map(a => {
                const z = zoneByName[a.zone || ''];
                const color = z?.color || '#94a3b8';
                const activa = !selected || a.zone === selected;
                return (
                  <CircleMarker key={a.id} center={[a.latitude, a.longitude]}
                    radius={activa ? 7 : 4}
                    pathOptions={{ color, fillColor: color, fillOpacity: activa ? 0.9 : 0.25, weight: 1 }}>
                    <Popup>
                      <strong>{a.otNumber}</strong><br />
                      {a.title}<br />
                      {a.zone ? `Zona ${a.zone}` : 'Sin zona'} · {activityLabel(a.activity)}<br />
                      {a.technician?.name || 'Sin técnico'}
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
          <p className="text-[10px] font-bold text-gray-400 px-4 py-3">
            Cada punto es una asignación abierta con coordenadas ({pines.length} de {assignments.length}).
            Los círculos son la cobertura declarada de cada zona.
          </p>
        </div>

        {/* ── Zonas ────────────────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-700">Zonas</h3>
            {selected && (
              <button onClick={() => setSelected('')}
                className="ml-auto text-[9px] font-black uppercase tracking-wider text-gray-400 hover:text-primary">
                Ver todas
              </button>
            )}
          </div>

          {zones.length === 0 ? (
            <p className="text-[11px] font-bold text-gray-300 py-8 text-center">
              Aún no hay zonas. Crea la primera o captura una en un proyecto.
            </p>
          ) : (
            <ul className="space-y-2.5 max-h-[26rem] overflow-y-auto pr-1">
              {zones.map((z, i) => {
                const activa = selected === z.name;
                return (
                  <li key={z.id}
                    className={cn(
                      'p-3.5 rounded-2xl border transition-all cursor-pointer',
                      activa ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                    )}
                    onClick={() => setSelected(activa ? '' : z.name)}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colorDe(z, i) }} />
                      <p className="text-[11px] font-black text-gray-900 truncate flex-1">{z.name}</p>
                      {z.virtual ? (
                        <button onClick={(e) => { e.stopPropagation(); setModal({ ...EMPTY_ZONE, name: z.name, color: colorDe(z, i) }); }}
                          title="Dar de alta esta zona"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[8px] font-black uppercase tracking-wider text-amber-700">
                          <Sparkles className="h-2.5 w-2.5" /> Dar de alta
                        </button>
                      ) : (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setModal({ ...EMPTY_ZONE, ...z }); }}
                            title="Editar zona" className="p-1 text-gray-300 hover:text-primary">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); archivar(z); }}
                            title="Archivar zona" className="p-1 text-gray-300 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Chip cls={priorityMeta(z.priority).cls}>{priorityMeta(z.priority).label}</Chip>
                      {z.status === 'INACTIVA' && <Chip cls="bg-gray-50 text-gray-400 border-gray-200">Inactiva</Chip>}
                      {z.supervisorName && (
                        <span className="text-[9px] font-bold text-gray-400 truncate">{z.supervisorName}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1 mt-2.5 text-center">
                      <Mini label="Proy." value={z.projects} />
                      <Mini label="Asign." value={z.assignments} tone={z.unassigned > 0 ? 'warn' : undefined} />
                      <Mini label="Técs." value={z.technicians} />
                      <Mini label="Equipo" value={z.equipment} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {(sinZona.projects > 0 || sinZona.assignments > 0) && (
            <p className="mt-4 pt-4 border-t border-gray-100 text-[10px] font-bold text-amber-600 leading-snug">
              Sin zonificar: {sinZona.projects} proyecto(s) y {sinZona.assignments} asignación(es).
              Captura la zona en el proyecto para que caigan aquí.
            </p>
          )}
        </div>
      </div>

      {/* ── Detalle de la zona seleccionada ────────────────────────────── */}
      {selected && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-700 mb-4">
              Proyectos · {selected}
            </h3>
            {proyectosZona.length === 0 ? (
              <p className="text-[11px] font-bold text-gray-300 py-6 text-center">Sin proyectos en esta zona.</p>
            ) : (
              <ul className="space-y-2.5">
                {proyectosZona.map(p => (
                  <li key={p.id} className="flex items-center gap-3">
                    <button onClick={() => navigate(`/projects/${p.id}`)} className="text-left min-w-0 flex-1">
                      <p className="text-[11px] font-black text-gray-900 truncate">{p.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">
                        {p.code} · {p.location || p.clientName || 'Sin ubicación'}
                      </p>
                    </button>
                    <Chip cls={typeMeta(p.projectType).cls}>{typeMeta(p.projectType).label}</Chip>
                    <span className="text-[10px] font-black text-gray-700 tabular-nums w-9 text-right">{p.progress || 0}%</span>
                    {telHref(p.clientContactPhone) && (
                      <a href={telHref(p.clientContactPhone)} title={`Llamar a ${p.clientContactName || 'el encargado'}`}
                        className="h-7 w-7 shrink-0 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
                        <Phone className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-700 mb-4">
              Asignaciones · {selected}
            </h3>
            {asignacionesZona.length === 0 ? (
              <p className="text-[11px] font-bold text-gray-300 py-6 text-center">Sin asignaciones abiertas.</p>
            ) : (
              <ul className="space-y-2.5">
                {asignacionesZona.map(a => (
                  <li key={a.id} className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/ots/${a.id}`)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black text-gray-900 truncate">
                        <span className="font-mono text-[10px]">{a.otNumber}</span> · {a.title}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">
                        {activityLabel(a.activity)} · {a.technician?.name || 'Sin técnico'} · {a.scheduledDate ? fmtDate(a.scheduledDate) : 'sin fecha'}
                      </p>
                    </div>
                    <Chip cls={otPriorityMeta(a.priority).cls}>{otPriorityMeta(a.priority).label}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Alta / edición de zona ─────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-7 py-5 flex items-center justify-between rounded-t-[2rem]">
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight">
                  {modal.id && !modal.virtual ? 'Editar zona' : 'Nueva zona'}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mapa de operaciones</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2.5 hover:bg-gray-100 rounded-xl">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-7 space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Nombre *">
                  <input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })}
                    className="zone-input" placeholder="Ej. Norte" />
                </Field>
                <Field label="Clave">
                  <input value={modal.code || ''} onChange={(e) => setModal({ ...modal, code: e.target.value })}
                    className="zone-input" placeholder="NTE" />
                </Field>
                <Field label="Color">
                  <div className="flex gap-1.5 flex-wrap pt-1.5">
                    {COLORES.map(c => (
                      <button key={c} type="button" onClick={() => setModal({ ...modal, color: c })}
                        className={cn('h-7 w-7 rounded-xl border-2 transition-all', modal.color === c ? 'border-gray-900 scale-110' : 'border-transparent')}
                        style={{ background: c }} />
                    ))}
                  </div>
                </Field>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Responsable">
                  <select value={modal.supervisorName || ''} onChange={(e) => setModal({ ...modal, supervisorName: e.target.value })}
                    className="zone-input">
                    <option value="">— Selecciona —</option>
                    {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                  </select>
                </Field>
                <Field label="Prioridad">
                  <select value={modal.priority} onChange={(e) => setModal({ ...modal, priority: e.target.value })} className="zone-input">
                    {PRIORITY_KEYS.map(k => <option key={k} value={k}>{PRIORITIES[k].label}</option>)}
                  </select>
                </Field>
                <Field label="Estado">
                  <select value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })} className="zone-input">
                    <option value="ACTIVA">Activa</option>
                    <option value="INACTIVA">Inactiva</option>
                  </select>
                </Field>
              </div>

              <Field label="Ubicación de referencia">
                <input value={modal.address || ''} onChange={(e) => setModal({ ...modal, address: e.target.value })}
                  className="zone-input" placeholder="Colonia, ciudad o punto de reunión" />
              </Field>

              {/* Centro y cobertura: se fija con un clic en el mapa. */}
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Centro de la zona — haz clic en el mapa
                </p>
                <div className="h-56 rounded-2xl overflow-hidden border border-gray-200">
                  <MapContainer
                    center={modal.latitude && modal.longitude ? [Number(modal.latitude), Number(modal.longitude)] : CENTRO_MX}
                    zoom={modal.latitude ? 11 : 5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                    <TileLayer {...TILE_LAYER} />
                    <PickPoint onPick={({ lat, lng }) => setModal(m => ({ ...m, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))} />
                    {modal.latitude && modal.longitude && (
                      <>
                        <CircleMarker center={[Number(modal.latitude), Number(modal.longitude)]} radius={7}
                          pathOptions={{ color: modal.color, fillColor: modal.color, fillOpacity: 0.9 }} />
                        {modal.radiusKm && (
                          <Circle center={[Number(modal.latitude), Number(modal.longitude)]} radius={Number(modal.radiusKm) * 1000}
                            pathOptions={{ color: modal.color, fillColor: modal.color, fillOpacity: 0.12 }} />
                        )}
                      </>
                    )}
                  </MapContainer>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 mt-3">
                  <Field label="Latitud">
                    <input value={modal.latitude ?? ''} onChange={(e) => setModal({ ...modal, latitude: e.target.value })} className="zone-input" />
                  </Field>
                  <Field label="Longitud">
                    <input value={modal.longitude ?? ''} onChange={(e) => setModal({ ...modal, longitude: e.target.value })} className="zone-input" />
                  </Field>
                  <Field label="Cobertura (km)">
                    <input type="number" min="0" step="0.5" value={modal.radiusKm ?? ''}
                      onChange={(e) => setModal({ ...modal, radiusKm: e.target.value })} className="zone-input" />
                  </Field>
                </div>
              </div>

              <Field label="Notas">
                <textarea rows={2} value={modal.notes || ''} onChange={(e) => setModal({ ...modal, notes: e.target.value })} className="zone-input" />
              </Field>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setModal(null)}
                  className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={saving}
                  className="flex-[2] py-3.5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                  Guardar zona
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ZoneStyle />
    </div>
  );
}

// ── Piezas ─────────────────────────────────────────────────────────────────
function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center[0], center[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function PickPoint({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
}

function Tile({ icon: Icon, label, value, tone }) {
  const cls = tone === 'warn' ? 'text-amber-600' : 'text-gray-900';
  return (
    <div className="bg-white p-4 rounded-2xl border shadow-sm">
      <Icon className={cn('h-4 w-4 mb-2', tone ? cls : 'text-gray-300')} />
      <p className={cn('text-2xl font-black tabular-nums leading-none', cls)}>{value}</p>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1.5 leading-tight">{label}</p>
    </div>
  );
}

function Mini({ label, value, tone }) {
  return (
    <div>
      <p className={cn('text-[12px] font-black tabular-nums', tone === 'warn' ? 'text-amber-600' : 'text-gray-800')}>{value}</p>
      <p className="text-[8px] font-black text-gray-300 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function Chip({ cls, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider shrink-0', cls)}>
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ZoneStyle() {
  return (
    <style>{`
      .zone-input {
        width: 100%; padding: 0.65rem 0.9rem; background: #f8fafc;
        border: 1.5px solid #e5e7eb; border-radius: 0.85rem; font-size: 0.78rem;
        font-weight: 600; color: #0f172a; outline: none;
        transition: border-color .18s, background .18s;
      }
      .zone-input::placeholder { color: #94a3b8; font-weight: 500; }
      .zone-input:focus { border-color: var(--color-primary, #2563eb); background: #fff; }
    `}</style>
  );
}
