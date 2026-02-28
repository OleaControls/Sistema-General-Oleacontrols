const OTS_KEY = 'olea_ots_db';
const OT_TEMPLATES_KEY = 'olea_ot_templates_db';

const initialOTs = [
  {
    id: "OT-2026-001",
    title: "Instalación de Sensores Planta Norte",
    description: "Montaje y calibración de 12 sensores de presión serie V3.",
    priority: "HIGH",
    status: "ASSIGNED", // [UNASSIGNED, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, VALIDATED]
    leadTechId: "user-123",
    leadTechName: "Gabriel Técnico (Pruebas)",
    supportTechs: [
      { id: "user-tech-02", name: "Juan Pérez" }
    ],
    client: "Minera del Potosí",
    location: "San Luis Potosí, MX",
    createdAt: "2026-02-20",
    expensesSubmitted: 2,
    validationPending: false,
    storeNumber: "ST-001",
    storeName: "Planta Norte Main",
    clientEmail: "contacto@minera.mx",
    clientPhone: "4441234567",
    address: "Eje 124, Zona Industrial, SLP",
    lat: 22.1444,
    lng: -100.9167,
    workDescription: "Montaje y calibración de 12 sensores de presión serie V3.",
    arrivalTime: "09:00",
    assignedFunds: 500,
    pendingTasks: "",
    signature: null,
    completionPhotos: [],
    isLocked: false
  }
];

const initialTemplates = [
  {
    id: "TMP-001",
    name: "Mantenimiento Preventivo Estándar",
    title: "Mantenimiento Preventivo de Sensores",
    workDescription: "Limpieza, calibración y prueba de comunicación de sensores de presión y temperatura.",
    priority: "MEDIUM",
    arrivalTime: "09:00"
  }
];

export const otService = {
  async getOTs() {
    const data = localStorage.getItem(OTS_KEY);
    return data ? JSON.parse(data) : initialOTs;
  },

  // Templates
  async getTemplates() {
    const data = localStorage.getItem(OT_TEMPLATES_KEY);
    return data ? JSON.parse(data) : initialTemplates;
  },

  async saveTemplate(templateData) {
    const templates = await this.getTemplates();
    const newTemplate = {
      ...templateData,
      id: `TMP-${Math.floor(100 + Math.random() * 900)}`
    };
    const updated = [newTemplate, ...templates];
    localStorage.setItem(OT_TEMPLATES_KEY, JSON.stringify(updated));
    return newTemplate;
  },

  async saveOT(otData) {
    const ots = await this.getOTs();
    const newOT = {
      ...otData,
      id: otData.id || `OT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      status: otData.leadTechId ? 'ASSIGNED' : 'UNASSIGNED',
      location: otData.address || otData.location,
      createdAt: new Date().toISOString(),
      expensesSubmitted: 0,
      validationPending: false,
      completionPhotos: [],
      pendingTasks: "",
      signature: null,
      supportTechs: otData.supportTechs || [],
      isLocked: false
    };
    const updated = [newOT, ...ots];
    localStorage.setItem(OTS_KEY, JSON.stringify(updated));
    return newOT;
  },

  async assignOT(otId, leadId, leadName, supportTechs = [], funds = 0) {
    const ots = await this.getOTs();
    const updated = ots.map(ot => 
      ot.id === otId ? { 
        ...ot, 
        leadTechId: leadId, 
        leadTechName: leadName, 
        supportTechs: supportTechs,
        status: 'ASSIGNED', 
        assignedFunds: funds 
      } : ot
    );
    localStorage.setItem(OTS_KEY, JSON.stringify(updated));
    return true;
  },

  async updateStatus(otId, status, extraData = {}) {
    const ots = await this.getOTs();
    const updated = ots.map(ot => {
      if (ot.id === otId) {
        const isNowLocked = status === 'VALIDATED';
        return { ...ot, ...extraData, status, isLocked: isNowLocked };
      }
      return ot;
    });
    localStorage.setItem(OTS_KEY, JSON.stringify(updated));
    return true;
  },

  async updateOT(otId, updatedData) {
    const ots = await this.getOTs();
    const updated = ots.map(ot => 
      ot.id === otId ? { ...ot, ...updatedData } : ot
    );
    localStorage.setItem(OTS_KEY, JSON.stringify(updated));
    return true;
  },

  async addSupplementalFunds(otId, amount) {
    const ots = await this.getOTs();
    const updated = ots.map(ot => 
      ot.id === otId ? { ...ot, assignedFunds: (ot.assignedFunds || 0) + amount } : ot
    );
    localStorage.setItem(OTS_KEY, JSON.stringify(updated));
    return true;
  },

  async getById(id) {
    const ots = await this.getOTs();
    return ots.find(o => o.id === id);
  },

  async getOTFinancials(otId) {
    const ot = await this.getById(otId);
    if (!ot) return null;

    const data = localStorage.getItem('olea_expenses_db');
    const allExpenses = data ? JSON.parse(data) : [];
    const otExpenses = allExpenses.filter(e => e.otId === otId && e.status !== 'REJECTED');
    
    const totalSpent = otExpenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = (ot.assignedFunds || 0) - totalSpent;

    return {
      assignedFunds: ot.assignedFunds || 0,
      totalSpent,
      balance,
      isOverLimit: balance < 0,
      expenses: otExpenses
    };
  }
};
