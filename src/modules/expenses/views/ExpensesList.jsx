import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Receipt, ChevronRight, ChevronDown, CloudOff,
  AlertTriangle, X, Download, ClipboardList, Wallet, Layers, List
} from 'lucide-react';
import { expenseService } from '@/api/expenseService';
import { otService } from '@/api/otService';
import { cn } from '@/lib/utils';
import { useAuth, ROLES } from '@/store/AuthContext';
import NewExpenseForm from '../components/NewExpenseForm';
import Pager from '@/components/shared/Pager';

const money = (n) =>
  `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// El servidor crea todo como PENDING; SUBMITTED y DRAFT quedan de datos viejos.
const STATUS_META = {
  PENDING:    { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700' },
  SUBMITTED:  { label: 'Enviado',    cls: 'bg-blue-100 text-blue-700' },
  DRAFT:      { label: 'Borrador',   cls: 'bg-gray-100 text-gray-700' },
  APPROVED:   { label: 'Aprobado',   cls: 'bg-green-100 text-green-700' },
  REJECTED:   { label: 'Rechazado',  cls: 'bg-red-100 text-red-700' },
  REIMBURSED: { label: 'Reembolsado', cls: 'bg-emerald-100 text-emerald-700' },
};
const statusMeta = (s) => STATUS_META[s] || { label: s || '—', cls: 'bg-gray-100 text-gray-700' };

// El filtro apuntaba a SUBMITTED, que el servidor nunca escribe: la pestaña
// "Pendientes" salía siempre vacía.
const FILTERS = [
  { id: 'ALL',      label: 'Todos' },
  { id: 'PENDING',  label: 'Pendientes' },
  { id: 'APPROVED', label: 'Aprobados' },
  { id: 'REJECTED', label: 'Rechazados' },
];

const SIN_OT = '__SIN_OT__';

// Cuánto se muestra de golpe. Sin esto la pantalla se vuelve un scroll sin fin.
const GROUPS_PER_PAGE = 4;   // órdenes por página en la vista "Por OT"
const ROWS_PER_PAGE = 8;     // gastos por página en la vista cronológica
const ROWS_PER_GROUP = 6;    // gastos visibles dentro de una OT antes de "ver más"

// ── Renglón de gasto ────────────────────────────────────────────────────────
// Dos líneas: descripción + importe arriba, metadatos abajo. Antes eran tres
// líneas con etiquetas repetidas y ocupaba casi el doble.
function ExpenseRow({ exp, showOT, isOverLimit, onEdit, onReceipt }) {
  const st = statusMeta(exp.status);
  const fecha = new Date(exp.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  return (
    <div
      onClick={() => onEdit(exp)}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer',
        isOverLimit
          ? 'border-red-100 bg-red-50/40 hover:border-red-200'
          : 'border-gray-100 bg-white hover:border-primary/30 hover:shadow-sm'
      )}
    >
      <div
        onClick={(e) => { if (exp.receipt) { e.stopPropagation(); onReceipt(exp.receipt); } }}
        title={exp.receipt ? 'Ver ticket' : 'Sin ticket'}
        className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
          exp.receipt
            ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
            : 'bg-gray-50 text-gray-300'
        )}
      >
        <Receipt className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="flex-1 min-w-0 text-[12px] font-bold text-gray-900 truncate">
            {exp.description || 'Sin descripción'}
          </p>
          <p className={cn(
            'text-[13px] font-black tabular-nums shrink-0',
            exp.status === 'REJECTED' ? 'text-gray-300 line-through' : isOverLimit ? 'text-red-600' : 'text-gray-900'
          )}>
            {money(exp.amount)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <span className={cn('text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0', st.cls)}>
            {st.label}
          </span>
          {showOT && exp.otId && (
            <span className="text-[9px] font-black text-primary uppercase tracking-wider shrink-0">{exp.otId}</span>
          )}
          {exp.pendingSync && (
            <span className="flex items-center gap-0.5 text-[8px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-100 shrink-0">
              <CloudOff className="h-2.5 w-2.5" /> Offline
            </span>
          )}
          <span className="text-[9px] font-bold text-gray-400 truncate">
            {exp.category ? `${exp.category} · ` : ''}{fecha} · {(exp.paymentMethod || 'CASH').replace('_', ' ')}
          </span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-primary transition-colors shrink-0" />
    </div>
  );
}

// ── Grupo de una OT ─────────────────────────────────────────────────────────
function OTGroup({ group, open, onToggle, onEdit, onReceipt }) {
  const [showAll, setShowAll] = useState(false);
  const fin = group.financials;
  const hasFund = fin && fin.assignedFunds > 0;
  const usedPct = hasFund ? Math.min(100, Math.round((fin.totalSpent / fin.assignedFunds) * 100)) : 0;
  const over = !!fin?.isOverLimit;
  const sinOt = group.key === SIN_OT;

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all',
      over ? 'border-red-200 bg-red-50/20' : 'border-gray-100 bg-white'
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/70 transition-colors"
      >
        <div className={cn(
          'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
          sinOt ? 'bg-gray-100 text-gray-400' : over ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
        )}>
          {sinOt ? <Wallet className="h-5 w-5" /> : over ? <AlertTriangle className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-[11px] font-black uppercase tracking-wider',
              sinOt ? 'text-gray-500' : 'text-gray-900'
            )}>
              {sinOt ? 'Gastos sin OT' : group.otId}
            </span>
            {over && (
              <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                Excede fondo
              </span>
            )}
          </div>
          {group.title && <p className="text-[11px] font-bold text-gray-400 truncate">{group.title}</p>}
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-0.5 tabular-nums">
            {group.items.length} gasto{group.items.length === 1 ? '' : 's'} · {money(group.total)}
          </p>
        </div>

        <ChevronDown className={cn('h-4 w-4 text-gray-300 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {/* Fondo asignado a la OT: cuánto se lleva gastado del total autorizado */}
      {hasFund && (
        <div className="px-4 pb-3">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-wider mb-1">
            <span className="text-gray-400">Fondo de la OT</span>
            <span className={cn('tabular-nums', over ? 'text-red-600' : 'text-gray-500')}>
              {money(fin.totalSpent)} de {money(fin.assignedFunds)}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : usedPct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className={cn('text-[9px] font-black uppercase tracking-wider mt-1 tabular-nums', over ? 'text-red-600' : 'text-gray-400')}>
            {over ? `Sobregiro de ${money(Math.abs(fin.balance))}` : `Saldo ${money(fin.balance)}`}
          </p>
        </div>
      )}

      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {(showAll ? group.items : group.items.slice(0, ROWS_PER_GROUP)).map(exp => (
            <ExpenseRow
              key={exp.id}
              exp={exp}
              showOT={false}
              isOverLimit={over && exp.status !== 'REJECTED'}
              onEdit={onEdit}
              onReceipt={onReceipt}
            />
          ))}
          {group.items.length > ROWS_PER_GROUP && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full py-2 rounded-xl border border-dashed border-gray-200 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:border-gray-300 hover:text-gray-600 transition-all"
            >
              {showAll
                ? 'Ver menos'
                : `Ver los ${group.items.length - ROWS_PER_GROUP} gastos restantes`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExpensesList({ otId = null, hideHeader = false, refreshTrigger = 0 }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [otFinancials, setOtFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  // Dentro de una OT no tiene sentido agrupar por OT: siempre es la misma.
  const [groupByOT, setGroupByOT] = useState(!otId);
  const [openGroups, setOpenGroups] = useState({});
  const [page, setPage] = useState(1);
  const listRef = useRef(null);

  useEffect(() => {
    loadExpenses();
    /* eslint-disable-next-line */
  }, [otId, refreshTrigger]);

  const loadExpenses = async () => {
    setLoading(true);
    const [data, financials] = await Promise.all([
      expenseService.getAll(),
      otId ? otService.getOTFinancials(otId) : Promise.resolve(null)
    ]);

    setOtFinancials(financials);
    const baseData = otId ? data.filter(e => e.otId === otId) : data;
    const myData = (user.role === ROLES.ADMIN || user.role === ROLES.OPS) ? baseData : baseData.filter(e => e.userId === user.id);
    setExpenses(myData);
    setLoading(false);
  };

  const handleSaveExpense = async (formData, isUpdate = false) => {
    try {
      if (isUpdate && editingExpense) {
        await expenseService.update(editingExpense.id, {
          ...formData,
          amount: parseFloat(formData.amount)
        });
      } else {
        await expenseService.save({
          ...formData,
          userId: user.id,
          tenantId: 'olea-mx',
          amount: parseFloat(formData.amount)
        });
      }
      loadExpenses();
      setEditingExpense(null);
    } catch (error) {
      alert(`Error al guardar el gasto: ${error.message}`);
    }
  };

  const handleEditClick = (exp) => {
    if (['DRAFT', 'SUBMITTED', 'REJECTED', 'PENDING'].includes(exp.status)) {
      setEditingExpense(exp);
      setFormOpen(true);
    } else {
      alert('No se puede editar un gasto que ya ha sido aprobado o reembolsado.');
    }
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingExpense(null);
  };

  const filteredExpenses = filter === 'ALL'
    ? expenses
    : expenses.filter(e => e.status === filter);

  // Resumen: los rechazados no suman, no son dinero comprometido.
  const summary = useMemo(() => {
    const valid = filteredExpenses.filter(e => e.status !== 'REJECTED');
    return {
      count: filteredExpenses.length,
      total: valid.reduce((a, e) => a + (e.amount || 0), 0),
      ots: new Set(filteredExpenses.filter(e => e.otId).map(e => e.otId)).size,
    };
  }, [filteredExpenses]);

  // Agrupación por OT. Los gastos externos (sin OT) van juntos al final.
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of filteredExpenses) {
      const key = e.otId || SIN_OT;
      if (!map.has(key)) {
        map.set(key, {
          key,
          otId: e.otId || null,
          title: e.workOrder?.title || null,
          financials: e.financials || null,
          items: [],
          total: 0,
          lastDate: 0,
        });
      }
      const g = map.get(key);
      g.items.push(e);
      if (e.status !== 'REJECTED') g.total += e.amount || 0;
      const t = new Date(e.createdAt).getTime();
      if (t > g.lastDate) g.lastDate = t;
      if (!g.financials && e.financials) g.financials = e.financials;
    }
    return [...map.values()].sort((a, b) => {
      if (a.key === SIN_OT) return 1;
      if (b.key === SIN_OT) return -1;
      return b.lastDate - a.lastDate;
    });
  }, [filteredExpenses]);

  // Solo el primer grupo abierto: así la vista arranca como índice de OTs.
  const isOpen = (key, idx) => openGroups[key] ?? idx === 0;
  const allOpen = groups.length > 0 && groups.every((g, i) => isOpen(g.key, i));
  const setAll = (v) => setOpenGroups(Object.fromEntries(groups.map(g => [g.key, v])));

  // ── Paginación ─────────────────────────────────────────────────────────────
  // En "Por OT" se paginan las órdenes; en cronológico, los gastos.
  const perPage = groupByOT ? GROUPS_PER_PAGE : ROWS_PER_PAGE;
  const source = groupByOT ? groups : filteredExpenses;
  const totalPages = Math.max(1, Math.ceil(source.length / perPage));
  // Si un filtro deja menos páginas de las que había, no dejar la vista vacía.
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * perPage;
  const pageSlice = source.slice(from, from + perPage);

  const goPage = (p) => {
    setPage(p);
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const changeFilter = (id) => { setFilter(id); setPage(1); };
  const changeMode = (v) => { setGroupByOT(v); setPage(1); };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header Acciones */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mis Gastos</h2>
            <p className="text-sm text-gray-500">Gestiona tus reembolsos y gastos operativos.</p>
          </div>
          <button
            onClick={() => { setEditingExpense(null); setFormOpen(true); }}
            className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus className="h-5 w-5" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      )}

      <NewExpenseForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={handleSaveExpense}
        initialData={editingExpense}
        prefilledOtId={otId}
      />

      {/* Resumen de lo que se está viendo */}
      {!loading && filteredExpenses.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: money(summary.total), accent: 'text-gray-900' },
            { label: 'Gastos', value: summary.count, accent: 'text-gray-900' },
            { label: 'Órdenes', value: summary.ots, accent: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl px-3 py-3 text-center">
              <p className={cn('text-base font-black leading-none tabular-nums truncate', s.accent)}>{s.value}</p>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros + modo de vista */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => changeFilter(f.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-[11px] font-black border transition-all whitespace-nowrap',
              filter === f.id
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            )}
          >
            {f.label}
          </button>
        ))}

        {!otId && (
          <div className="ml-auto flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => changeMode(true)}
              title="Agrupar por orden de trabajo"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                groupByOT ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Layers className="h-3.5 w-3.5" /> Por OT
            </button>
            <button
              onClick={() => changeMode(false)}
              title="Lista cronológica"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                !groupByOT ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <List className="h-3.5 w-3.5" /> Fecha
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Receipt className="h-9 w-9 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
            No se encontraron gastos con este filtro.
          </p>
        </div>
      ) : (
        <div ref={listRef} className="scroll-mt-3 space-y-3">
          {/* Qué tramo se está viendo del total */}
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest tabular-nums">
              {from + 1}–{Math.min(from + perPage, source.length)} de {source.length}{' '}
              {groupByOT ? (source.length === 1 ? 'orden' : 'órdenes') : 'gastos'}
            </p>
            {groupByOT && groups.length > 1 && (
              <button
                onClick={() => setAll(!allOpen)}
                className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors shrink-0"
              >
                {allOpen ? 'Contraer todo' : 'Expandir todo'}
              </button>
            )}
          </div>

          {groupByOT ? (
            pageSlice.map((g) => {
              const idx = groups.indexOf(g);
              return (
                <OTGroup
                  key={g.key}
                  group={g}
                  open={isOpen(g.key, idx)}
                  onToggle={() => setOpenGroups(o => ({ ...o, [g.key]: !isOpen(g.key, idx) }))}
                  onEdit={handleEditClick}
                  onReceipt={setSelectedImage}
                />
              );
            })
          ) : (
            <div className="space-y-1.5">
              {pageSlice.map(exp => (
                <ExpenseRow
                  key={exp.id}
                  exp={exp}
                  showOT
                  isOverLimit={(exp.financials?.isOverLimit || otFinancials?.isOverLimit) && exp.status !== 'REJECTED'}
                  onEdit={handleEditClick}
                  onReceipt={setSelectedImage}
                />
              ))}
            </div>
          )}

          <Pager page={safePage} totalPages={totalPages} onChange={goPage} />
        </div>
      )}

      {/* Modal de Previsualización de Imagen */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-4">
            {selectedImage.toLowerCase().endsWith('.pdf') || selectedImage.startsWith('data:application/pdf') ? (
              <iframe src={selectedImage} className="w-full h-[80vh] rounded-3xl bg-white" title="PDF Evidence" />
            ) : (
              <img src={selectedImage} className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl object-contain border-4 border-white/10" alt="Evidencia de Gasto" />
            )}
            <div className="flex gap-4">
              <a
                href={selectedImage}
                download={`Evidencia_Gasto_${new Date().getTime()}`}
                className="bg-white text-gray-900 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2 shadow-xl"
              >
                <Download className="h-4 w-4" /> Descargar Archivo
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
