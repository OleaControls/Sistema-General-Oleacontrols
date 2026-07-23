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
import technicianPropsHandler from './api/_handlers/technician-props.js';
import lmsHandler from './api/_handlers/lms.js';
import otClientsHandler from './api/_handlers/ot-clients.js';
import otTemplatesHandler from './api/_handlers/ot-templates.js';
import calendarHandler from './api/_handlers/calendar.js';
import portalHandler from './api/_handlers/portal.js';
import catalogHandler from './api/_handlers/catalog.js';
import quotePhraseHandler from './api/_handlers/quote-phrases.js';
import attendanceHandler from './api/_handlers/attendance.js';
import techAttendanceHandler from './api/_handlers/tech-attendance.js';
import techLocationsHandler  from './api/_handlers/tech-locations.js';
import performanceHandler    from './api/_handlers/performance.js';
import techKpisHandler       from './api/_handlers/tech-kpis.js';
import announcementsHandler  from './api/_handlers/announcements.js';
import surveysHandler        from './api/_handlers/surveys.js';
import payrollHandler        from './api/_handlers/payroll.js';
import projectsHandler       from './api/_handlers/projects.js';

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

// Quote Requirement Phrases
app.get('/api/quote-phrases', adaptHandler(quotePhraseHandler));
app.post('/api/quote-phrases', adaptHandler(quotePhraseHandler));
app.put('/api/quote-phrases', adaptHandler(quotePhraseHandler));
app.delete('/api/quote-phrases', adaptHandler(quotePhraseHandler));

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

// PROP de Técnicos (Prioridades · Realidades · Opciones · Plan)
app.get('/api/technician-props',    adaptHandler(technicianPropsHandler));
app.post('/api/technician-props',   adaptHandler(technicianPropsHandler));
app.delete('/api/technician-props', adaptHandler(technicianPropsHandler));

// Attendance (HR general)
app.get('/api/attendance', adaptHandler(attendanceHandler));
app.post('/api/attendance', adaptHandler(attendanceHandler));
app.put('/api/attendance', adaptHandler(attendanceHandler));
app.delete('/api/attendance', adaptHandler(attendanceHandler));

// Tech Attendance (metas + checklists)
app.all('/api/tech-attendance/:resource', adaptHandler(techAttendanceHandler));
app.all('/api/tech-attendance',           adaptHandler(techAttendanceHandler));

// Tech Locations (GPS de técnicos)
app.get('/api/tech-locations',  adaptHandler(techLocationsHandler));
app.post('/api/tech-locations', adaptHandler(techLocationsHandler));

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

// Catálogo de Productos
app.get('/api/catalog', adaptHandler(catalogHandler));
app.post('/api/catalog', adaptHandler(catalogHandler));
app.put('/api/catalog', adaptHandler(catalogHandler));
app.delete('/api/catalog', adaptHandler(catalogHandler));

// Performance / KPIs
app.get('/api/performance', adaptHandler(performanceHandler));

// KPIs de Técnicos (puntualidad · cumplimiento OT · encuestas · resolución)
app.get('/api/tech-kpis', adaptHandler(techKpisHandler));

// Announcements
app.get('/api/announcements',    adaptHandler(announcementsHandler));
app.post('/api/announcements',   adaptHandler(announcementsHandler));
app.put('/api/announcements',    adaptHandler(announcementsHandler));
app.delete('/api/announcements', adaptHandler(announcementsHandler));

// Surveys
app.get('/api/surveys',    adaptHandler(surveysHandler));
app.post('/api/surveys',   adaptHandler(surveysHandler));
app.put('/api/surveys',    adaptHandler(surveysHandler));
app.delete('/api/surveys', adaptHandler(surveysHandler));

// Payroll / Nómina
app.get('/api/payroll',    adaptHandler(payrollHandler));
app.post('/api/payroll',   adaptHandler(payrollHandler));
app.put('/api/payroll',    adaptHandler(payrollHandler));
app.delete('/api/payroll', adaptHandler(payrollHandler));

// Calendar
app.get('/api/calendar', adaptHandler(calendarHandler));
app.post('/api/calendar', adaptHandler(calendarHandler));
app.put('/api/calendar', adaptHandler(calendarHandler));
app.delete('/api/calendar', adaptHandler(calendarHandler));

// Proyectos
app.get('/api/projects',    adaptHandler(projectsHandler));
app.post('/api/projects',   adaptHandler(projectsHandler));
app.put('/api/projects',    adaptHandler(projectsHandler));
app.delete('/api/projects', adaptHandler(projectsHandler));

// Portal de Cliente (público)
app.get('/api/portal', adaptHandler(portalHandler));
app.post('/api/portal', adaptHandler(portalHandler));

app.listen(PORT, () => {
  console.log(`🚀 Server running locally at http://localhost:${PORT}`);
});
