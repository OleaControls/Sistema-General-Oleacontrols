import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Award, Clock, BookOpen, CheckCircle2, Search } from 'lucide-react';
import { lmsService } from '@/api/lmsService';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

export default function CourseCatalog() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, [user.role]);

  const loadCourses = async () => {
    setLoading(true);
    const data = await lmsService.getCourses(user.role);
    setCourses(data);
    setLoading(false);
  };

  const navigate = useNavigate();

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Header */}
      <div className="relative bg-gray-900 rounded-[2.5rem] p-8 md:p-12 overflow-hidden text-white shadow-2xl shadow-blue-900/20">
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="text-blue-400 font-black uppercase text-xs tracking-widest">Plan de Capacitación 2026</span>
          <h2 className="text-3xl md:text-5xl font-black leading-tight">Hola, {user.name.split(' ')[0]}.<br/>Desarrolla tus habilidades.</h2>
          <p className="text-gray-400 text-sm md:text-base font-medium max-w-md">
            Tienes {courses.filter(c => !c.completed).length} cursos pendientes en tu ruta de {user.role.toLowerCase()}.
          </p>
        </div>
        <div className="absolute right-[-10%] top-[-20%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="absolute left-[-5%] bottom-[-10%] w-64 h-64 bg-purple-600/10 rounded-full blur-[80px]" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex gap-4">
          {['Todos', 'Pendientes', 'Completados'].map((tab) => (
            <button key={tab} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors">
              {tab}
            </button>
          ))}
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary" />
          <input 
            type="text" 
            placeholder="Buscar curso o certificación..." 
            className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none w-full md:w-64 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-100 animate-pulse rounded-3xl" />)
        ) : courses.map((course) => (
          <div 
            key={course.id} 
            onClick={() => navigate(`/lms/course/${course.id}`)}
            className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/50 transition-all cursor-pointer"
          >
            <div className="relative aspect-video overflow-hidden">
              <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-md uppercase">
                  {course.category}
                </span>
              </div>
              {course.completed && (
                <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="font-black text-gray-900 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {course.description}
                </p>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {course.duration}
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {course.lessons} Lecciones
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                  <span className="text-gray-400">Progreso</span>
                  <span className="text-primary">{course.progress}%</span>
                </div>
                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      course.completed ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>

              <button className={cn(
                "w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                course.completed 
                  ? "bg-gray-50 text-gray-500 hover:bg-gray-100" 
                  : "bg-gray-900 text-white hover:bg-primary shadow-lg shadow-gray-200"
              )}>
                {course.completed ? (
                  <>
                    <Award className="h-4 w-4" />
                    Ver Certificación
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    {course.progress > 0 ? 'Continuar Curso' : 'Iniciar Aprendizaje'}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
