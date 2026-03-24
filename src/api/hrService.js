import { apiFetch } from '../lib/api';

export const hrService = {
  async getEmployees() {
    const response = await apiFetch('/api/employees');
    if (!response.ok) throw new Error('Error al obtener empleados');
    return response.json();
  },

  async getEmployeeDetail(id) {
    const response = await apiFetch(`/api/employees?id=${id}`);
    if (!response.ok) throw new Error('Error al obtener detalle del empleado');
    return response.json();
  },

  async saveEmployee(employeeData) {
    const response = await apiFetch('/api/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.error || 'Error al guardar empleado');
    }
    return response.json();
  },

  async updateEmployee(id, updatedData) {
    const response = await apiFetch('/api/employees', {
      method: 'PUT',
      body: JSON.stringify({ id, ...updatedData })
    });
    if (!response.ok) {
        const err = await response.json();
        // Propagamos el mensaje real del servidor (ej: "Email ya existe" o "Fecha inválida")
        throw new Error(err.message || err.error || 'Error al actualizar empleado');
    }
    return response.json();
  },

  async deleteEmployee(id) {
    const response = await apiFetch(`/api/employees?id=${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al eliminar empleado');
    }
    return response.json();
  },

  async getCategories() {
    const response = await apiFetch('/api/categories');
    if (!response.ok) throw new Error('Error al obtener categorías');
    return response.json();
  },

  async saveCategory(categoryName) {
    const response = await apiFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: categoryName })
    });
    if (!response.ok) throw new Error('Error al guardar categoría');
    return response.json();
  },

  // --- VACACIONES ---
  async getVacationStatus(employeeId) {
    const response = await apiFetch(`/api/vacations?employeeId=${employeeId}`);
    if (!response.ok) throw new Error('Error al obtener balance de vacaciones');
    return response.json();
  },

  async requestVacation(requestData) {
    const response = await apiFetch('/api/vacations', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
    if (!response.ok) throw new Error('Error al solicitar vacaciones');
    return response.json();
  },

  async updateVacationRequest(requestId, status) {
    const response = await apiFetch('/api/vacations', {
      method: 'PUT',
      body: JSON.stringify({ requestId, status })
    });
    if (!response.ok) throw new Error('Error al actualizar solicitud');
    return response.json();
  },

  async updateVacationBalanceManual(employeeId, days) {
    const response = await apiFetch('/api/vacations', {
      method: 'POST',
      body: JSON.stringify({ employeeId, days, manualAdjustment: true })
    });
    if (!response.ok) throw new Error('Error al actualizar balance manualmente');
    return response.json();
  },

  // --- RECLUTAMIENTO (ATS) ---
  async getCandidates() {
    const response = await apiFetch('/api/recruitment');
    if (!response.ok) throw new Error('Error al obtener candidatos');
    return response.json();
  },

  async saveCandidate(data) {
    const response = await apiFetch('/api/recruitment', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al guardar candidato');
    return response.json();
  },

  async updateCandidate(id, data) {
    const response = await apiFetch('/api/recruitment', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
    if (!response.ok) throw new Error('Error al actualizar candidato');
    return response.json();
  },

  async deleteCandidate(id) {
    const response = await apiFetch('/api/recruitment', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
    if (!response.ok) throw new Error('Error al eliminar candidato');
    return response.json();
  },

  // --- ACTIVOS Y EPP ---
  async getAssets(employeeId = null) {
    const url = employeeId ? `/api/assets?employeeId=${employeeId}` : '/api/assets';
    const response = await apiFetch(url);
    if (!response.ok) throw new Error('Error al obtener activos');
    return response.json();
  },

  async saveAsset(data) {
    const response = await apiFetch('/api/assets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al registrar activo');
    return response.json();
  },

  async updateAsset(id, data) {
    const response = await apiFetch('/api/assets', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
    if (!response.ok) throw new Error('Error al actualizar activo');
    return response.json();
  },

  async deleteAsset(id) {
    const response = await apiFetch(`/api/assets?id=${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al eliminar activo');
    return response.json();
  }
};
