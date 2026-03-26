import { apiFetch } from '../lib/api';

export const expenseService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const response = await apiFetch(`/api/expenses?${params}`);
    if (!response.ok) throw new Error('Error al obtener gastos');
    return response.json();
  },

  async save(expenseData) {
    const response = await apiFetch('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Error al guardar gasto');
    }
    
    return response.json();
  },

  async saveExpense(expenseData) {
    return this.save(expenseData);
  },

  async update(id, data) {
    // Si data contiene status/comment lo usamos, si no, es un update genérico
    const body = typeof data === 'string' ? { id, status: data } : { id, ...data };
    const response = await apiFetch('/api/expenses', {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Error al actualizar gasto');
    return response.json();
  },

  async updateStatus(id, status, comment) {
    return this.update(id, { status, comment });
  },

  async delete(id) {
    const response = await apiFetch('/api/expenses', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
    if (!response.ok) throw new Error('Error al eliminar gasto');
    return response.json();
  },

  async deleteExpense(id) {
    return this.delete(id);
  },

  async syncPending() {
    // La sincronización ahora se maneja directamente por el navegador/red
    // Pero mantenemos la función para compatibilidad
    return true;
  }
};
