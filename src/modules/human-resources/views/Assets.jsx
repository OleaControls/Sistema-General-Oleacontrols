import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Wrench, HardHat, Car, Laptop, Smartphone,
  Trash2, UserPlus, X, Package, CheckCircle2, Clock,
  Edit2, ChevronDown, ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hrService } from '@/api/hrService';

const CATEGORIES = ['Herramienta', 'EPP', 'Vehículo', 'Cómputo', 'Móvil', 'Otros'];

const CONDITIONS = [
  { id: 'NEW',  label: 'Nuevo',     cls: 'bg-emerald-100 text-emerald-700' },
  { id: 'GOOD', label: 'Bueno',     cls: 'bg-blue-100 text-blue-700'       },
  { id: 'FAIR', label: 'Regular',   cls: 'bg-amber-100 text-amber-700'     },
  { id: 'POOR', label: 'Mal estado',cls: 'bg-rose-100 text-rose-700'       },
];

const CAT_ICON = {
  Herramienta: <Wrench className="h-3.5 w-3.5" />,
  EPP:         <HardHat className="h-3.5 w-3.5" />,
  Vehículo:   <Car className="h-3.5 w-3.5" />,
  Cómputo:    <Laptop className="h-3.5 w-3.5" />,
  Móvil:      <Smartphone className="h-3.5 w-3.5" />,
  Otros:       <Package className="h-3.5 w-3.5" />,
};

const CAT_COLOR = {
  Herramienta: 'bg-gray-100 text-gray-600',
  EPP:         'bg-amber-100 text-amber-700',
  Vehículo:   'bg-sky-100 text-sky-700',
  Cómputo:    'bg-blue-100 text-blue-700',
  Móvil:      'bg-violet-100 text-violet-700',
  Otros:       'bg-gray-100 text-gray-500',
};

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500'];
const avatarColor = (name='') => { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; };

const pctColor = (p) => p>=70?'bg-emerald-500':p>=40?'bg-amber-400':'bg-rose-500';
const pctText  = (p) => p>=70?'text-emerald-600':p>=40?'text-amber-500':'text-rose-500';

const EMPTY_FORM = { name:'', category:'Herramienta', serialNumber:'', condition:'NEW', conditionPercent:100, notes:'' };

// ── Inputs reutilizables ──────────────────────────────────────────────────────
const Inp = ({ label, value, onChange, type='text', required=false, placeholder='' }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
    <input type={type} required={required} placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-primary/50 transition-all placeholder:text-gray-300"
      value={value||''} onChange={e=>onChange(e.target.value)}/>
  </div>
);

const Sel = ({ label, value, options, onChange }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
    <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-primary/50 transition-all appearance-none"
      value={value||''} onChange={e=>onChange(e.target.value)}>
      {options.map(o=>typeof o==='string'?<option key={o} value={o}>{o}</option>:<option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Assets() {
  const [assets, setAssets]         = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('ALL');
  const [sortKey, setSortKey]       = useState('name');
  const [sortDir, setSortDir]       = useState(1);

  // Drawer add/edit
  const [showDrawer, setShowDrawer] = useState(false);
  const [editAsset, setEditAsset]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  // Inline condition edit
  const [editPctId, setEditPctId]   = useState(null);

  // Assign modal
  const [assignAsset, setAssignAsset] = useState(null);

  useEffect(()=>{ load(); },[]);

  const load = async () => {
    setLoading(true);
    try {
      const [a,e] = await Promise.all([hrService.getAssets(), hrService.getEmployees()]);
      setAssets(a); setEmployees(e);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  };

  const openAdd = () => { setEditAsset(null); setForm(EMPTY_FORM); setShowDrawer(true); };
  const openEdit = (a) => { setEditAsset(a); setForm({name:a.name,category:a.category,serialNumber:a.serialNumber||'',condition:a.condition,conditionPercent:a.conditionPercent??100,notes:a.notes||''}); setShowDrawer(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if(editAsset) await hrService.updateAsset(editAsset.id, form);
      else await hrService.saveAsset(form);
      setShowDrawer(false); load();
    } catch(e){ alert(e.message); } finally { setSaving(false); }
  };

  const handleUpdatePct = async (id, pct) => {
    try { await hrService.updateAsset(id,{conditionPercent:pct}); setAssets(prev=>prev.map(a=>a.id===id?{...a,conditionPercent:pct}:a)); setEditPctId(null); }
    catch(e){ alert(e.message); }
  };

  const handleAssign = async (empId) => {
    try { await hrService.updateAsset(assignAsset.id,{assignedToId:empId}); setAssignAsset(null); load(); }
    catch(e){ alert(e.message); }
  };

  const handleUnassign = async (id) => {
    if(!confirm('¿Desvincular activo del colaborador?')) return;
    try { await hrService.updateAsset(id,{assignedToId:null}); load(); } catch(e){ alert(e.message); }
  };

  const handleDelete = async (id) => {
    if(!confirm('¿Eliminar este activo permanentemente?')) return;
    try { await hrService.deleteAsset(id); load(); } catch(e){ alert(e.message); }
  };

  const toggleSort = (key) => { if(sortKey===key) setSortDir(d=>d*-1); else { setSortKey(key); setSortDir(1); } };

  const rows = useMemo(()=>{
    const q = search.toLowerCase();
    return [...assets]
      .filter(a=>{
        const mQ = !q || a.name.toLowerCase().includes(q) || (a.serialNumber||'').toLowerCase().includes(q) || (a.assignedTo?.name||'').toLowerCase().includes(q);
        const mC = filterCat==='ALL' || a.category===filterCat;
        return mQ && mC;
      })
      .sort((a,b)=>{
        let va=a[sortKey]??'', vb=b[sortKey]??'';
        if(sortKey==='conditionPercent'){ va=a.conditionPercent??100; vb=b.conditionPercent??100; }
        if(sortKey==='assignedTo'){ va=a.assignedTo?.name??''; vb=b.assignedTo?.name??''; }
        return va<vb?-sortDir:va>vb?sortDir:0;
      });
  },[assets,search,filterCat,sortKey,sortDir]);

  const stats = useMemo(()=>({
    total:    assets.length,
    assigned: assets.filter(a=>a.status==='ASSIGNED').length,
    available:assets.filter(a=>a.status==='AVAILABLE').length,
    epp:      assets.filter(a=>a.category==='EPP').length,
  }),[assets]);

  const SortBtn = ({k,children}) => (
    <button onClick={()=>toggleSort(k)} className="flex items-center gap-1 group hover:text-primary transition-colors">
      {children}
      <ArrowUpDown className={cn('h-3 w-3 transition-colors',sortKey===k?'text-primary':'text-gray-300 group-hover:text-gray-400')}/>
    </button>
  );

  if(loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"/>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando inventario...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Activos y EPP</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Inventario de herramientas, equipos y protección personal</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all shrink-0">
          <Plus className="h-4 w-4"/> Registrar Activo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Total Activos', value:stats.total,    top:'bg-gray-400'    },
          { label:'En Uso',        value:stats.assigned, top:'bg-emerald-500' },
          { label:'Disponibles',   value:stats.available,top:'bg-blue-500'    },
          { label:'Stock EPP',     value:stats.epp,      top:'bg-amber-500'   },
        ].map(s=>(
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className={cn('h-1',s.top)}/>
            <div className="px-4 py-3">
              <p className="text-2xl font-black text-gray-900 leading-none">{s.value}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, serie o responsable..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50 transition-all"/>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['ALL',...CATEGORIES].map(c=>(
            <button key={c} onClick={()=>setFilterCat(c)}
              className={cn('px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all',
                filterCat===c?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-400 border-gray-200 hover:border-gray-400')}>
              {c==='ALL'?'Todos':c}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-8">#</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <SortBtn k="name">Activo</SortBtn>
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <SortBtn k="category">Categoría</SortBtn>
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Serie / Folio</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <SortBtn k="condition">Estado</SortBtn>
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-44">
                  <SortBtn k="conditionPercent">Condición</SortBtn>
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <SortBtn k="assignedTo">Asignado a</SortBtn>
                </th>
                <th className="text-right px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length===0&&(
                <tr><td colSpan={8} className="text-center py-16 text-gray-300">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30"/>
                  <p className="text-xs font-bold uppercase tracking-wider">Sin activos{search?' que coincidan':''}</p>
                </td></tr>
              )}
              {rows.map((a,i)=>{
                const cond   = CONDITIONS.find(c=>c.id===a.condition);
                const pct    = a.conditionPercent??100;
                const isEditingPct = editPctId===a.id;

                return (
                  <tr key={a.id} className="hover:bg-gray-50/60 transition-colors group">
                    {/* # */}
                    <td className="px-5 py-3.5 text-[11px] font-bold text-gray-300">{i+1}</td>

                    {/* Nombre + icono */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0',CAT_COLOR[a.category]||'bg-gray-100 text-gray-500')}>
                          {CAT_ICON[a.category]||<Package className="h-3.5 w-3.5"/>}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm leading-tight">{a.name}</p>
                          {a.notes&&<p className="text-[10px] text-gray-400 truncate max-w-[180px]">{a.notes}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="px-4 py-3.5">
                      <span className={cn('text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider',CAT_COLOR[a.category])}>
                        {a.category}
                      </span>
                    </td>

                    {/* Serie */}
                    <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500">
                      {a.serialNumber||<span className="text-gray-300">—</span>}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3.5">
                      {cond&&<span className={cn('text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider',cond.cls)}>{cond.label}</span>}
                    </td>

                    {/* Condición % */}
                    <td className="px-4 py-3.5">
                      {isEditingPct ? (
                        <div className="flex items-center gap-2">
                          <input type="range" min={0} max={100} step={5} defaultValue={pct}
                            className="w-24 accent-primary h-1.5 cursor-pointer"
                            onMouseUp={e=>handleUpdatePct(a.id,Number(e.target.value))}
                            onTouchEnd={e=>handleUpdatePct(a.id,Number(e.target.value))}
                            onChange={e=>setAssets(prev=>prev.map(x=>x.id===a.id?{...x,conditionPercent:Number(e.target.value)}:x))}
                          />
                          <button onClick={()=>setEditPctId(null)} className="text-gray-300 hover:text-gray-500"><X className="h-3 w-3"/></button>
                        </div>
                      ) : (
                        <button onClick={()=>setEditPctId(a.id)} title="Click para editar" className="flex items-center gap-2 group/pct">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className={cn('h-1.5 rounded-full transition-all',pctColor(pct))} style={{width:`${pct}%`}}/>
                          </div>
                          <span className={cn('text-[10px] font-black tabular-nums',pctText(pct))}>{pct}%</span>
                        </button>
                      )}
                    </td>

                    {/* Asignado a */}
                    <td className="px-4 py-3.5">
                      {a.status==='ASSIGNED'&&a.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-white font-black text-[9px] shrink-0',avatarColor(a.assignedTo.name))}>
                            {a.assignedTo.name.charAt(0)}
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 truncate max-w-[120px]">{a.assignedTo.name}</span>
                          <button onClick={()=>handleUnassign(a.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500 transition-all">
                            <X className="h-3.5 w-3.5"/>
                          </button>
                        </div>
                      ) : (
                        <button onClick={()=>setAssignAsset(a)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-primary transition-colors">
                          <UserPlus className="h-3.5 w-3.5"/> Asignar
                        </button>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={()=>openEdit(a)}
                          className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-primary hover:text-white text-gray-500 flex items-center justify-center transition-all">
                          <Edit2 className="h-3.5 w-3.5"/>
                        </button>
                        <button onClick={()=>handleDelete(a.id)}
                          className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-rose-500 hover:text-white text-gray-500 flex items-center justify-center transition-all">
                          <Trash2 className="h-3.5 w-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {rows.length>0&&(
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400">{rows.length} de {assets.length} activos</p>
          </div>
        )}
      </div>

      {/* ── Drawer: Registrar / Editar activo ──────────────────────────────── */}
      {showDrawer&&(
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={()=>setShowDrawer(false)}/>
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center',editAsset?'bg-amber-100':'bg-primary/10')}>
                  {editAsset?<Edit2 className="h-4 w-4 text-amber-600"/>:<Plus className="h-4 w-4 text-primary"/>}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">{editAsset?'Editar Activo':'Nuevo Activo'}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Inventario EPP & Herramientas</p>
                </div>
              </div>
              <button onClick={()=>setShowDrawer(false)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-gray-500"/>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <Inp label="Nombre del Activo *" value={form.name} onChange={v=>setForm({...form,name:v})} required/>
                <div className="grid grid-cols-2 gap-3">
                  <Sel label="Categoría" value={form.category} options={CATEGORIES} onChange={v=>setForm({...form,category:v})}/>
                  <Sel label="Estado Físico" value={form.condition} options={CONDITIONS.map(c=>({id:c.id,label:c.label}))} onChange={v=>setForm({...form,condition:v})}/>
                </div>
                <Inp label="Número de Serie / Folio" value={form.serialNumber} onChange={v=>setForm({...form,serialNumber:v})} placeholder="S/N-000"/>

                {/* Condición % */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Condición del activo</label>
                    <span className={cn('text-sm font-black tabular-nums',pctText(form.conditionPercent))}>{form.conditionPercent}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5} value={form.conditionPercent}
                    onChange={e=>setForm({...form,conditionPercent:Number(e.target.value)})}
                    className="w-full accent-primary h-2 cursor-pointer"/>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={cn('h-2 rounded-full transition-all',pctColor(form.conditionPercent))} style={{width:`${form.conditionPercent}%`}}/>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas / Observaciones</label>
                  <textarea rows={3} placeholder="Detalles adicionales..."
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-primary/50 transition-all resize-none placeholder:text-gray-300"
                    value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
                </div>
              </div>

              <div className="border-t px-6 py-4 flex gap-3 shrink-0">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50">
                  {saving?'Guardando...':(editAsset?'Guardar Cambios':'Registrar Activo')}
                </button>
                <button type="button" onClick={()=>setShowDrawer(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-500 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-gray-200 transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Asignar ─────────────────────────────────────────────────────── */}
      {assignAsset&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={()=>setAssignAsset(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div>
                <p className="font-black text-gray-900 text-sm">Asignar a Colaborador</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{assignAsset.name}</p>
              </div>
              <button onClick={()=>setAssignAsset(null)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500"/>
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-1.5">
              {employees.map(emp=>(
                <button key={emp.id} onClick={()=>handleAssign(emp.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-primary/5 border border-gray-100 hover:border-primary/20 text-left transition-all group">
                  <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0',avatarColor(emp.name))}>
                    {emp.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{emp.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{emp.position||'Sin cargo'}</p>
                  </div>
                  <div className="text-gray-300 group-hover:text-primary transition-colors">→</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
