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

  // Tope del camino de respaldo (/api/upload), no del archivo: Vercel corta el
  // request en 4.5 MB antes de que la función corra y ahí el archivo viaja como
  // base64 dentro de un JSON, que abulta ~33%. En peso de archivo son ~3 MB.
  // La subida directa a R2 no pasa por aquí y no tiene este tope.
  _BYTES_RESPALDO: 3 * 1024 * 1024,
  _MB_RESPALDO: 3,

  _EXT_POR_MIME: { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' },

  /** Extensión a usar en R2: la del nombre real si la trae, si no la del MIME. */
  _extensionDe(contentType, nombre = '') {
    const delNombre = nombre.includes('.') ? nombre.split('.').pop().toLowerCase() : '';
    if (/^[a-z0-9]{1,5}$/.test(delNombre)) return delNombre;
    const delMime = this._EXT_POR_MIME[contentType] || contentType.split('/')[1]?.split('+')[0] || '';
    return /^[a-z0-9]{1,5}$/.test(delMime) ? delMime : 'bin';
  },

  // Convierte un data-URI base64 en { blob, contentType, extension }.
  _dataUriToBlob(dataUri) {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Data-URI inválido');
    const contentType = match[1];
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { blob: new Blob([bytes], { type: contentType }), contentType, extension: this._extensionDe(contentType) };
  },

  /**
   * Pide una URL prefirmada y escribe el archivo directo en R2. Es el único
   * camino sin tope de tamaño: el archivo nunca toca el servidor.
   * Devuelve la URL pública; lanza si algo falla, con la etapa en `err.etapa`.
   */
  async _subirDirecto(blob, contentType, extension, folder) {
    let etapa = 'firmar';
    try {
      const presignRes = await apiFetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ presign: true, folder, contentType, extension }),
      });
      if (!presignRes.ok) throw new Error(`No se pudo obtener URL de subida (${presignRes.status})`);
      const { uploadUrl, publicUrl } = await presignRes.json();

      etapa = 'subir';
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!putRes.ok) throw new Error(`Fallo subida directa a R2 (${putRes.status})`);

      console.log('[otService] Archivo subido directo a R2:', publicUrl);
      return publicUrl;
    } catch (err) {
      err.etapa = etapa;
      throw err;
    }
  },

  /** Mensaje del respaldo cuando el archivo ya no cabe por /api/upload. */
  _errorRespaldo(bytes, etapa) {
    const mb = (bytes / 1024 / 1024).toFixed(1);
    const causa = etapa === 'subir'
      ? 'el navegador no pudo escribir en R2 (revisa la regla CORS del bucket)'
      : 'no se pudo firmar la URL de subida en el servidor';
    return new Error(
      `No se pudo subir el archivo (${mb} MB): ${causa}. ` +
      `Mientras la subida directa no funcione, el respaldo solo admite hasta ${this._MB_RESPALDO} MB. ` +
      `Avisa a sistemas.`
    );
  },

  /**
   * Sube un File/Blob del disco del usuario. Sin límite de tamaño: va directo
   * a R2 en binario, sin FileReader y sin base64 — antes un archivo grande se
   * cargaba entero en memoria y crecía un tercio antes siquiera de salir del
   * navegador, que en un celular de campo era una pestaña muerta.
   *
   * Solo si la subida directa falla (p. ej. CORS sin configurar en el bucket)
   * cae al respaldo por /api/upload, y ahí sí topa: reintentar con un archivo
   * pesado garantiza un 413 que no le dice nada al técnico.
   */
  async uploadArchivo(file, folder = 'uploads') {
    if (!file) throw new Error('No hay archivo que subir');
    const contentType = file.type || 'application/octet-stream';
    const extension   = this._extensionDe(contentType, file.name || '');

    try {
      return await this._subirDirecto(file, contentType, extension, folder);
    } catch (err) {
      console.warn(`[otService] Subida directa a R2 falló en la etapa "${err.etapa}":`, err.message);
      if (file.size > this._BYTES_RESPALDO) throw this._errorRespaldo(file.size, err.etapa);

      const dataUri = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload  = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      return this.uploadFile(dataUri, folder);
    }
  },

  /**
   * Igual que uploadArchivo pero desde un data-URI, para lo que se genera en el
   * navegador (PDFs de jsPDF, firmas). Ahí el base64 ya existe y no hay File.
   */
  async uploadLargeFile(base64Data, folder = 'uploads') {
    if (!base64Data?.startsWith('data:')) return base64Data;
    let blob, contentType, extension;
    try {
      ({ blob, contentType, extension } = this._dataUriToBlob(base64Data));
    } catch {
      return this.uploadFile(base64Data, folder);
    }

    try {
      return await this._subirDirecto(blob, contentType, extension, folder);
    } catch (err) {
      console.warn(`[otService] Subida directa a R2 falló en la etapa "${err.etapa}":`, err.message);
      // El respaldo manda el data-URI dentro de un JSON: lo que topa contra el
      // límite de Vercel es el largo en base64, no el peso del archivo.
      if (blob.size > this._BYTES_RESPALDO) throw this._errorRespaldo(blob.size, err.etapa);
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
    if (!response.ok) {
      // El servidor explica el motivo (p. ej. 403 fuera del horario de creación)
      let payload = null;
      try { payload = await response.json(); } catch { /* respuesta sin JSON */ }
      const err = new Error(payload?.error || 'Error al crear OT');
      err.status  = response.status;
      err.payload = payload;
      throw err;
    }
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

  /**
   * Cambia el estado de una OT.
   *
   * Es la accion que mas hace el tecnico en campo —aceptar, arrancar, terminar—
   * y justo donde peor se pierde la senal. Si no hay red, se encola y sube sola:
   * devuelve entonces { encolado: true } en vez de la OT actualizada.
   *
   * Quien llame debe contemplar ese caso. Es explicito a proposito: fingir que
   * se guardo y devolver una OT inventada seria peor que decir la verdad.
   */
  async updateStatus(otId, status, extraData = {}) {
    const isNowLocked = status === 'VALIDATED';
    return this.updateOT(otId, { status, ...extraData, isLocked: isNowLocked }, { encolarSiFalla: true });
  },

  async updateOT(otId, updatedData, { encolarSiFalla = false } = {}) {
    const response = await apiFetch('/api/ots', {
      method: 'PUT',
      body: JSON.stringify({ id: otId, ...updatedData }),
      encolarSiFalla,
      descripcion: `Cambio en la OT ${otId}`,
    });

    // 202: no habia red y quedo en la cola. No hay OT que devolver todavia.
    if (response.status === 202) return { encolado: true };

    if (!response.ok) {
      // El servidor explica el motivo (p. ej. requisitos previos faltantes: 409)
      let payload = null;
      try { payload = await response.json(); } catch { /* respuesta sin JSON */ }
      const err = new Error(payload?.error || 'Error al actualizar OT');
      err.status  = response.status;
      err.payload = payload;
      throw err;
    }
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

  /* ── Catálogo de proyectos de tiendas ───────────────────────────────────
     Para el selector del alta de OT. El supervisor no puede llamar a
     /api/projects, así que el catálogo se sirve desde /api/ots. */
  async getStoreProjects() {
    const res = await apiFetch('/api/ots?catalog=storeProjects');
    if (!res.ok) return [];
    const json = await res.json().catch(() => []);
    return Array.isArray(json) ? json : [];
  },

  /* Todos los proyectos abiertos: cualquier asignación puede colgar de uno,
     no solo las de tienda. Trae zona para heredarla al crear la OT. */
  async getProjectsCatalog() {
    const res = await apiFetch('/api/ots?catalog=projects');
    if (!res.ok) return [];
    const json = await res.json().catch(() => []);
    return Array.isArray(json) ? json : [];
  },

  /* ── Proyecto vinculado a una OT de tienda ──────────────────────────────
     El módulo de proyectos está cerrado a técnicos, así que estos tres
     métodos pasan por /api/ots, que solo expone los cuatro apartados que el
     técnico necesita y valida que participe en la orden. */
  async getOTProject(otId) {
    const res = await apiFetch(`/api/ots?id=${encodeURIComponent(otId)}&sub=project`);
    // 404/400 = la OT no es de tienda o aún no tiene proyecto vinculado.
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) throw new Error('No se pudo cargar el proyecto de la OT');
    return res.json();
  },

  async requestResource(otId, data) {
    const res = await apiFetch(`/api/ots?id=${encodeURIComponent(otId)}&sub=resourceRequests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo registrar la solicitud');
    }
    return res.json();
  },

  /* ── Evidencias e incidentes durante la jornada ────────────────────────
     No dependen del proyecto ni del tipo de OT: sirven para documentar en el
     momento, sin esperar al cierre del acta. */
  async getOTEvidences(otId) {
    const res = await apiFetch(`/api/ots?id=${encodeURIComponent(otId)}&sub=evidences`);
    if (!res.ok) throw new Error('No se pudieron cargar las evidencias');
    return res.json();
  },

  async addOTEvidence(otId, { url, description, type = 'IMAGE' }) {
    const res = await apiFetch(`/api/ots?id=${encodeURIComponent(otId)}&sub=evidences`, {
      method: 'POST',
      body: JSON.stringify({ url, description, type }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo guardar la evidencia');
    }
    return res.json();
  },

  async deleteOTEvidence(otId, evidenceId) {
    const res = await apiFetch(
      `/api/ots?id=${encodeURIComponent(otId)}&sub=evidences&subId=${encodeURIComponent(evidenceId)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo eliminar la evidencia');
    }
    return res.json();
  },

  async addOTDocument(otId, data) {
    const res = await apiFetch(`/api/ots?id=${encodeURIComponent(otId)}&sub=documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo guardar el documento');
    }
    return res.json();
  },

  async updateOTPending(otId, pendingId, status) {
    const res = await apiFetch(
      `/api/ots?id=${encodeURIComponent(otId)}&sub=pendings&subId=${encodeURIComponent(pendingId)}`,
      { method: 'PUT', body: JSON.stringify({ status }) }
    );
    if (!res.ok) throw new Error('No se pudo actualizar el pendiente');
    return res.json();
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
