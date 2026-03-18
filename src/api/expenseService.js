import { apiFetch } from '../lib/api';

export const expenseService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const response = await apiFetch(`/api/expenses?${params}`);
    if (!response.ok) throw new Error('Error al obtener gastos');
    return response.json();
  },

  async saveExpense(expenseData) {
    const response = await apiFetch('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });
    if (!response.ok) throw new Error('Error al guardar gasto');
    return response.json();
  },

  async updateStatus(id, status, comment) {
    const response = await apiFetch('/api/expenses', {
      method: 'PUT',
      body: JSON.stringify({ id, status, comment })
    });
    if (!response.ok) throw new Error('Error al actualizar estado de gasto');
    return response.json();
  },

  async deleteExpense(id) {
    const response = await apiFetch('/api/expenses', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
    if (!response.ok) throw new Error('Error al eliminar gasto');
    return response.json();
  },

  async syncPending() {
    // La sincronización ahora se maneja directamente por el navegador/red
    // Pero mantenemos la función para compatibilidad
    return true;
  }
};
