// Deshabilitar el body parser de Vercel para manejarlo manualmente con límite mayor
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

import { conIdempotencia } from './_lib/idempotencia.js';
import { motivoRevocacion } from './_lib/sesiones.js';

const handlers = {
  employees: () => import('./_handlers/employees.js'),
  vacations: () => import('./_handlers/vacations.js'),
  recruitment: () => import('./_handlers/recruitment.js'),
  assets: () => import('./_handlers/assets.js'),
  evaluations: () => import('./_handlers/evaluations.js'),
  categories: () => import('./_handlers/categories.js'),
  config: () => import('./_handlers/config.js'),
  crm: () => import('./_handlers/crm.js'),
  'sales-data': () => import('./_handlers/sales-data.js'),
  expenses: () => import('./_handlers/expenses.js'),
  gamification: () => import('./_handlers/gamification.js'),
  login: () => import('./_handlers/login.js'),
  calendar: () => import('./_handlers/calendar.js'),
  portal: () => import('./_handlers/portal.js'),
  ots: () => import('./_handlers/ots.js'),
  'ot-clients':    () => import('./_handlers/ot-clients.js'),
  'ot-templates':    () => import('./_handlers/ot-templates.js'),
  'personal-audits': () => import('./_handlers/personal-audits.js'),
  'technician-props': () => import('./_handlers/technician-props.js'),
  quotes: () => import('./_handlers/quotes.js'),
  'quote-phrases': () => import('./_handlers/quote-phrases.js'),
  catalog: () => import('./_handlers/catalog.js'),
  catalogos: () => import('./_handlers/catalogos.js'),
  upload: () => import('./_handlers/upload.js'),
  'tech-locations':  () => import('./_handlers/tech-locations.js'),
  'tech-attendance': () => import('./_handlers/tech-attendance.js'),
  'tech-toolkit':    () => import('./_handlers/tech-toolkit.js'),
  attendance:    () => import('./_handlers/attendance.js'),
  performance:   () => import('./_handlers/performance.js'),
  'tech-kpis':   () => import('./_handlers/tech-kpis.js'),
  announcements: () => import('./_handlers/announcements.js'),
  notificaciones: () => import('./_handlers/notificaciones.js'),
  chat: () => import('./_handlers/chat.js'),
  surveys:       () => import('./_handlers/surveys.js'),
  payroll:       () => import('./_handlers/payroll.js'),
  lms:           () => import('./_handlers/lms.js'),
  projects:      () => import('./_handlers/projects.js'),
  appointments:  () => import('./_handlers/appointments.js'),
  warranty:      () => import('./_handlers/warranty.js'),
  'tech-docs':   () => import('./_handlers/tech-docs.js'),
  'store-inventory': () => import('./_handlers/store-inventory.js'),
  zones:         () => import('./_handlers/zones.js'),
  trainings:     () => import('./_handlers/trainings.js'),
  improvements:  () => import('./_handlers/improvements.js'),
  suppliers:        () => import('./_handlers/suppliers.js'),
  'purchase-orders':() => import('./_handlers/purchase-orders.js'),
};

export default async function handler(req, res) {
  const urlParts = req.url.split('?')[0].split('/');
  const resourceName = urlParts.find(part => handlers[part.toLowerCase()]);

  if (resourceName && handlers[resourceName.toLowerCase()]) {
    try {
      console.log(`[Gateway] Loading handler for: ${resourceName}`);
      const module = await handlers[resourceName.toLowerCase()]();

      /* Mismo punto unico, segunda garantia: un token sigue siendo valido hasta
         que caduca, asi que dar de baja a alguien o quitarle un rol no le
         quitaba el acceso hasta 7 dias despues. Aqui se revalida contra la base
         (cacheado 60s) antes de dejar pasar la peticion. */
      const revocada = await motivoRevocacion(req);
      if (revocada) return res.status(401).json({ error: revocada });

      // La garantia de idempotencia se activa solo si el cliente manda la
      // cabecera Idempotency-Key, asi que nada cambia para quien no la usa.
      return await conIdempotencia(module.default)(req, res);
    } catch (error) {
      console.error(`[Gateway Error] ${resourceName}:`, error);
      return res.status(500).json({ 
        error: 'Error interno en el servidor', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  return res.status(404).json({ error: 'Recurso no encontrado', path: req.url });
}
