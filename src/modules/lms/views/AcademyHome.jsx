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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <div className="min-h-screen bg-gray-50 text-gray-900 selection:bg-primary/30 pb-10">
      {/* Academy Navbar */}
      <nav className="border-b bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/academy')}>
              <div className="bg-gradient-to-tr from-primary to-blue-600 p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-md">
                <Sparkles className="h-4 w-4 md:h-5 md:h-5 text-white" />
              </div>
              <span className="text-lg md:text-xl font-black tracking-tighter text-gray-900 leading-none">OLEA <span className="text-primary">ACADEMY</span></span>
            </div>
            
            <div className="hidden md:flex items-center gap-6 text-sm font-bold text-gray-500">
              <a href="#" className="text-primary">Explorar</a>
              <a href="#" className="hover:text-primary transition-colors">Progreso</a>
              <a href="#" className="hover:text-primary transition-colors">Certificaciones</a>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden lg:flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-full text-xs font-black text-amber-600 animate-pulse">
              <Flame className="h-4 w-4 fill-current" /> {stats.streak} DÍAS DE RACHA
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-6 border-l border-gray-200">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-black text-gray-900 truncate max-w-[100px]">{user.name}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">{user.role}</p>
              </div>
              <img src={user.avatar} className="h-8 w-8 rounded-full border border-gray-200" alt="Avatar" />
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button onClick={() => { logout(); navigate('/login'); }} className="hidden md:block p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b p-4 space-y-4 animate-in slide-in-from-top-4 duration-300">
             <div className="grid grid-cols-3 gap-2">
                <div className="bg-amber-50 p-3 rounded-2xl text-center">
                  <Flame className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                  <span className="text-[10px] font-black text-amber-700">{stats.streak}D</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-2xl text-center">
                  <Trophy className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <span className="text-[10px] font-black text-blue-700">{stats.completed}</span>
                </div>
                <div className="bg-purple-50 p-3 rounded-2xl text-center" onClick={() => { logout(); navigate('/login'); }}>
                  <LogOut className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <span className="text-[10px] font-black text-red-700">SALIR</span>
                </div>
             </div>
             <div className="space-y-2">
                <button className="w-full text-left p-4 bg-gray-50 rounded-2xl font-black text-xs text-primary uppercase tracking-widest border border-primary/10">Explorar Cursos</button>
                <button className="w-full text-left p-4 bg-white border rounded-2xl font-black text-xs text-gray-600 uppercase tracking-widest hover:bg-gray-50 transition-all">Mi Progreso</button>
                <button className="w-full text-left p-4 bg-white border rounded-2xl font-black text-xs text-gray-600 uppercase tracking-widest hover:bg-gray-50 transition-all">Certificaciones</button>
             </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="relative pt-8 md:pt-16 pb-12 md:pb-24 overflow-hidden bg-white border-b">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl aspect-square bg-primary/5 blur-[120px] rounded-full -z-10" />
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center text-center lg:text-left">
          <div className="space-y-6 md:space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl shadow-sm mx-auto lg:mx-0">
              <Trophy className="h-3.5 w-3.5 md:h-4 md:h-4 text-amber-500" />
              <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-amber-700">Impulsando el Talento Olea</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tighter text-gray-900">
              Domina la <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">Ingeniería</span> del Mañana.
            </h1>
            <p className="text-lg md:text-xl text-gray-600 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Tu portal de especialización técnica. Aprende, valida y certifícate en los estándares globales de Olea Controls.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-primary transition-all shadow-xl shadow-gray-200 w-full sm:w-auto">
                CONTINUAR APRENDIENDO
              </button>
              <button className="bg-white border-2 border-primary/10 text-primary px-8 py-4 rounded-2xl font-black text-sm hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
                <Award className="h-4 w-4" /> RECURSOS HR
              </button>
            </div>
          </div>

          {/* Stats Highlight */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 relative z-10 max-w-md mx-auto lg:max-w-none">
            <StatBox label="Completados" value={stats.completed} color="text-blue-600" bg="bg-blue-50" />
            <StatBox label="Certs" value={stats.certs} color="text-purple-600" bg="bg-purple-50" />
            <StatBox label="Puntos Olea" value={stats.xp.toLocaleString()} color="text-emerald-600" bg="bg-emerald-50" />
            <StatBox label="Nivel" value="Lvl 14" color="text-orange-600" bg="bg-orange-50" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 space-y-16 md:space-y-24">
        
        {/* Announcements & Quick Quik */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 bg-gray-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 text-white relative overflow-hidden group">
            <div className="hidden md:block absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Sparkles className="h-64 w-64" />
            </div>
            <div className="relative z-10 space-y-4 md:space-y-6">
              <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase inline-block">Comunicado Importante</span>
              <h2 className="text-2xl md:text-4xl font-black leading-tight max-w-lg">Nueva Política de Seguridad 2026: Actualización Obligatoria</h2>
              <p className="text-gray-400 font-medium max-w-md text-sm md:text-base">Hemos actualizado los protocolos de respuesta rápida. Lee el documento y obtén 50 XP extras esta semana.</p>
              <button className="bg-white text-gray-900 px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-primary hover:text-white transition-all w-full sm:w-auto">
                LEER Y RECLAMAR XP
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 text-white space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase">Quick Quik</span>
                <Clock className="h-5 w-5 opacity-60" />
              </div>
              <h3 className="text-xl md:text-2xl font-black leading-tight">¿Qué tanto sabes de Olea Controls?</h3>
              <p className="text-white/70 text-xs md:text-sm font-medium mt-2">3 preguntas rápidas • 100 XP en juego</p>
            </div>
            <button 
              onClick={() => setShowQuickQuik(true)}
              className="w-full bg-white text-indigo-700 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-indigo-50 transition-all"
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
        <div className="space-y-8 md:space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-gray-900">Cursos Generales</h2>
              <p className="text-gray-500 font-medium text-xs md:text-sm">Contenido esencial para todo el equipo Olea.</p>
            </div>
            <button className="text-primary font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all self-start sm:self-auto">
              Ver todos <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {generalCourses.map((course) => (
              <CourseCard key={course.id} course={course} navigate={navigate} />
            ))}
          </div>
        </div>

        {/* Area Courses */}
        <div className="space-y-8 md:space-y-12 pb-10 md:pb-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-gray-900 truncate">Especialización: {user.role}</h2>
              <p className="text-gray-500 font-medium text-xs md:text-sm">Ruta de aprendizaje diseñada para tu crecimiento.</p>
            </div>
            <button className="text-primary font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all self-start sm:self-auto">
              Ver todos <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {areaCourses.length > 0 ? areaCourses.map((course) => (
              <CourseCard key={course.id} course={course} navigate={navigate} />
            )) : (
              <div className="col-span-full bg-white border border-dashed border-gray-300 rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-12 text-center space-y-4">
                <div className="bg-gray-50 h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                  <LayoutGrid className="h-6 w-6 md:h-8 md:w-8" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 uppercase text-[10px] md:text-xs">Sin cursos específicos asignados aún</h4>
                  <p className="text-gray-500 text-[10px] md:text-xs font-medium">RH subirá contenido para tu área próximamente.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatBox({ label, value, color, bg }) {
  return (
    <div className={cn("border border-transparent p-4 md:p-6 rounded-2xl md:rounded-[2rem] transition-all group flex flex-col justify-center", bg)}>
      <p className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 truncate">{label}</p>
      <p className={cn("text-xl md:text-3xl font-black tracking-tighter", color)}>{value}</p>
    </div>
  );
}

function CourseCard({ course, navigate }) {
  return (
    <div 
      onClick={() => navigate(`/academy/course/${course.id}`)}
      className="group relative bg-white border border-gray-100 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden hover:border-primary/30 hover:shadow-2xl hover:shadow-gray-200 transition-all cursor-pointer shadow-md"
    >
      <div className="aspect-video relative overflow-hidden bg-gray-100">
        <img src={course.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent opacity-80" />
        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
          <div className="bg-white text-gray-900 text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
            {course.category}
          </div>
        </div>
        {course.xpReward && (
          <div className="absolute top-4 right-4 md:top-6 md:right-6">
            <div className="bg-emerald-500 text-white text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1">
              +{course.xpReward} XP
            </div>
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 space-y-4 md:space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg md:text-xl font-black leading-tight text-gray-900 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          <p className="text-xs md:text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </div>

        <div className="flex items-center justify-between text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <span className="flex items-center gap-1.5"><Clock className="h-3 md:h-3.5 w-3 md:w-3.5" /> {course.duration}</span>
          <span className="flex items-center gap-1.5"><LayoutGrid className="h-3 md:h-3.5 w-3 md:w-3.5" /> {course.lessons} LECCIONES</span>
        </div>

        <div className="space-y-2 md:space-y-3 pt-1 md:pt-2">
          <div className="flex justify-between items-end">
            <span className="text-[8px] md:text-[10px] font-black uppercase text-primary tracking-tighter">Progreso</span>
            <span className="text-xs md:text-sm font-black text-gray-900">{course.progress || 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-50 md:bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full" style={{ width: `${course.progress || 0}%` }} />
          </div>
        </div>

        <button className="w-full bg-gray-50 text-gray-600 border group-hover:bg-primary group-hover:text-white group-hover:border-primary py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
          <PlayCircle className="h-4 w-4" /> INICIAR AHORA
        </button>
      </div>
    </div>
  );
}
