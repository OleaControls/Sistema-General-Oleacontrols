import employees from './_handlers/employees.js';
import vacations from './_handlers/vacations.js';
import recruitment from './_handlers/recruitment.js';
import assets from './_handlers/assets.js';
import evaluations from './_handlers/evaluations.js';
import categories from './_handlers/categories.js';
import config from './_handlers/config.js';
import crm from './_handlers/crm.js';
import expenses from './_handlers/expenses.js';
import gamification from './_handlers/gamification.js';
import login from './_handlers/login.js';
import ots from './_handlers/ots.js';
import quotes from './_handlers/quotes.js';
import upload from './_handlers/upload.js';
import lms from './_handlers/lms.js';

const handlers = {
  employees,
  vacations,
  recruitment,
  assets,
  evaluations,
  categories,
  config,
  crm,
  expenses,
  gamification,
  login,
  ots,
  quotes,
  upload,
  lms
};

export default async function handler(req, res) {
  // Extraer el recurso de la URL (ej: /api/employees -> employees)
  const urlParts = req.url.split('?')[0].split('/');
  const resource = urlParts.find(part => handlers[part.toLowerCase()]);

  if (resource && handlers[resource.toLowerCase()]) {
    try {
      console.log(`[Gateway] Routing request to: ${resource}`);
      return await handlers[resource.toLowerCase()](req, res);
    } catch (error) {
      console.error(`[Gateway Error] ${resource}:`, error);
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }

  return res.status(404).json({ error: 'Recurso no encontrado en el Gateway', path: req.url });
}
