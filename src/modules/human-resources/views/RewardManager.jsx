import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Gift, Plus, Trophy, CheckCircle2, X,
  Trash2, Zap, Users, Pencil,
} from 'lucide-react';
import { gamificationService } from '@/api/gamificationService';
import { hrService } from '@/api/hrService';
import { cn } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500'];
const avatarColor = (name='') => { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; };
const initials = (name='') => name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const fmtPts   = n => n>=1000?`${(n/1000).toFixed(1)}k`:String(n);

const RANK_CFG = {
  ELITE:    { cls:'bg-violet-100 text-violet-700 border-violet-200', label:'Elite',    top:'bg-violet-500' },
  DIAMANTE: { cls:'bg-sky-100 text-sky-700 border-sky-200',          label:'Diamante', top:'bg-sky-500'    },
  ORO:      { cls:'bg-amber-100 text-amber-700 border-amber-200',     label:'Oro',      top:'bg-amber-400'  },
  PLATA:    { cls:'bg-gray-100 text-gray-600 border-gray-200',        label:'Plata',    top:'bg-gray-400'   },
  BRONCE:   { cls:'bg-orange-100 text-orange-700 border-orange-200',  label:'Bronce',   top:'bg-orange-400' },
};

const POS_CFG = {
  1: 'bg-amber-400 text-white',
  2: 'bg-gray-300 text-gray-700',
  3: 'bg-orange-300 text-white',
};

const PERIODS = [
  { value:'month', label:'Este mes'  },
  { value:'year',  label:'Este año'  },
  { value:'all',   label:'Histórico' },
];

const EMPTY_FORM = { title:'', description:'', xpRequired:1000, status:'ACTIVE' };

// ── Componente ─────────────────────────────────────────────────────────────────
export default function RewardManager() {
  const [tab,        setTab]        = useState('REWARDS');
  const [rewards,    setRewards]    = useState([]);
  const [leaderboard,setLeaderboard]= useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [period,     setPeriod]     = useState('month');

  // Reward modal (create/edit)
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  // Assign drawer
  const [assignReward, setAssignReward] = useState(null);
  const [assignSearch, setAssignSearch] = useState('');

  const loadData = useCallback(async()=>{
    setLoading(true);
    try {
      const [r, l, emps] = await Promise.all([
        gamificationService.getRewards(),
        gamificationService.getLeaderboard(period),
        hrService.getEmployees().catch(()=>[]),
      ]);
      setRewards(r);
      setLeaderboard(l);
      const empArr = Array.isArray(emps) ? emps : emps?.employees || [];
      setEmployees(empArr);
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  },[period]);

  useEffect(()=>{ loadData(); },[loadData]);

  // Stats
  const totalWinners = useMemo(()=>rewards.reduce((s,r)=>s+(r.winners?.length||0),0),[rewards]);
  const topPlayer    = leaderboard[0];

  const openNew  = ()=>{ setEditId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = r =>{ setEditId(r.id); setForm({title:r.title,description:r.description,xpRequired:r.xpRequired,status:r.status}); setShowForm(true); };

  const handleSave = async e=>{
    e.preventDefault(); setSaving(true);
    try {
      if(editId) await gamificationService.updateReward(editId, form);
      else       await gamificationService.saveReward(form);
      setShowForm(false); await loadData();
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  const handleDelete = async id=>{
    if(!confirm('¿Eliminar este premio permanentemente?')) return;
    await gamificationService.deleteReward(id); loadData();
  };

  const handleToggleStatus = async r=>{
    await gamificationService.updateReward(r.id,{ status: r.status==='ACTIVE'?'INACTIVE':'ACTIVE' }); loadData();
  };

  const handleAssignToggle = async(rewardId, player)=>{
    const reward = rewards.find(r=>r.id===rewardId);
    const already = reward?.winners?.some(w=>w.id===player.id);
    if(already) await gamificationService.removeWinner(rewardId, player.id);
    else        await gamificationService.assignWinner(rewardId, player.id, player.name);
    loadData();
  };

  // Todos los colaboradores como candidatos, ordenados por nombre dentro de cada área
  const allCandidates = useMemo(()=>
    employees.map(e=>({
      id:         e.id,
      name:       e.name,
      avatar:     e.avatar || null,
      position:   e.position || '',
      department: e.department || 'Sin área',
    })).sort((a,b)=>a.name.localeCompare(b.name))
  ,[employees]);

  // Candidatos filtrados por búsqueda
  const filteredCandidates = useMemo(()=>{
    if(!assignSearch) return allCandidates;
    const q = assignSearch.toLowerCase();
    return allCandidates.filter(p=>
      p.name.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q)
    );
  },[allCandidates, assignSearch]);

  // Agrupados por departamento/área
  const candidateGroups = useMemo(()=>{
    const map = {};
    filteredCandidates.forEach(p=>{
      const key = p.department || 'Sin área';
      (map[key] ??= []).push(p);
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
  },[filteredCandidates]);

  const handleAssignAll = async(rewardId, group)=>{
    const reward = rewards.find(r=>r.id===rewardId);
    const winners = reward?.winners || [];
    const allAssigned = group.every(p=>winners.some(w=>w.id===p.id));
    if(allAssigned){
      for(const p of group) await gamificationService.removeWinner(rewardId, p.id);
    } else {
      for(const p of group) if(!winners.some(w=>w.id===p.id)) await gamificationService.assignWinner(rewardId, p.id, p.name);
    }
    const updated = await gamificationService.getRewards();
    setRewards(updated);
    setAssignReward(updated.find(r=>r.id===rewardId)||null);
  };

  const TABS = [
    { id:'REWARDS', label:'Premios'                                  },
    { id:'RANKING', label:`Ranking${leaderboard.length?` (${leaderboard.length})`:''}`},
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Incentivos y Premios</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Ranking operativo basado en OTs completadas y calidad de servicio</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <Plus className="h-4 w-4"/> Crear Premio
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Premios Activos',   value: rewards.filter(r=>r.status==='ACTIVE').length, top:'bg-primary'      },
          { label:'Ganadores Asignados',value:totalWinners,                                  top:'bg-amber-400'    },
          { label:'Colaboradores',       value: employees.length,                              top:'bg-emerald-500'  },
          { label:'Top Scorer',        value: topPlayer?`${fmtPts(topPlayer.lifetimePoints)} pts`:'—', top:'bg-violet-500', sub: topPlayer?.name },
        ].map(s=>(
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className={cn('h-1',s.top)}/>
            <div className="px-4 py-3">
              <p className="text-xl font-black text-gray-900 leading-none truncate">{s.value}</p>
              {s.sub&&<p className="text-[9px] font-bold text-gray-500 truncate mt-0.5">{s.sub}</p>}
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 gap-1">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={cn('px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap',
              tab===t.id?'border-primary text-primary':'border-transparent text-gray-400 hover:text-gray-600')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Premios ──────────────────────────────────────────────────────── */}
      {tab==='REWARDS'&&(
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading?(
            <div className="divide-y">{[1,2,3].map(i=>(
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="h-8 w-8 bg-gray-100 rounded-xl shrink-0"/>
                <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/3"/><div className="h-2 bg-gray-100 rounded w-1/4"/></div>
              </div>
            ))}</div>
          ):rewards.length===0?(
            <div className="text-center py-16">
              <Gift className="h-8 w-8 text-gray-200 mx-auto mb-2"/>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sin premios creados</p>
              <button onClick={openNew} className="mt-4 text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Crear primer premio</button>
            </div>
          ):(
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-5 py-3 text-left">Premio</th>
                  <th className="px-4 py-3 text-left">XP Req.</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Ganadores</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rewards.map(r=>(
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Gift className="h-4 w-4 text-primary"/>
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm leading-tight">{r.title}</p>
                          {r.description&&<p className="text-[10px] text-gray-400 mt-0.5 italic truncate max-w-[220px]">"{r.description}"</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg w-fit">
                        <Zap className="h-3 w-3"/> {(r.xpRequired||0).toLocaleString()} pts
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={()=>handleToggleStatus(r)} title={r.status==='ACTIVE'?'Desactivar':'Activar'}
                        className={cn('text-[9px] font-black px-2.5 py-1 rounded-lg border transition-all',
                          r.status==='ACTIVE'?'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200':'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200')}>
                        {r.status==='ACTIVE'?'Activo':'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(r.winners||[]).length===0?(
                          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Sin asignar</span>
                        ):(r.winners||[]).map(w=>(
                          <span key={w.id} title={w.name} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-md border border-emerald-100">
                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0"/>{w.name.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={()=>{ setAssignReward(r); setAssignSearch(''); }}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all">
                          <Users className="h-3.5 w-3.5"/> Asignar
                        </button>
                        <button onClick={()=>openEdit(r)}
                          className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-all">
                          <Pencil className="h-3.5 w-3.5"/>
                        </button>
                        <button onClick={()=>handleDelete(r.id)}
                          className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-rose-500 hover:text-white text-gray-500 flex items-center justify-center transition-all">
                          <Trash2 className="h-3.5 w-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: Ranking ──────────────────────────────────────────────────────── */}
      {tab==='RANKING'&&(
        <div className="space-y-3">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            {PERIODS.map(p=>(
              <button key={p.value} onClick={()=>setPeriod(p.value)}
                className={cn('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  period===p.value?'bg-primary text-white shadow-sm':'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50')}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {loading?(
              <div className="divide-y">{[1,2,3,4,5].map(i=>(
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="h-6 w-6 bg-gray-100 rounded-lg shrink-0"/>
                  <div className="h-8 w-8 bg-gray-100 rounded-xl shrink-0"/>
                  <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/4"/><div className="h-2 bg-gray-100 rounded w-1/5"/></div>
                  <div className="h-3 bg-gray-100 rounded w-16"/>
                </div>
              ))}</div>
            ):leaderboard.length===0?(
              <div className="text-center py-16">
                <Trophy className="h-8 w-8 text-gray-200 mx-auto mb-2"/>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sin datos de ranking para este período</p>
              </div>
            ):(
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-5 py-3 text-left w-12">#</th>
                    <th className="px-4 py-3 text-left">Colaborador</th>
                    <th className="px-4 py-3 text-left">Rango</th>
                    <th className="px-4 py-3 text-left">Puntos (período)</th>
                    <th className="px-4 py-3 text-left">Pts Totales</th>
                    <th className="px-4 py-3 text-left">OTs</th>
                    <th className="px-4 py-3 text-left">Progreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaderboard.map((p,i)=>{
                    const rank=RANK_CFG[p.rank]||RANK_CFG.BRONCE;
                    const posN=i+1;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className={cn('h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black',
                            POS_CFG[posN]||'bg-gray-100 text-gray-500')}>
                            {posN}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {p.avatar?(
                              <img src={p.avatar} alt={p.name} className="h-8 w-8 rounded-xl object-cover shrink-0 border border-gray-100"/>
                            ):(
                              <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center text-white font-black text-[10px] shrink-0',avatarColor(p.name))}>
                                {initials(p.name)}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-black text-gray-900 leading-none">{p.name}</p>
                              <p className="text-[9px] font-bold text-gray-400 mt-0.5">{p.position||'Técnico'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-md border uppercase',rank.cls)}>
                            {rank.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="flex items-center gap-1 text-xs font-black text-gray-800">
                            <Zap className="h-3 w-3 text-amber-400"/> {(p.points||0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[11px] font-bold text-gray-500">{(p.lifetimePoints||0).toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          <div>
                            <span className="text-xs font-black text-gray-800">{p.totalOTs||0}</span>
                            <span className="text-[9px] text-gray-400 font-bold ml-1">({p.leadOTs||0}L · {p.supportOTs||0}A)</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 min-w-[120px]">
                          {p.nextRank?(
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-gray-400 uppercase">→ {p.nextRank}</span>
                                <span className="text-[8px] font-black text-gray-500">{p.rankProgress}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full transition-all',rank.top)} style={{width:`${p.rankProgress||0}%`}}/>
                              </div>
                            </div>
                          ):(
                            <span className="text-[9px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">Elite Max</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Drawer: Asignar Ganadores ────────────────────────────────────────── */}
      {assignReward&&(
        <div className="fixed inset-0 z-50 flex" onClick={()=>setAssignReward(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
          <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e=>e.stopPropagation()}>
            {/* Drawer header */}
            <div className="px-6 py-5 border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Asignar Ganadores</p>
                  <p className="font-black text-gray-900 text-sm leading-tight">{assignReward.title}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Zap className="h-3 w-3 text-amber-400"/>
                    <span className="text-[10px] font-bold text-gray-500">{(assignReward.xpRequired||0).toLocaleString()} pts requeridos</span>
                  </div>
                </div>
                <button onClick={()=>setAssignReward(null)} className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors">
                  <X className="h-4 w-4 text-gray-500"/>
                </button>
              </div>
              <input value={assignSearch} onChange={e=>setAssignSearch(e.target.value)} placeholder="Buscar colaborador..."
                className="mt-3 w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-primary/50 bg-gray-50"/>
            </div>

            {/* Ganadores actuales */}
            {(assignReward.winners||[]).length>0&&(
              <div className="px-6 pt-4 pb-2">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Ganadores asignados ({assignReward.winners.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {assignReward.winners.map(w=>(
                    <span key={w.id} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="h-3 w-3"/>
                      {w.name.split(' ')[0]}
                      <button onClick={async()=>{ await handleAssignToggle(assignReward.id,{id:w.id}); const updated=await gamificationService.getRewards(); setAssignReward(updated.find(r=>r.id===assignReward.id)||null); setRewards(updated); }}
                        className="ml-0.5 hover:text-rose-600 transition-colors"><X className="h-2.5 w-2.5"/></button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Candidatos agrupados por área */}
            <div className="flex-1 overflow-y-auto pb-6">
              {candidateGroups.length===0?(
                <div className="text-center py-12">
                  <Users className="h-6 w-6 text-gray-200 mx-auto mb-2"/>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Sin resultados</p>
                </div>
              ):candidateGroups.map(([dept, members])=>{
                const winners = assignReward.winners||[];
                const allInGroup = members.every(p=>winners.some(w=>w.id===p.id));
                const someInGroup = members.some(p=>winners.some(w=>w.id===p.id));
                return (
                  <div key={dept}>
                    {/* Cabecera de categoría */}
                    <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50 border-y border-gray-100 sticky top-0 z-10">
                      <div className="flex items-center gap-2">
                        <div className={cn('h-1.5 w-1.5 rounded-full', allInGroup?'bg-emerald-500':someInGroup?'bg-amber-400':'bg-gray-300')}/>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{dept}</p>
                        <span className="text-[9px] font-bold text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded-md">
                          {members.filter(p=>winners.some(w=>w.id===p.id)).length}/{members.length}
                        </span>
                      </div>
                      <button
                        onClick={async()=>{ await handleAssignAll(assignReward.id, members); }}
                        className={cn('text-[9px] font-black px-2.5 py-1 rounded-lg border transition-all',
                          allInGroup
                            ?'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-rose-100 hover:text-rose-600 hover:border-rose-200'
                            :'bg-white text-gray-500 border-gray-200 hover:bg-primary/10 hover:text-primary hover:border-primary/30')}>
                        {allInGroup?'Quitar todos':'Todos'}
                      </button>
                    </div>
                    {/* Miembros */}
                    <div className="px-3 py-1 space-y-0.5">
                      {members.map(p=>{
                        const isWinner = winners.some(w=>w.id===p.id);
                        return (
                          <div key={p.id}
                            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer',
                              isWinner?'bg-emerald-50':'hover:bg-gray-50')}
                            onClick={async()=>{
                              await handleAssignToggle(assignReward.id, p);
                              const updated = await gamificationService.getRewards();
                              setRewards(updated);
                              setAssignReward(updated.find(r=>r.id===assignReward.id)||null);
                            }}>
                            {/* Avatar */}
                            {p.avatar?(
                              <img src={p.avatar} alt={p.name} className="h-8 w-8 rounded-xl object-cover shrink-0 border border-gray-100"/>
                            ):(
                              <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center text-white font-black text-[10px] shrink-0',avatarColor(p.name))}>
                                {initials(p.name)}
                              </div>
                            )}
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-gray-900 truncate leading-tight">{p.name}</p>
                              {p.position&&<p className="text-[9px] font-bold text-gray-400 truncate mt-0.5">{p.position}</p>}
                            </div>
                            {/* Check */}
                            <div className={cn('h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all',
                              isWinner?'bg-emerald-500 text-white':'bg-gray-100 text-gray-300')}>
                              <CheckCircle2 className="h-3.5 w-3.5"/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Crear / Editar Premio ─────────────────────────────────────── */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setShowForm(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Gift className="h-4 w-4 text-primary"/></div>
                <p className="font-black text-gray-900 text-sm">{editId?'Editar Premio':'Nuevo Premio'}</p>
              </div>
              <button onClick={()=>setShowForm(false)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><X className="h-4 w-4 text-gray-500"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <MF label="Nombre del Premio">
                <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ej. Bono Excelencia Q2" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
              </MF>
              <MF label="Descripción / Meta">
                <textarea rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Criterio o meta para ganar este premio..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50 resize-none"/>
              </MF>
              <div className="grid grid-cols-2 gap-3">
                <MF label="Puntos Requeridos">
                  <input type="number" min="0" value={form.xpRequired} onChange={e=>setForm(f=>({...f,xpRequired:parseInt(e.target.value)||0}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
                </MF>
                <MF label="Estado">
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50">
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </MF>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">{saving?'Guardando...':(editId?'Actualizar':'Publicar')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MF({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}
