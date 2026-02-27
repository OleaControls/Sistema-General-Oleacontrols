const OTS_KEY = 'olea_ots_db';

const initialOTs = [
  {
    id: "OT-2026-001",
    title: "Instalación de Sensores Planta Norte",
    description: "Montaje y calibración de 12 sensores de presión serie V3.",
    priority: "HIGH",
    status: "ASSIGNED", // [UNASSIGNED, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, VALIDATED]
    assignedToId: "user-123",
    assignedToName: "Gabriel Técnico (Pruebas)",
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
    workDescription: "Montaje y calibración de 12 sensores de presión serie V3.",
    arrivalTime: "09:00",
    assignedFunds: 500,
    pendingTasks: "",
    signature: null,
    completionPhotos: []
  }
];

export const otService = {
  async getOTs() {
    const data = localStorage.getItem(OTS_KEY);
    return data ? JSON.parse(data) : initialOTs;
  },

  async saveOT(otData) {
    const ots = await this.getOTs();
    const newOT = {
      ...otData,
      id: otData.id || `OT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      status: otData.assignedToId ? 'ASSIGNED' : 'UNASSIGNED',
      location: otData.address || otData.location, // Para compatibilidad con vistas existentes
      createdAt: new Date().toISOString(),
      expensesSubmitted: 0,
      validationPending: false,
      completionPhotos: [],
      pendingTasks: "",
      signature: null
    };
    const updated = [newOT, ...ots];
    localStorage.setItem(OTS_KEY, JSON.stringify(updated));
    return newOT;
  },

  async assignOT(otId, techId, techName, funds = 0) {
    const ots = await this.getOTs();
    const updated = ots.map(ot => 
      ot.id === otId ? { ...ot, assignedToId: techId, assignedToName: techName, status: 'ASSIGNED', assignedFunds: funds } : ot
    );
    localStorage.setItem(OTS_KEY, JSON.stringify(updated));
    return true;
  },

  async updateStatus(otId, status, extraData = {}) {
    const ots = await this.getOTs();
    const updated = ots.map(ot => 
      ot.id === otId ? { ...ot, ...extraData, status } : ot
    );
    localStorage.setItem(OTS_KEY, JSON.stringify(updated));
    return true;
  },

  async getById(id) {
    const ots = await this.getOTs();
    return ots.find(o => o.id === id);
  }
};
