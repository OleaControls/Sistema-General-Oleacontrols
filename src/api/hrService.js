const HR_KEY = 'olea_hr_db';
const LMS_KEY = 'olea_lms_db';
const CATEGORIES_KEY = 'olea_hr_categories';

const initialEmployees = [
  {
    id: "EMP-001",
    name: "Roberto Olea",
    role: "ADMIN",
    position: "Director General",
    department: "Administración Central",
    email: "roberto@oleacontrols.com",
    phone: "+52 442 000 0000",
    joinDate: "2020-01-01",
    status: "ACTIVE",
    avatar: "https://ui-avatars.com/api/?name=Roberto+Olea&background=0D9488&color=fff",
    tenantId: "olea-mx",
    location: "CDMX, MX",
    reportsTo: null
  },
  {
    id: "EMP-002",
    name: "Ana Admin",
    role: "HR",
    position: "Gerente de Capital Humano",
    department: "Recursos Humanos",
    email: "ana@oleacontrols.com",
    phone: "+52 442 987 6543",
    joinDate: "2022-06-10",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
    tenantId: "olea-mx",
    location: "CDMX, MX",
    reportsTo: "EMP-001"
  },
  {
    id: "EMP-003",
    name: "Gabriel Tech",
    role: "TECHNICIAN",
    position: "Líder de Cuadrilla",
    department: "Operaciones de Campo",
    email: "gabriel@oleacontrols.com",
    phone: "+52 442 123 4567",
    joinDate: "2023-01-15",
    status: "ACTIVE",
    avatar: "https://github.com/shadcn.png",
    tenantId: "olea-mx",
    location: "Querétaro, MX",
    reportsTo: "EMP-001"
  }
];

const initialCategories = [
    "Técnico Junior",
    "Técnico Senior",
    "Supervisor de Obra",
    "Líder de Cuadrilla",
    "Gerente de Operaciones",
    "Director General",
    "Analista de RH",
    "Ejecutivo de Ventas",
    "Coordinador CRM"
];

export const hrService = {
  async getEmployees() {
    const data = localStorage.getItem(HR_KEY);
    if (!data) {
      localStorage.setItem(HR_KEY, JSON.stringify(initialEmployees));
      return initialEmployees;
    }
    return JSON.parse(data);
  },

  async getEmployeeDetail(id) {
    const employees = await this.getEmployees();
    const emp = employees.find(e => e.id === id);
    if (!emp) return null;

    // Vincular con certificaciones del LMS
    const lmsData = localStorage.getItem(LMS_KEY);
    const progress = lmsData ? JSON.parse(lmsData) : {};
    
    const certifications = Object.entries(progress)
      .filter(([courseId, data]) => data.completed)
      .map(([courseId, data]) => ({
        id: courseId,
        date: data.lastDate,
        name: courseId.includes('001') ? 'Seguridad en Alturas' : 'Capacitación Técnica'
      }));

    return { ...emp, certifications };
  },

  async saveEmployee(employeeData) {
    const employees = await this.getEmployees();
    const newId = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
    const newEmployee = {
      ...employeeData,
      id: newId,
      status: 'ACTIVE',
      joinDate: employeeData.joinDate || new Date().toISOString().split('T')[0],
      avatar: employeeData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(employeeData.name)}&background=random`,
      reportsTo: employeeData.reportsTo || null
    };
    
    const updatedEmployees = [...employees, newEmployee];
    localStorage.setItem(HR_KEY, JSON.stringify(updatedEmployees));
    
    // Also create platform credentials if password provided
    if (employeeData.password) {
        const credentialsKey = 'olea_credentials';
        const credentialsData = localStorage.getItem(credentialsKey);
        const credentials = credentialsData ? JSON.parse(credentialsData) : [];
        
        credentials.push({
            email: employeeData.email,
            password: employeeData.password,
            role: employeeData.role,
            name: employeeData.name,
            id: newId
        });
        
        localStorage.setItem(credentialsKey, JSON.stringify(credentials));
    }
    
    return newEmployee;
  },

  async updateEmployee(id, updatedData) {
    const employees = await this.getEmployees();
    const updatedEmployees = employees.map(emp => 
        emp.id === id ? { ...emp, ...updatedData } : emp
    );
    localStorage.setItem(HR_KEY, JSON.stringify(updatedEmployees));

    // Si cambió el rol, actualizar credenciales
    if (updatedData.role) {
        const credentialsKey = 'olea_credentials';
        const credentialsData = localStorage.getItem(credentialsKey);
        if (credentialsData) {
            const credentials = JSON.parse(credentialsData);
            const updatedCreds = credentials.map(c => 
                c.id === id ? { ...c, role: updatedData.role } : c
            );
            localStorage.setItem(credentialsKey, JSON.stringify(updatedCreds));
        }
    }
    return true;
  },

  // Gestión de Categorías / Puestos
  async getCategories() {
    const data = localStorage.getItem(CATEGORIES_KEY);
    if (!data) {
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(initialCategories));
        return initialCategories;
    }
    return JSON.parse(data);
  },

  async saveCategory(categoryName) {
    const categories = await this.getCategories();
    if (!categories.includes(categoryName)) {
        const updated = [...categories, categoryName];
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
        return updated;
    }
    return categories;
  }
};
