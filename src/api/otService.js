import { apiFetch } from '../lib/api';


export const otService = {
  async getOTs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const response = await apiFetch(`/api/ots?${params}`);
    if (!response.ok) throw new Error('Error al obtener OTs');
    const json = await response.json();
    // Normaliza: siempre devuelve un array para no romper consumidores existentes
    if (Array.isArray(json)) return json;
    return Array.isArray(json?.data) ? json.data : [];
  },

  // Versión paginada para consumidores que necesiten el total y la metadata
  async getOTsPaginated(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const response = await apiFetch(`/api/ots?${params}`);
    if (!response.ok) throw new Error('Error al obtener OTs');
    const json = await response.json();
    // Normaliza siempre a { data: T[], total: number, ... }
    if (Array.isArray(json)) return { data: json, total: json.length, page: 1, pages: 1 };
    return {
      data:  Array.isArray(json?.data) ? json.data : [],
      total: typeof json?.total === 'number' ? json.total : 0,
      page:  json?.page  ?? 1,
      pages: json?.pages ?? 1,
    };
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

  // Convierte un data-URI base64 en { blob, contentType, extension }.
  _dataUriToBlob(dataUri) {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Data-URI inválido');
    const contentType = match[1];
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const mimeToExt = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const extension = mimeToExt[contentType] || contentType.split('/')[1]?.split('+')[0] || 'bin';
    return { blob: new Blob([bytes], { type: contentType }), contentType, extension };
  },

  // Sube archivos grandes (PDFs) DIRECTO a R2 mediante URL prefirmada,
  // evitando el límite de 4.5 MB de las funciones serverless de Vercel.
  // Si la subida directa falla (p. ej. CORS no configurado en R2), cae de
  // vuelta al método clásico vía /api/upload.
  async uploadLargeFile(base64Data, folder = 'uploads') {
    if (!base64Data?.startsWith('data:')) return base64Data;
    try {
      const { blob, contentType, extension } = this._dataUriToBlob(base64Data);

      const presignRes = await apiFetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ presign: true, folder, contentType, extension }),
      });
      if (!presignRes.ok) throw new Error(`No se pudo obtener URL de subida (${presignRes.status})`);
      const { uploadUrl, publicUrl } = await presignRes.json();

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!putRes.ok) throw new Error(`Fallo subida directa a R2 (${putRes.status})`);

      console.log(`[otService] Archivo grande subido directo a R2:`, publicUrl);
      return publicUrl;
    } catch (err) {
      console.warn(`[otService] Subida directa falló, usando /api/upload como respaldo:`, err.message);
      return this.uploadFile(base64Data, folder);
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

  async updateOTClient(clientId, clientData) {
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
    const response = await apiFetch(`/api/ot-clients?id=${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Error al actualizar cliente OT');
    return response.json();
  },

  async deleteOTClient(clientId) {
    const response = await apiFetch(`/api/ot-clients?id=${clientId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al eliminar cliente OT');
  },

  async generatePortalToken(clientId) {
    const response = await apiFetch(`/api/ot-clients?id=${clientId}`, {
      method: 'PUT',
      body: JSON.stringify({ generateToken: true })
    });
    if (!response.ok) throw new Error('Error al generar token del portal');
    return response.json();
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

  // Real-time location (persisted in DB via /api/tech-locations)
  async updateTechnicianLocation(techId, techName, lat, lng) {
    const response = await apiFetch('/api/tech-locations', {
      method: 'POST',
      body: JSON.stringify({ techId, lat, lng })
    });
    return response.ok;
  },

  async getTechnicianLocations() {
    try {
      const response = await apiFetch('/api/tech-locations');
      if (!response.ok) return {};
      const data = await response.json();
      const result = {};
      for (const tech of data) {
        result[tech.id] = tech;
      }
      return result;
    } catch {
      return {};
    }
  }
};
