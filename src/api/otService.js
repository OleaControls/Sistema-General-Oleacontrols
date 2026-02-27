const OTS_KEY = 'olea_ots_db';

const initialOTs = [
  {
    id: "OT-2026-001",
    title: "Instalación de Sensores Planta Norte",
    description: "Montaje y calibración de 12 sensores de presión serie V3.",
    priority: "HIGH",
    status: "ASSIGNED", // [UNASSIGNED, ASSIGNED, IN_PROGRESS, COMPLETED, VALIDATED]
    assignedToId: "user-tech-01",
    assignedToName: "Gabriel Técnico",
    client: "Minera del Potosí",
    location: "San Luis Potosí, MX",
    createdAt: "2026-02-20",
    expensesSubmitted: 2,
    validationPending: false
  },
  {
    id: "OT-2026-002",
    title: "Mantenimiento Preventivo Calderas",
    description: "Limpieza profunda y cambio de sellos en caldera #4.",
    priority: "MEDIUM",
    status: "UNASSIGNED",
    assignedToId: null,
    assignedToName: null,
    client: "Bebidas Globales",
    location: "Querétaro, MX",
    createdAt: "2026-02-25",
    expensesSubmitted: 0,
    validationPending: false
  }
];

export const otService = {
  async getOTs() {
    const data = localStorage.getItem(OTS_KEY);
    return data ? JSON.parse(data) : initialOTs;
  },

  async assignOT(otId, techId, techName) {
    const ots = await this.getOTs();
    const updated = ots.map(ot => 
      ot.id === otId ? { ...ot, assignedToId: techId, assignedToName: techName, status: 'ASSIGNED' } : ot
    );
    localStorage.setItem(OTS_KEY, JSON.stringify(updated));
    return true;
  },

  async updateStatus(otId, status) {
    const ots = await this.getOTs();
    const updated = ots.map(ot => 
      ot.id === otId ? { ...ot, status } : ot
    );
    localStorage.setItem(OTS_KEY, JSON.stringify(updated));
    return true;
  }
};
