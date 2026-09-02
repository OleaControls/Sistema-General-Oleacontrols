import React, { useEffect, useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, ExternalLink, Download,
  FileText, Image as ImageIcon, ShieldCheck, ShieldAlert, FileX2,
} from 'lucide-react';
import { DOC_STATUS } from '@/lib/fieldDocs';
import { cn } from '@/lib/utils';

/* Pestaña lateral con el expediente de campo del propio técnico: la lista de
   documentos y, al tocar uno, su visor sin salir de la pantalla de órdenes.
   Solo lectura: quien carga y renueva es el supervisor (HR → Docs. de Campo). */

const fmt = (d) => d
  ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  : null;

/** El archivo puede venir como URL firmada de R2 (con query) o como data-URI. */
const esPdf = (url = '') => {
  const s = String(url);
  return s.startsWith('data:application/pdf') || s.split('?')[0].toLowerCase().endsWith('.pdf');
};

export default function MisDocsDrawer({ abierto, onClose, resumen }) {
  const [verDoc, setVerDoc] = useState(null); // item del resumen que se está viendo

  // Al cerrar la pestaña se olvida el documento abierto.
  useEffect(() => { if (!abierto) setVerDoc(null); }, [abierto]);

  // Escape retrocede: primero cierra el visor, luego la pestaña.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (verDoc) setVerDoc(null); else onClose();
    };
    window.addEventListener('keydown', onKey);
    const scrollPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = scrollPrevio;
    };
  }, [abierto, verDoc, onClose]);

  if (!abierto) return null;

  const items = resumen?.items || [];
  const vigentes = items.filter(i => i.status === 'VIGENTE').length;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      />

      <aside className="relative w-full sm:max-w-lg h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* ── Encabezado ── */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 shrink-0">
          {verDoc ? (
            <button
              type="button"
              onClick={() => setVerDoc(null)}
              aria-label="Volver a la lista"
              className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            resumen?.alerta
              ? <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
              : <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest truncate">
              {verDoc ? verDoc.label : 'Mis documentos'}
            </p>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5 truncate">
              {verDoc
                ? [
                    verDoc.doc?.issuedAt && `Expedido ${fmt(verDoc.doc.issuedAt)}`,
                    verDoc.doc?.expiresAt ? `Vence ${fmt(verDoc.doc.expiresAt)}` : 'Sin vencimiento',
                  ].filter(Boolean).join(' · ')
                : `${vigentes} de ${items.length} vigentes`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {verDoc ? (
          /* ── Visor ── */
          <>
            <div className="flex-1 min-h-0 bg-gray-100">
              {esPdf(verDoc.doc.url) ? (
                <iframe
                  src={verDoc.doc.url}
                  title={verDoc.label}
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="h-full overflow-auto p-4 flex items-start justify-center">
                  <img
                    src={verDoc.doc.url}
                    alt={verDoc.label}
                    className="max-w-full rounded-2xl shadow-sm bg-white"
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 shrink-0">
              <a
                href={verDoc.doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir aparte
              </a>
              <a
                href={verDoc.doc.url}
                download={`${verDoc.key}.${esPdf(verDoc.doc.url) ? 'pdf' : 'jpg'}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest hover:border-gray-400 hover:text-gray-900 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Descargar
              </a>
            </div>
          </>
        ) : (
          /* ── Lista ── */
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-[10px] font-medium text-gray-400 leading-relaxed mb-4">
              Estos son los documentos que la tienda te pide vigentes. Los carga y
              renueva tu supervisor; aquí solo los consultas.
            </p>

            <div className="space-y-2">
              {items.map(item => {
                const meta = DOC_STATUS[item.status];
                const tieneArchivo = !!item.doc?.url;
                const Icono = !tieneArchivo ? FileX2 : esPdf(item.doc.url) ? FileText : ImageIcon;

                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={!tieneArchivo}
                    onClick={() => setVerDoc(item)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-colors',
                      tieneArchivo
                        ? 'border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50/60'
                        : 'border-dashed border-gray-200 bg-gray-50/60 cursor-default'
                    )}
                  >
                    <Icono className={cn('h-4 w-4 shrink-0', tieneArchivo ? 'text-gray-400' : 'text-gray-300')} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-black truncate', tieneArchivo ? 'text-gray-900' : 'text-gray-400')}>
                        {item.label}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5 truncate">
                        {tieneArchivo
                          ? (item.doc.expiresAt ? `Vence ${fmt(item.doc.expiresAt)}` : 'Sin vencimiento')
                          : 'Pídeselo a tu supervisor'}
                      </p>
                    </div>
                    <span className={cn(
                      'shrink-0 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border',
                      meta.cls
                    )}>
                      {meta.label}
                    </span>
                    {tieneArchivo && <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
