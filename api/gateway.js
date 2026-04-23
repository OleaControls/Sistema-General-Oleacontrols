// Deshabilitar el body parser de Vercel para manejarlo manualmente con límite mayor
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

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
  quotes: () => import('./_handlers/quotes.js'),
  upload: () => import('./_handlers/upload.js'),
  lms: () => import('./_handlers/lms.js')
};

export default async function handler(req, res) {
  const urlParts = req.url.split('?')[0].split('/');
  const resourceName = urlParts.find(part => handlers[part.toLowerCase()]);

  if (resourceName && handlers[resourceName.toLowerCase()]) {
    try {
      console.log(`[Gateway] Loading handler for: ${resourceName}`);
      const module = await handlers[resourceName.toLowerCase()]();
      return await module.default(req, res);
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
