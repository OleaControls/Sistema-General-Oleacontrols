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
    if (!response.ok) throw new Error('Error al guardar empleado');
    return response.json();
  },

  async updateEmployee(id, updatedData) {
    const response = await fetch('/api/employees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updatedData })
    });
    if (!response.ok) throw new Error('Error al actualizar empleado');
    return response.json();
  },

  // Temporales hasta mover categorías también a Prisma
  async getCategories() {
    const data = localStorage.getItem('olea_hr_categories');
    return data ? JSON.parse(data) : [];
  },

  async saveCategory(categoryName) {
    const categories = await this.getCategories();
    if (!categories.includes(categoryName)) {
        const updated = [...categories, categoryName];
        localStorage.setItem('olea_hr_categories', JSON.stringify(updated));
        return updated;
    }
    return categories;
  }
};
