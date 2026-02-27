const LMS_KEY = 'olea_lms_db';

const initialCourses = [
  {
    id: "COURSE-001",
    title: "Seguridad en Alturas y EPP",
    category: "SEGURIDAD",
    duration: "2h 30m",
    lessons: 5,
    roles: ["TECHNICIAN", "OPERATIONS", "ADMIN"],
    thumbnail: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=400",
    description: "Protocolos obligatorios para trabajos en alturas y uso correcto del equipo de protección personal.",
    content: [
      { id: 1, title: "Introducción a la normativa", type: "VIDEO", duration: "10 min" },
      { id: 2, title: "Inspección de Arneses", type: "PDF", duration: "5 min" },
      { id: 3, title: "Puntos de Anclaje Seguro", type: "VIDEO", duration: "15 min" }
    ],
    exam: {
      questions: [
        { id: 1, text: "¿Cada cuánto debe inspeccionarse un arnés?", options: ["Cada año", "Antes de cada uso", "Cada 6 meses"], correct: 1 },
        { id: 2, text: "¿Cuál es la altura mínima para requerir protección?", options: ["1.50m", "1.80m", "2.00m"], correct: 1 }
      ]
    }
  },
  {
    id: "COURSE-002",
    title: "Mantenimiento de Bombas Olea V3",
    category: "TÉCNICO",
    duration: "4h",
    lessons: 8,
    roles: ["TECHNICIAN"],
    thumbnail: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=400",
    description: "Guía técnica avanzada para el despiece y mantenimiento preventivo de la serie V3.",
    content: [],
    exam: { questions: [] }
  },
  {
    id: "COURSE-003",
    title: "Cierre de Ventas Enterprise",
    category: "COMERCIAL",
    duration: "1h 45m",
    lessons: 3,
    roles: ["SALES"],
    thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=400",
    description: "Técnicas de negociación y cierre para contratos multi-tenant.",
    content: [],
    exam: { questions: [] }
  }
];

export const lmsService = {
  async getAllAdmin() {
    const data = localStorage.getItem(LMS_KEY + '_raw');
    return data ? JSON.parse(data) : initialCourses;
  },

  async getCourses(userRole) {
    const adminCourses = await this.getAllAdmin();
    const data = localStorage.getItem(LMS_KEY);
    const progress = data ? JSON.parse(data) : {};
    
    return adminCourses
      .filter(c => c.roles.includes(userRole))
      .map(c => ({
        ...c,
        progress: progress[c.id]?.percent || 0,
        completed: progress[c.id]?.completed || false
      }));
  },

  async saveCourse(course) {
    const courses = await this.getAllAdmin();
    let updated;
    if (course.id) {
      updated = courses.map(c => c.id === course.id ? course : c);
    } else {
      const newCourse = { 
        ...course, 
        id: `COURSE-${Math.floor(100 + Math.random() * 900)}`,
        content: course.content || [],
        exam: course.exam || { questions: [] }
      };
      updated = [...courses, newCourse];
    }
    localStorage.setItem(LMS_KEY + '_raw', JSON.stringify(updated));
    return true;
  },

  async updateProgress(courseId, percent, completed = false) {
    const data = localStorage.getItem(LMS_KEY);
    const progress = data ? JSON.parse(data) : {};
    
    progress[courseId] = { percent, completed, lastDate: new Date().toISOString() };
    localStorage.setItem(LMS_KEY, JSON.stringify(progress));
    return true;
  }
};
