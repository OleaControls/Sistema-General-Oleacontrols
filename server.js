import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import loginHandler from './api/_handlers/login.js';
import employeesHandler from './api/_handlers/employees.js';
import categoriesHandler from './api/_handlers/categories.js';
import otsHandler from './api/_handlers/ots.js';
import expensesHandler from './api/_handlers/expenses.js';
import evaluationsHandler from './api/_handlers/evaluations.js';
import configHandler from './api/_handlers/config.js';
import gamificationHandler from './api/_handlers/gamification.js';
import crmHandler from './api/_handlers/crm.js';
import quotesHandler from './api/_handlers/quotes.js';
import uploadHandler from './api/_handlers/upload.js';
import vacationsHandler from './api/_handlers/vacations.js';
import recruitmentHandler from './api/_handlers/recruitment.js';
import assetsHandler from './api/_handlers/assets.js';
import salesDataHandler from './api/_handlers/sales-data.js';
import personalAuditsHandler from './api/_handlers/personal-audits.js';
import lmsHandler from './api/_handlers/lms.js';
import otClientsHandler from './api/_handlers/ot-clients.js';
import otTemplatesHandler from './api/_handlers/ot-templates.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

import fs from 'fs';

// Wrapper to adapt Vercel handlers to Express
const adaptHandler = (handler) => {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const errorMsg = `[${new Date().toISOString()}] API Error: ${error.message}\nStack: ${error.stack}\nBody: ${JSON.stringify(req.body)}\n\n`;
      console.error(errorMsg);
      fs.appendFileSync('api-errors.log', errorMsg);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  };
};

// API Routes
app.post('/api/login', adaptHandler(loginHandler));
app.post('/api/upload', adaptHandler(uploadHandler));

// OTS
app.get('/api/ots', adaptHandler(otsHandler));
app.post('/api/ots', adaptHandler(otsHandler));
app.put('/api/ots', adaptHandler(otsHandler));
app.delete('/api/ots', adaptHandler(otsHandler));

// OTs con ID
app.get('/api/ots/:id', adaptHandler(otsHandler));
app.put('/api/ots/:id', adaptHandler(otsHandler));
app.delete('/api/ots/:id', adaptHandler(otsHandler));

// Employees
app.get('/api/employees', adaptHandler(employeesHandler));
app.post('/api/employees', adaptHandler(employeesHandler));
app.put('/api/employees', adaptHandler(employeesHandler));
app.delete('/api/employees', adaptHandler(employeesHandler));

// Work Orders (OTs)
app.get('/api/ots', adaptHandler(otsHandler));
app.post('/api/ots', adaptHandler(otsHandler));
app.put('/api/ots', adaptHandler(otsHandler));

// Expenses
app.get('/api/expenses', adaptHandler(expensesHandler));
app.post('/api/expenses', adaptHandler(expensesHandler));
app.put('/api/expenses', adaptHandler(expensesHandler));

// Categories
app.get('/api/categories', adaptHandler(categoriesHandler));
app.post('/api/categories', adaptHandler(categoriesHandler));

// Evaluations
app.get('/api/evaluations', adaptHandler(evaluationsHandler));
app.post('/api/evaluations', adaptHandler(evaluationsHandler));

// Config
app.get('/api/config', adaptHandler(configHandler));
app.post('/api/config', adaptHandler(configHandler));

// Gamification
app.get('/api/gamification', adaptHandler(gamificationHandler));

// CRM
app.all('/api/crm/:resource', async (req, res) => {
  // Aseguramos que el handler de Vercel reciba el resource
  req.query.resource = req.params.resource;
  await adaptHandler(crmHandler)(req, res);
});

// Quotes
app.get('/api/quotes', adaptHandler(quotesHandler));
app.post('/api/quotes', adaptHandler(quotesHandler));
app.put('/api/quotes', adaptHandler(quotesHandler));
app.delete('/api/quotes', adaptHandler(quotesHandler));

// Vacations
app.get('/api/vacations', adaptHandler(vacationsHandler));
app.post('/api/vacations', adaptHandler(vacationsHandler));
app.put('/api/vacations', adaptHandler(vacationsHandler));

// Recruitment
console.log('Initializing Recruitment Routes...');
app.all(['/api/recruitment', '/api/recruitment/'], adaptHandler(recruitmentHandler));

// Assets
app.get('/api/assets', adaptHandler(assetsHandler));
app.post('/api/assets', adaptHandler(assetsHandler));
app.put('/api/assets', adaptHandler(assetsHandler));
app.delete('/api/assets', adaptHandler(assetsHandler));

// Sales Data (bitácora, reporte diario, cartera — por vendedor en BD)
app.get('/api/sales-data', adaptHandler(salesDataHandler));
app.post('/api/sales-data', adaptHandler(salesDataHandler));
app.put('/api/sales-data', adaptHandler(salesDataHandler));
app.delete('/api/sales-data', adaptHandler(salesDataHandler));

// Personal Audits
app.get('/api/personal-audits', adaptHandler(personalAuditsHandler));
app.post('/api/personal-audits', adaptHandler(personalAuditsHandler));
app.delete('/api/personal-audits', adaptHandler(personalAuditsHandler));

// LMS
app.all('/api/lms', adaptHandler(lmsHandler));
app.all('/api/lms/:resource', adaptHandler(lmsHandler));

// OT Clients & Templates
app.get('/api/ot-clients', adaptHandler(otClientsHandler));
app.post('/api/ot-clients', adaptHandler(otClientsHandler));
app.put('/api/ot-clients', adaptHandler(otClientsHandler));
app.delete('/api/ot-clients', adaptHandler(otClientsHandler));

app.get('/api/ot-templates', adaptHandler(otTemplatesHandler));
app.post('/api/ot-templates', adaptHandler(otTemplatesHandler));
app.put('/api/ot-templates', adaptHandler(otTemplatesHandler));
app.delete('/api/ot-templates', adaptHandler(otTemplatesHandler));

app.listen(PORT, () => {
  console.log(`🚀 Server running locally at http://localhost:${PORT}`);
});
