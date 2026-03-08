import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import loginHandler from './api/login.js';
import employeesHandler from './api/employees.js';
import categoriesHandler from './api/categories.js';
import otsHandler from './api/ots.js';
import expensesHandler from './api/expenses.js';
import uploadHandler from './api/upload.js';

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

app.listen(PORT, () => {
  console.log(`🚀 Server running locally at http://localhost:${PORT}`);
});
