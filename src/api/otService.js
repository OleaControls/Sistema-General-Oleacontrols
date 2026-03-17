import { apiFetch } from '../lib/api';

const OT_TEMPLATES_KEY = 'olea_ot_templates_db';
const TECH_LOCATIONS_KEY = 'olea_tech_locations_db';

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
  async getOTs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const response = await apiFetch(`/api/ots?${params}`);
    if (!response.ok) throw new Error('Error al obtener OTs');
    return response.json();
  },

  async uploadFile(base64Data, folder = 'uploads') {
    try {
        console.log(`[otService] Intentando subir archivo a /api/upload...`);
        const response = await apiFetch('/api/upload', {
            method: 'POST',
            body: JSON.stringify({ file: base64Data, folder })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[otService] Error en respuesta de subida:`, errorText);
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const { url } = await response.json();
        console.log(`[otService] Archivo subido con éxito:`, url);
        return url;
    } catch (err) {
        console.error(`[otService] Fallo crítico al subir archivo:`, err);
        throw err;
    }
  },

  // Templates
  async getTemplates() {
    const data = localStorage.getItem(OT_TEMPLATES_KEY);
    if (!data) {
        localStorage.setItem(OT_TEMPLATES_KEY, JSON.stringify(initialTemplates));
        return initialTemplates;
    }
    return JSON.parse(data);
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
    const response = await apiFetch('/api/ots', {
      method: 'POST',
      body: JSON.stringify(otData)
    });
    if (!response.ok) throw new Error('Error al crear OT');
    return response.json();
  },

  async assignOT(otId, leadId, leadName, supportTechs = [], funds = 0) {
    return this.updateOT(otId, {
      leadTechId: leadId,
      leadTechName: leadName,
      supportTechs,
      assignedFunds: funds,
      status: 'ASSIGNED'
    });
  },

  async updateStatus(otId, status, extraData = {}) {
    const isNowLocked = status === 'VALIDATED';
    return this.updateOT(otId, { status, ...extraData, isLocked: isNowLocked });
  },

  async updateOT(otId, updatedData) {
    const response = await apiFetch('/api/ots', {
      method: 'PUT',
      body: JSON.stringify({ id: otId, ...updatedData })
    });
    if (!response.ok) throw new Error('Error al actualizar OT');
    return response.json();
  },

  async deleteOT(otId) {
    const response = await apiFetch(`/api/ots?id=${otId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al eliminar OT');
    return response.json();
  },

  async addSupplementalFunds(otId, amount) {
    const ot = await this.getById(otId);
    if (!ot) return;
    return this.updateOT(otId, { assignedFunds: (ot.assignedFunds || 0) + amount });
  },

  async getById(id) {
    const ots = await this.getOTs();
    return ots.find(o => o.id === id);
  },

  async getOTDetail(id) {
    return this.getById(id);
  },

  async getOTFinancials(otId) {
    const ot = await this.getById(otId);
    if (!ot) return null;

    // Obtener gastos reales de la API
    const response = await apiFetch(`/api/expenses?otId=${otId}`);
    const allExpenses = response.ok ? await response.json() : [];
    
    const otExpenses = allExpenses.filter(e => e.status !== 'REJECTED');
    
    const totalSpent = otExpenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = (ot.assignedFunds || 0) - totalSpent;

    return {
      assignedFunds: ot.assignedFunds || 0,
      totalSpent,
      balance,
      isOverLimit: balance < 0,
      expenses: otExpenses
    };
  },

  // Real-time location
  async updateTechnicianLocation(techId, techName, lat, lng) {
    const data = localStorage.getItem(TECH_LOCATIONS_KEY);
    const locations = data ? JSON.parse(data) : {};
    locations[techId] = {
        id: techId,
        name: techName,
        lat,
        lng,
        lastUpdate: new Date().toISOString()
    };
    localStorage.setItem(TECH_LOCATIONS_KEY, JSON.stringify(locations));
    return true;
  },

  async getTechnicianLocations() {
    const data = localStorage.getItem(TECH_LOCATIONS_KEY);
    return data ? JSON.parse(data) : {};
  }
};
