import React from 'react';
import { ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { resumenExpediente, DOC_STATUS } from '@/lib/fieldDocs';
import { cn } from '@/lib/utils';

/* Semáforo de la documentación que la cuadrilla necesita para entrar a sitio.
   Es informativo: por decisión del negocio NO bloquea aceptar ni iniciar la
   orden, solo hace visible lo que falta o venció. */

const fmt = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : null;

export default function FieldDocsAlert({ tecnicos = [], cargando }) {
  if (cargando || tecnicos.length === 0) return null;

  const resumenes = tecnicos.map(t => ({ tecnico: t, resumen: resumenExpediente(t.docs || []) }));
  const conAlerta = resumenes.filter(r => r.resumen.alerta);
  const porVencer = resumenes.filter(r => !r.resumen.alerta && r.resumen.porVencer > 0);
  const todoBien  = conAlerta.length === 0 && porVencer.length === 0;

  return (
    <div className={cn(
      'rounded-[1.75rem] border overflow-hidden shadow-sm',
      conAlerta.length > 0 ? 'bg-white border-red-200' : 'bg-white border-gray-100'
    )}>
      <div className={cn(
        'px-7 py-5 border-b flex items-center gap-3',
        conAlerta.length > 0 ? 'border-red-50 bg-red-50/50' : 'border-gray-50'
      )}>
        {conAlerta.length > 0
          ? <ShieldAlert className="h-4 w-4 text-red-500" />
          : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'text-[10px] font-black uppercase tracking-widest',
            conAlerta.length > 0 ? 'text-red-700' : 'text-gray-700'
          )}>
            Documentación para entrar a campo
          </h3>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
            {todoBien
              ? 'Toda la cuadrilla está en regla'
              : conAlerta.length > 0
                ? `${conAlerta.length} de ${resumenes.length} con documentos faltantes o vencidos`
                : `${porVencer.length} con documentos por vencer`}
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {resumenes.map(({ tecnico, resumen }) => {
          const problemas = resumen.items.filter(i => i.required && i.status !== 'VIGENTE');
          const avisos    = resumen.items.filter(i => !i.required && i.status === 'VENCIDO');
          const listado   = [...problemas, ...avisos];

          return (
            <div key={tecnico.id} className="px-7 py-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-black text-xs shrink-0 overflow-hidden">
                  {tecnico.avatar
                    ? <img src={tecnico.avatar} alt={tecnico.name} className="w-full h-full object-cover" />
                    : (tecnico.name?.charAt(0)?.toUpperCase() || '?')}
                </div>
                <p className="text-sm font-black text-gray-900 flex-1 min-w-0 truncate">{tecnico.name}</p>
                {listado.length === 0 && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200">
                    En regla
                  </span>
                )}
              </div>

              {listado.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 pl-11">
                  {listado.map(item => {
                    const meta = DOC_STATUS[item.status];
                    const vence = fmt(item.doc?.expiresAt);
                    return (
                      <span
                        key={item.key}
                        title={vence ? `Vence el ${vence}` : undefined}
                        className={cn('inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border', meta.cls)}
                      >
                        {item.label}
                        <span className="font-bold normal-case tracking-normal opacity-70">
                          · {meta.label}{vence && item.status !== 'FALTANTE' ? ` ${vence}` : ''}
                        </span>
                        {item.doc?.url && (
                          <a href={item.doc.url} target="_blank" rel="noopener noreferrer" className="ml-0.5">
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
