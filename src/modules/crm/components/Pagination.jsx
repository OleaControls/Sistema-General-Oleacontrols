import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Genera la lista de páginas a mostrar con elipsis: 1 … 4 5 [6] 7 8 … 20
function pageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

/**
 * Paginación estilo "hojas" reutilizable para las tablas del CRM.
 *
 * @param {number}   page          página actual (1-based)
 * @param {number}   pageSize      registros por hoja
 * @param {number}   total         total de registros (ya filtrados)
 * @param {Function} onPageChange  (nuevaPagina) => void
 * @param {Function} [onPageSizeChange] (nuevoTamaño) => void — muestra el selector si se pasa
 * @param {number[]} [pageSizeOptions]
 * @param {string}   [noun]        singular del recurso, ej. "cotización"
 * @param {string}   [nounPlural]  plural del recurso, ej. "cotizaciones" (por defecto noun + "s")
 */
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50, 100],
  noun = 'registro',
  nounPlural,
}) {
  const plural = nounPlural || `${noun}s`;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  const go = (p) => onPageChange(Math.min(Math.max(1, p), totalPages));

  const btn = "flex items-center justify-center h-8 min-w-8 px-2 rounded-lg text-[10px] font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200">
      {/* Rango + selector de tamaño */}
      <div className="flex items-center gap-3">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
          {from}–{to} de {total} {total !== 1 ? plural : noun}
        </p>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Por hoja</span>
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-slate-600 outline-none focus:border-emerald-400 cursor-pointer"
            >
              {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Controles de páginas */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button className={cn(btn, "bg-white border border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white")}
            onClick={() => go(1)} disabled={page === 1} title="Primera hoja">
            <ChevronsLeft size={14} />
          </button>
          <button className={cn(btn, "bg-white border border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white")}
            onClick={() => go(page - 1)} disabled={page === 1} title="Anterior">
            <ChevronLeft size={14} />
          </button>

          {pageRange(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1 text-[10px] font-black text-slate-300">…</span>
            ) : (
              <button
                key={p}
                onClick={() => go(p)}
                className={cn(btn,
                  p === page
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100")}
              >
                {p}
              </button>
            )
          )}

          <button className={cn(btn, "bg-white border border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white")}
            onClick={() => go(page + 1)} disabled={page === totalPages} title="Siguiente">
            <ChevronRight size={14} />
          </button>
          <button className={cn(btn, "bg-white border border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white")}
            onClick={() => go(totalPages)} disabled={page === totalPages} title="Última hoja">
            <ChevronsRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
