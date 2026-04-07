import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Sparkles, Flame, Clock, PlayCircle, Award, 
  Search, LayoutGrid, ChevronRight, LogOut, Zap, 
  TrendingUp, Star, History, ArrowRight, BookMarked,
  CheckCircle2, Filter, GraduationCap, BookOpen,
  Calendar, BarChart3, Bell, User, Settings, HelpCircle,
  MoreVertical, Share2, Bookmark, Play
} from 'lucide-react';
import { lmsService } from '@/api/lmsService';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';
import QuickQuik from '../components/QuickQuik';

export default function AcademyHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickQuik, setShowQuickQuik] = useState(false);
  const [filter, setFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [stats, setStats] = useState({
    xp: 1250,
    level: 14,
    streak: 12,
    completed: 0,
    certs: 0
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await lmsService.getCourses(user.roles?.[0] || 'COLLABORATOR');
      setCourses(data);
      const completed = data.filter(c => c.completed).length;
      setStats(prev => ({ ...prev, completed, certs: completed }));
    } catch (error) {
      console.error("Error loading academy data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'Todos') return matchesSearch;
    if (filter === 'Pendientes') return matchesSearch && !course.completed;
    if (filter === 'Completados') return matchesSearch && course.completed;
    return matchesSearch;
  });

  const inProgressCourses = courses.filter(c => c.progress > 0 && c.progress < 100);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 🏛️ Academy Sidebar - Functional & Professional */}
      <aside className="hidden xl:flex w-72 flex-col bg-white border-r border-slate-200 sticky top-0 h-screen shrink-0 overflow-y-auto custom-scrollbar">
        <div className="p-8 border-b border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">Olea Academy</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal de Aprendizaje</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-8">
          <div className="space-y-1">
            <SidebarLink icon={LayoutGrid} label="Panel Principal" active />
            <SidebarLink icon={BookOpen} label="Mi Biblioteca" />
            <SidebarLink icon={Award} label="Certificaciones" />
            <SidebarLink icon={TrendingUp} label="Leaderboard" />
          </div>

          <div className="space-y-4">
            <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categorías</h4>
            <div className="space-y-1">
              <SidebarLink label="Seguridad Industrial" count={4} />
              <SidebarLink label="Mecánica de Precisión" count={7} />
              <SidebarLink label="Protocolos Olea" count={12} />
              <SidebarLink label="Soft Skills" count={3} />
            </div>
          </div>

          <div className="bg-indigo-50/50 rounded-3xl p-6 space-y-4 border border-indigo-100/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-indigo-600 uppercase">Nivel Actual</span>
              <span className="text-xs font-black text-indigo-900">{stats.level}</span>
            </div>
            <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 w-3/4" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Faltan 250 XP para el nivel 15</p>
          </div>
        </nav>

        <div className="p-6 border-t border-slate-100 space-y-4">
          <SidebarLink icon={Settings} label="Configuración" />
          <SidebarLink icon={HelpCircle} label="Ayuda y Soporte" />
          <div className="pt-4 flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl">
            <img src={user.avatar} className="h-9 w-9 rounded-xl object-cover border-2 border-white shadow-sm" alt="" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-slate-900 truncate leading-none">{user.name}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Técnico Senior</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 🚀 Main Learning Ecosystem */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 🗺️ Header / Global Stats Bar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-6 lg:gap-10">
             <div className="xl:hidden flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-indigo-600" />
                <span className="font-black text-sm uppercase">Olea Academy</span>
             </div>
             <div className="hidden md:flex items-center gap-6">
                <StatInline icon={Flame} value={`${stats.streak} Días`} label="Racha" color="text-orange-500" />
                <div className="h-6 w-px bg-slate-200" />
                <StatInline icon={Trophy} value={stats.xp.toLocaleString()} label="Puntos" color="text-amber-500" />
                <div className="h-6 w-px bg-slate-200" />
                <StatInline icon={CheckCircle2} value={stats.completed} label="Completados" color="text-emerald-500" />
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar cursos..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl text-xs font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none w-64 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="p-2.5 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <button 
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-50 rounded-xl"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="p-6 md:p-10 space-y-12">
          
          {/* 👋 Welcome & Hero Widget */}
          <section className="relative overflow-hidden rounded-[2.5rem] bg-indigo-700 p-8 md:p-12 text-white shadow-2xl shadow-indigo-900/10">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
               <Sparkles className="h-64 w-64" />
            </div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                   <Zap className="h-4 w-4 text-amber-300" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Capacitación Técnica Avanzada</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
                  Hola, {user.name.split(' ')[0]}. 👋 <br/>
                  <span className="text-indigo-200">Continúa donde lo dejaste.</span>
                </h2>
                <div className="flex flex-wrap gap-4">
                  <button className="bg-white text-indigo-700 px-8 py-4 rounded-2xl font-black text-sm hover:shadow-xl transition-all active:scale-95 flex items-center gap-2">
                    CONTINUAR APRENDIENDO
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setShowQuickQuik(true)}
                    className="bg-indigo-600/50 border border-white/20 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all"
                  >
                    QUICK QUIZ (+100 XP)
                  </button>
                </div>
              </div>

              <div className="hidden lg:flex flex-col items-center justify-center p-8 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 text-center">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-6">Tu actividad semanal</p>
                <div className="flex items-end gap-3 h-24">
                  {[40, 70, 45, 90, 60, 30, 80].map((h, i) => (
                    <div key={i} className="w-4 bg-white/20 rounded-t-md relative group cursor-pointer" style={{ height: `${h}%` }}>
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-indigo-700 text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                         {h}m
                       </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 w-full mt-4 text-[9px] font-bold text-indigo-200/60 uppercase">
                  <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span><span>Do</span>
                </div>
              </div>
            </div>
          </section>

          {showQuickQuik && <QuickQuik onClose={() => setShowQuickQuik(false)} onComplete={(xp) => setStats(s => ({...s, xp: s.xp + xp}))} />}

          {/* 🔄 Continue Watching Section */}
          {inProgressCourses.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <History className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase text-xs tracking-widest">Continuar Aprendizaje</h3>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                {inProgressCourses.map(course => (
                  <div key={course.id} className="min-w-[320px] md:min-w-[400px] bg-white rounded-[2rem] border border-slate-200 p-4 flex gap-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer" onClick={() => navigate(`/academy/course/${course.id}`)}>
                    <div className="h-24 w-24 rounded-2xl overflow-hidden shrink-0">
                      <img src={course.thumbnail} className="h-full w-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h4 className="font-black text-slate-900 text-sm line-clamp-1">{course.title}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{course.category}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black">
                           <span className="text-indigo-600">{course.progress}%</span>
                           <span className="text-slate-400">Restan 4 temas</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-600" style={{ width: `${course.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 🔍 Content Filter & Explorer */}
          <section className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Catálogo de Especialización</h3>
                <p className="text-sm text-slate-500 font-medium">Explora los cursos obligatorios y electivos disponibles.</p>
              </div>
              <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                {['Todos', 'Pendientes', 'Completados'].map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setFilter(tab)}
                    className={cn(
                      "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                      filter === tab ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-slate-900"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading ? (
                [1,2,3,4,5,6].map(i => <div key={i} className="h-[450px] bg-white rounded-[2.5rem] animate-pulse" />)
              ) : filteredCourses.map(course => (
                <ProfessionalCourseCard 
                  key={course.id} 
                  course={course} 
                  onClick={() => navigate(`/academy/course/${course.id}`)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SidebarLink({ icon: Icon, label, active, count }) {
  return (
    <button className={cn(
      "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all group",
      active ? "bg-slate-950 text-white shadow-xl shadow-slate-200" : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
    )}>
      <div className="flex items-center gap-3">
        {Icon && <Icon className={cn("h-4 w-4", active ? "text-indigo-400" : "text-slate-400 group-hover:text-indigo-500")} />}
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span className={cn("px-2 py-0.5 rounded-lg text-[10px]", active ? "bg-white/10" : "bg-slate-100 text-slate-500")}>
          {count}
        </span>
      )}
    </button>
  );
}

function StatInline({ icon: Icon, value, label, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
        <Icon className="h-4 w-4 fill-current" />
      </div>
      <div>
        <p className="text-xs font-black text-slate-900 leading-none">{value}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">{label}</p>
      </div>
    </div>
  );
}

function ProfessionalCourseCard({ course, onClick }) {
  const isCompleted = course.completed;
  const inProgress = (course.progress || 0) > 0 && !isCompleted;

  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 cursor-pointer flex flex-col h-full active:scale-[0.99]"
    >
      <div className="relative aspect-video overflow-hidden">
        <img src={course.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
        
        <div className="absolute top-6 left-6 flex gap-2">
          <span className="bg-white/90 backdrop-blur-md text-slate-900 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
            {course.category}
          </span>
        </div>

        {isCompleted && (
          <div className="absolute top-6 right-6 bg-emerald-500 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/20 backdrop-blur-[2px]">
           <div className="h-14 w-14 bg-white rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
              <Play className="h-6 w-6 text-indigo-600 fill-indigo-600" />
           </div>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
             <BookMarked className="h-3 w-3" />
             <span>Curso Técnico</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 uppercase tracking-tight">
            {course.title}
          </h3>
          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </div>

        <div className="flex items-center justify-between text-[10px] font-black text-slate-400 border-y border-slate-100 py-5">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span>{course.duration || '2.5h'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 fill-slate-100" />
            <span>{course.level || 'Básico'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            <span>128</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
             <span>Tu Progreso</span>
             <span className={isCompleted ? "text-emerald-500" : "text-indigo-600"}>{course.progress || 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
             <div 
               className={cn("h-full rounded-full transition-all duration-1000", isCompleted ? "bg-emerald-500" : "bg-indigo-600")} 
               style={{ width: `${course.progress || 0}%` }} 
             />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
           <button className={cn(
             "flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
             isCompleted ? "bg-slate-100 text-slate-500" : "bg-slate-950 text-white hover:bg-indigo-600 shadow-xl shadow-indigo-100"
           )}>
             {isCompleted ? 'Volver a ver' : inProgress ? 'Continuar' : 'Empezar ahora'}
           </button>
           <button className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-indigo-600 transition-colors">
              <Bookmark className="h-4 w-4" />
           </button>
        </div>
      </div>
    </div>
  );
}
