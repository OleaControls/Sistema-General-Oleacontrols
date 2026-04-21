import { apiFetch } from '../lib/api';

const TECH_LOCATIONS_KEY = 'olea_tech_locations_db';

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

  // Plantillas OT (guardadas en BD vía /api/ot-templates)
  _templatesFlight: null,
  async getTemplates() {
    // Deduplication: si ya hay una petición en vuelo, reutiliza la misma Promise
    if (this._templatesFlight) return this._templatesFlight;
    this._templatesFlight = apiFetch('/api/ot-templates')
      .then(r => r.ok ? r.json() : [])
      .finally(() => { this._templatesFlight = null; });
    return this._templatesFlight;
  },

  async saveTemplate(templateData) {
    const response = await apiFetch('/api/ot-templates', {
      method: 'POST',
      body: JSON.stringify({
        name:            templateData.name,
        title:           templateData.title,
        workDescription: templateData.workDescription,
        priority:        templateData.priority    || 'MEDIUM',
        arrivalTime:     templateData.arrivalTime || '09:00',
      })
    });
    if (!response.ok) throw new Error('Error al guardar plantilla');
    return response.json();
  },

  async deleteTemplate(templateId) {
    const response = await apiFetch(`/api/ot-templates?id=${templateId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al eliminar plantilla');
  },

  // Clientes OT (guardados en BD vía /api/ot-clients)
  _otClientsFlight: null,
  async getOTClients(search = '') {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    // Solo deduplicar cuando no hay búsqueda (listado general)
    if (!search) {
      if (this._otClientsFlight) return this._otClientsFlight;
      this._otClientsFlight = apiFetch(`/api/ot-clients${params}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => data.map(c => ({ ...c, lat: c.latitude ?? c.lat, lng: c.longitude ?? c.lng })))
        .finally(() => { this._otClientsFlight = null; });
      return this._otClientsFlight;
    }
    const response = await apiFetch(`/api/ot-clients${params}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.map(c => ({ ...c, lat: c.latitude ?? c.lat, lng: c.longitude ?? c.lng }));
  },

  async saveOTClient(clientData) {
    const body = {
      name:        clientData.name,
      storeNumber: clientData.storeNumber || null,
      storeName:   clientData.storeName   || null,
      contact:     clientData.contact,
      phone:       clientData.phone,
      email:       clientData.email       || null,
      address:     clientData.address,
      otAddress:   clientData.otAddress   || null,
      otReference: clientData.otReference || null,
      latitude:    clientData.lat         || clientData.latitude  || null,
      longitude:   clientData.lng         || clientData.longitude || null,
    };
    const response = await apiFetch('/api/ot-clients', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Error al guardar cliente OT');
    return response.json();
  },

  async deleteOTClient(clientId) {
    const response = await apiFetch(`/api/ot-clients?id=${clientId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al eliminar cliente OT');
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
    const response = await apiFetch(`/api/ots?id=${id}`);
    if (!response.ok) throw new Error('Error al obtener detalle de OT');
    return response.json();
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
