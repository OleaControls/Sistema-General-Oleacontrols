import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Paginador numerado, compartido por las listas largas del sistema
 * (órdenes del técnico, gastos). Se sacó a un componente para que las dos
 * pantallas paginen igual y no haya dos implementaciones que se desincronicen.
 *
 * Uso:
 *   const { page, setPage, totalPages, slice } = usePager(items, 8);
 *   <Pager page={page} totalPages={totalPages} onChange={setPage} />
 */

// Números visibles: siempre la 1 y la última, más una ventana alrededor de la
// actual. Los huecos se colapsan en "…".
export function pageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);
  const out = [];
  let prev = 0;
  for (const p of [...pages].sort((a, b) => a - b)) {
    if (prev && p - prev > 1) out.push(`gap-${p}`);
    out.push(p);
    prev = p;
  }
  return out;
}

export default function Pager({ page, totalPages, onChange, className }) {
  if (totalPages <= 1) return null;

  const go = (p) => onChange(Math.max(1, Math.min(p, totalPages)));

  return (
    <div className={cn('flex items-center justify-center gap-1 pt-1', className)}>
      <button
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
        className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 disabled:opacity-30 hover:border-gray-300 hover:text-gray-700 transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageRange(page, totalPages).map(p =>
        typeof p === 'string' ? (
          <span key={p} className="px-0.5 text-[11px] font-black text-gray-300">…</span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 px-2 rounded-xl text-[11px] font-black tabular-nums border transition-all',
              p === page
                ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => go(page + 1)}
        disabled={page === totalPages}
        aria-label="Página siguiente"
        className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 disabled:opacity-30 hover:border-gray-300 hover:text-gray-700 transition-all"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
