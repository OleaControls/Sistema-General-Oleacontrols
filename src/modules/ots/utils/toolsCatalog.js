import {
  Gauge, Wrench, Zap, Scissors, Ruler, Briefcase, Hammer, Layers,
} from 'lucide-react';

/**
 * Catálogo único de herramientas del técnico.
 *
 * Vive aparte porque lo usan dos pantallas que ya no comparten flujo: el
 * técnico lo llena en su perfil (/profile → Herramientas) cuando cambia su
 * herramienta, y Operaciones lo lee en el panel de asistencia. Antes estaba
 * dentro del checklist diario; se sacó de ahí para no obligar a capturarlo
 * todos los días.
 */
export const TOOLS_ITEMS = [
  { key: 'multimetro',       label: 'Multímetro',                        icon: Gauge     },
  { key: 'desPlanoChico',    label: 'Desarmador plano chico',            icon: Wrench    },
  { key: 'desPlanoMed',      label: 'Desarmador plano mediano',          icon: Wrench    },
  { key: 'desCruzChico',     label: 'Desarmador de cruz chico',          icon: Wrench    },
  { key: 'desCruzMed',       label: 'Desarmador de cruz mediano',        icon: Wrench    },
  { key: 'kitPerilleros',    label: 'Kit de desarmadores perilleros (6)', icon: Wrench   },
  { key: 'pinzasElec',       label: 'Pinzas electricista',               icon: Zap       },
  { key: 'pinzasPela',       label: 'Pinzas pelacables generales',       icon: Scissors  },
  { key: 'pinzasPunta',      label: 'Pinzas de punta',                   icon: Zap       },
  { key: 'pinzasRas',        label: 'Pinzas corte al ras',               icon: Scissors  },
  { key: 'flexometro',       label: 'Flexómetro',                        icon: Ruler     },
  { key: 'portaHerramienta', label: 'Porta herramienta de cinturón',     icon: Briefcase },
  { key: 'navaja',           label: 'Navaja',                            icon: Scissors  },
  { key: 'martillo',         label: 'Martillo pequeño',                  icon: Hammer    },
  { key: 'cintasAislar',     label: 'Cintas de aislar',                  icon: Layers    },
];

export const TOOLS_KEYS = TOOLS_ITEMS.map(t => t.key);

export const TOOL_LABELS = Object.fromEntries(TOOLS_ITEMS.map(t => [t.key, t.label]));

/** Color de la barra de vida útil — mismo criterio en perfil y en el panel. */
export const lifeTone = (pct) =>
  pct >= 70 ? { bar: 'bg-emerald-500', text: 'text-emerald-600', chip: 'bg-emerald-100 text-emerald-700' }
: pct >= 40 ? { bar: 'bg-amber-400',   text: 'text-amber-500',   chip: 'bg-amber-100 text-amber-700'   }
:             { bar: 'bg-rose-500',    text: 'text-rose-500',    chip: 'bg-rose-100 text-rose-700'     };
