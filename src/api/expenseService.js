export const expenseService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const response = await fetch(`/api/expenses?${params}`);
    if (!response.ok) throw new Error('Error al obtener gastos');
    return response.json();
  },

  async save(expense) {
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    if (!response.ok) throw new Error('Error al guardar gasto');
    return response.json();
  },

  async updateStatus(id, status, comment) {
    const response = await fetch('/api/expenses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, comment })
    });
    if (!response.ok) throw new Error('Error al actualizar estado del gasto');
    return response.json();
  },

  async update(id, updatedData) {
    const response = await fetch('/api/expenses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updatedData })
    });
    if (!response.ok) throw new Error('Error al actualizar gasto');
    return response.json();
  },

  async syncPending() {
    // La sincronización ahora se maneja directamente por el navegador/red
    // Pero mantenemos la función para compatibilidad
    return true;
  }
};
