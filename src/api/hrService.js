const HR_KEY = 'olea_hr_db';
const LMS_KEY = 'olea_lms_db';

const initialEmployees = [
  {
    id: "EMP-001",
    name: "Gabriel Tech",
    role: "TECHNICIAN",
    department: "Operaciones de Campo",
    email: "gabriel@oleacontrols.com",
    phone: "+52 442 123 4567",
    joinDate: "2023-01-15",
    status: "ACTIVE",
    avatar: "https://github.com/shadcn.png",
    tenantId: "olea-mx",
    location: "Querétaro, MX"
  },
  {
    id: "EMP-002",
    name: "Ana Admin",
    role: "ADMIN",
    department: "Administración Central",
    email: "ana@oleacontrols.com",
    phone: "+52 442 987 6543",
    joinDate: "2022-06-10",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
    tenantId: "olea-mx",
    location: "CDMX, MX"
  }
];

export const hrService = {
  async getEmployees() {
    return initialEmployees;
  },

  async getEmployeeDetail(id) {
    const emp = initialEmployees.find(e => e.id === id);
    if (!emp) return null;

    // Vincular con certificaciones del LMS (datos reales del localStorage)
    const lmsData = localStorage.getItem(LMS_KEY);
    const progress = lmsData ? JSON.parse(lmsData) : {};
    
    // Filtramos solo lo que está completado al 100%
    const certifications = Object.entries(progress)
      .filter(([courseId, data]) => data.completed)
      .map(([courseId, data]) => ({
        id: courseId,
        date: data.lastDate,
        name: courseId.includes('001') ? 'Seguridad en Alturas' : 'Capacitación Técnica'
      }));

    return { ...emp, certifications };
  }
};
