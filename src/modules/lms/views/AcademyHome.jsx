import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Sparkles, 
  Flame, 
  Clock, 
  PlayCircle, 
  Award, 
  Search,
  LayoutGrid,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { lmsService } from '@/api/lmsService';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';
import QuickQuik from '../components/QuickQuik';

export default function AcademyHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [showQuickQuik, setShowQuickQuik] = useState(false);
  const [stats, setStats] = useState({
    xp: 1250,
    streak: 12,
    completed: 8,
    certs: 3
  });

  useEffect(() => {
    lmsService.getCourses(user.role).then(setCourses);
  }, [user.role]);

  const generalCourses = courses.filter(c => c.type === 'GENERAL' || !c.type);
  const areaCourses = courses.filter(c => c.type === 'AREA');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 selection:bg-primary/30">
      {/* Academy Navbar */}
      <nav className="border-b bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/academy')}>
              <div className="bg-gradient-to-tr from-primary to-blue-600 p-2 rounded-xl shadow-md">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter text-gray-900">OLEA <span className="text-primary">ACADEMY</span></span>
            </div>
            
            <div className="hidden md:flex items-center gap-6 text-sm font-bold text-gray-500">
              <a href="#" className="text-primary">Explorar</a>
              <a href="#" className="hover:text-primary transition-colors">Mi Progreso</a>
              <a href="#" className="hover:text-primary transition-colors">Certificaciones</a>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-full text-xs font-black text-amber-600 animate-pulse">
              <Flame className="h-4 w-4 fill-current" /> {stats.streak} DÍAS DE RACHA
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="text-right">
                <p className="text-xs font-black text-gray-900">{user.name}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{user.role}</p>
              </div>
              <button onClick={() => { logout(); navigate('/login'); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-16 pb-24 overflow-hidden bg-white border-b">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl aspect-square bg-primary/5 blur-[120px] rounded-full -z-10" />
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-2xl shadow-sm">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-700">Impulsando el Talento Olea</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter text-gray-900">
              Domina la <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">Ingeniería</span> del Mañana.
            </h1>
            <p className="text-xl text-gray-600 font-medium max-w-xl">
              Tu portal de especialización técnica. Aprende, valida y certifícate en los estándares globales de Olea Controls.
            </p>
            <div className="flex gap-4">
              <button className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-primary transition-all shadow-xl shadow-gray-200">
                CONTINUAR APRENDIENDO
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary mb-1 ml-1 animate-bounce">¡QUICK QUIK DISPONIBLE!</span>
                <button className="bg-white border-2 border-primary/20 text-primary px-8 py-4 rounded-2xl font-black text-sm hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-2">
                  <Award className="h-4 w-4" /> RECURSOS HR
                </button>
              </div>
            </div>
          </div>

          {/* Stats Highlight */}
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <StatBox label="Cursos Completados" value={stats.completed} color="text-blue-600" bg="bg-blue-50" />
            <StatBox label="Certificaciones" value={stats.certs} color="text-purple-600" bg="bg-purple-50" />
            <StatBox label="Puntos Olea (XP)" value={stats.xp.toLocaleString()} color="text-emerald-600" bg="bg-emerald-50" />
            <StatBox label="Nivel Actual" value="Lvl 14" color="text-orange-600" bg="bg-orange-50" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-20 space-y-24">
        
        {/* Announcements & Quick Quik */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Sparkles className="h-64 w-64" />
            </div>
            <div className="relative z-10 space-y-6">
              <span className="bg-primary/20 text-primary border border-primary/30 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">Comunicado Importante</span>
              <h2 className="text-4xl font-black leading-tight max-w-lg">Nueva Política de Seguridad 2026: Actualización Obligatoria</h2>
              <p className="text-gray-400 font-medium max-w-md">Hemos actualizado los protocolos de respuesta rápida. Lee el documento y obtén 50 XP extras esta semana.</p>
              <button className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-black text-sm hover:bg-primary hover:text-white transition-all">
                LEER Y RECLAMAR XP
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[3rem] p-10 text-white space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="bg-white/20 text-white border border-white/30 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">Quick Quik del Día</span>
                <Clock className="h-5 w-5 opacity-60" />
              </div>
              <h3 className="text-2xl font-black leading-tight">¿Qué tanto sabes de Olea Controls?</h3>
              <p className="text-white/70 text-sm font-medium mt-2">3 preguntas rápidas • 100 XP en juego</p>
            </div>
            <button 
              onClick={() => setShowQuickQuik(true)}
              className="w-full bg-white text-indigo-700 py-4 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all"
            >
              EMPEZAR DESAFÍO
            </button>
          </div>
        </section>

        {showQuickQuik && (
          <QuickQuik 
            onClose={() => setShowQuickQuik(false)} 
            onComplete={(xp) => {
              setStats({ ...stats, xp: stats.xp + xp });
            }}
          />
        )}

        {/* General Courses */}
        <div className="space-y-12">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-gray-900">Cursos Generales</h2>
              <p className="text-gray-500 font-medium text-sm">Contenido esencial para todo el equipo Olea.</p>
            </div>
            <button className="text-primary font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
              Ver todos <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {generalCourses.map((course) => (
              <CourseCard key={course.id} course={course} navigate={navigate} />
            ))}
          </div>
        </div>

        {/* Area Courses */}
        <div className="space-y-12 pb-20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-gray-900">Especialización de Área: {user.role}</h2>
              <p className="text-gray-500 font-medium text-sm">Ruta de aprendizaje diseñada para tu crecimiento profesional.</p>
            </div>
            <button className="text-primary font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
              Ver todos <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {areaCourses.length > 0 ? areaCourses.map((course) => (
              <CourseCard key={course.id} course={course} navigate={navigate} />
            )) : (
              <div className="col-span-full bg-white border border-dashed border-gray-300 rounded-[2.5rem] p-12 text-center space-y-4">
                <div className="bg-gray-50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                  <LayoutGrid className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 uppercase text-xs">Sin cursos específicos asignados aún</h4>
                  <p className="text-gray-500 text-xs font-medium">RH subirá contenido para tu área próximamente.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function CourseCard({ course, navigate }) {
  return (
    <div 
      onClick={() => navigate(`/academy/course/${course.id}`)}
      className="group relative bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden hover:border-primary/30 hover:shadow-2xl hover:shadow-gray-200 transition-all cursor-pointer shadow-md"
    >
      <div className="aspect-video relative overflow-hidden bg-gray-100">
        <img src={course.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent opacity-80" />
        <div className="absolute bottom-6 left-6">
          <div className="bg-white text-gray-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
            {course.category}
          </div>
        </div>
        {course.xpReward && (
          <div className="absolute top-6 right-6">
            <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1">
              +{course.xpReward} XP
            </div>
          </div>
        )}
      </div>

      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-black leading-tight text-gray-900 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </div>

        <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
          <span className="flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> {course.lessons} LECCIONES</span>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black uppercase text-primary tracking-tighter">Progreso</span>
            <span className="text-sm font-black text-gray-900">{course.progress || 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full" style={{ width: `${course.progress || 0}%` }} />
          </div>
        </div>

        <button className="w-full bg-gray-50 text-gray-600 border group-hover:bg-primary group-hover:text-white group-hover:border-primary py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
          <PlayCircle className="h-4 w-4" /> INICIAR AHORA
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value, color, bg }) {
  return (
    <div className={cn("border border-transparent p-6 rounded-[2rem] transition-all group", bg)}>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-3xl font-black tracking-tighter", color)}>{value}</p>
    </div>
  );
}
