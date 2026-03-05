export const hrService = {
  async getEmployees() {
    const response = await fetch('/api/employees');
    if (!response.ok) throw new Error('Error al obtener empleados');
    return response.json();
  },

  async getEmployeeDetail(id) {
    const employees = await this.getEmployees();
    return employees.find(e => e.id === id) || null;
  },

  async saveEmployee(employeeData) {
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.error || 'Error al guardar empleado');
    }
    return response.json();
  },

  async updateEmployee(id, updatedData) {
    const response = await fetch('/api/employees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch(`/api/employees?id=${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al eliminar empleado');
    }
    return response.json();
  },

  async getCategories() {
    const response = await fetch('/api/categories');
    if (!response.ok) throw new Error('Error al obtener categorías');
    return response.json();
  },

  async saveCategory(categoryName) {
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName })
    });
    if (!response.ok) throw new Error('Error al guardar categoría');
    return response.json();
  }
};
