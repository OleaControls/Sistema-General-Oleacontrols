import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlayCircle, Award, Clock, BookOpen, CheckCircle2, Search, 
  Sparkles, Flame, Trophy, TrendingUp, Star, Layout, 
  ArrowRight, BookMarked, GraduationCap, Users, History, Zap
} from 'lucide-react';
import { lmsService } from '@/api/lmsService';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

export default function CourseCatalog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCourses();
  }, [user.roles]);

  const loadCourses = async () => {
    setLoading(true);
    // Nota: El servicio ya filtra por roles si es necesario, 
    // pero aquí traemos lo que el usuario puede ver.
    const data = await lmsService.getCourses(user.roles?.[0] || 'COLLABORATOR');
    setCourses(data);
    setLoading(false);
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'Todos') return matchesSearch;
    if (filter === 'Pendientes') return matchesSearch && !course.completed;
    if (filter === 'Completados') return matchesSearch && course.completed;
    return matchesSearch;
  });

  const stats = {
    inProgress: courses.filter(c => c.progress > 0 && c.progress < 100).length,
    completed: courses.filter(c => c.completed).length,
    totalXp: courses.reduce((acc, c) => acc + (c.completed ? (c.xpReward || 100) : 0), 0)
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      
      {/* 🚀 Hero Section - Pro Max Design */}
      <section className="relative overflow-hidden rounded-[3rem] bg-slate-950 p-8 md:p-16 text-white shadow-2xl shadow-blue-900/20 group">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse duration-[6000ms]" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl backdrop-blur-md">
              <Zap className="h-4 w-4 text-blue-400 fill-blue-400/20" />
              <span className="text-xs font-black uppercase tracking-widest text-blue-400">Ruta de Aprendizaje Activa</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
                Impulsa tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Potencial</span> Técnico.
              </h1>
              <p className="text-slate-400 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
                Bienvenido a la Academia Olea. Tienes <span className="text-white font-bold">{stats.inProgress} cursos</span> en curso y <span className="text-white font-bold">{courses.length - stats.completed} desafíos</span> esperándote.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-black text-sm hover:bg-blue-400 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center gap-2 group/btn">
                CONTINUAR ÚLTIMO CURSO
                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-4 px-6 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm">
                <Trophy className="h-6 w-6 text-amber-400" />
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Puntos Olea</p>
                  <p className="text-xl font-black text-white leading-none mt-1">{stats.totalXp.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <header className="col-span-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Tu actividad reciente</header>
            <HeroStatCard icon={History} label="Horas de Estudio" value="12.5h" color="text-blue-400" />
            <HeroStatCard icon={CheckCircle2} label="Completados" value={stats.completed} color="text-emerald-400" />
            <HeroStatCard icon={Flame} label="Racha Actual" value="5 Días" color="text-orange-400" />
            <HeroStatCard icon={Star} label="Certificados" value={stats.completed} color="text-purple-400" />
          </div>
        </div>
      </section>

      {/* 🔍 Search & Filters Bar */}
      <div className="sticky top-4 z-40 bg-white/80 backdrop-blur-2xl border border-slate-200/60 p-4 md:p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 w-full lg:w-auto">
          {['Todos', 'Pendientes', 'Completados'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setFilter(tab)}
              className={cn(
                "flex-1 lg:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                filter === tab 
                  ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative group w-full lg:w-[400px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por título, tecnología o área..." 
            className="w-full pl-12 pr-6 py-4 bg-slate-100/50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 📚 Course Grid - Modern Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <CourseCard 
              key={course.id} 
              course={course} 
              onClick={() => navigate(`/academy/course/${course.id}`)} 
            />
          ))
        ) : (
          <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem]">
             <div className="bg-white p-6 rounded-full w-fit mx-auto shadow-sm">
                <BookOpen className="h-12 w-12 text-slate-300" />
             </div>
             <p className="text-slate-500 font-bold">No se encontraron cursos que coincidan con tu búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroStatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm group/card hover:bg-slate-900/60 transition-all cursor-default">
      <Icon className={cn("h-5 w-5 mb-3 transition-transform group-hover/card:scale-110", color)} />
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-white mt-1">{value}</p>
    </div>
  );
}

function CourseCard({ course, onClick }) {
  const isCompleted = course.completed;
  const inProgress = course.progress > 0 && !isCompleted;

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white rounded-[2.5rem] border border-slate-200/60 overflow-hidden hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer flex flex-col h-full active:scale-[0.98]"
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={course.thumbnail} 
          alt={course.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
        
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border border-white/20">
            {course.category}
          </span>
        </div>

        {isCompleted && (
          <div className="absolute top-4 right-4 bg-emerald-500 text-white p-2.5 rounded-2xl shadow-xl shadow-emerald-500/20 animate-in zoom-in duration-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        )}

        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
           <div className="space-y-1">
              <div className="flex items-center gap-2 text-white/60 text-[10px] font-black uppercase tracking-widest">
                <Clock className="h-3.5 w-3.5" />
                {course.duration}
              </div>
              <h3 className="text-white text-xl font-black leading-tight drop-shadow-md line-clamp-2">
                {course.title}
              </h3>
           </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 flex-1 flex flex-col space-y-6">
        <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
          {course.description}
        </p>

        <div className="flex items-center gap-6 py-4 border-y border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <BookMarked className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Contenido</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{course.lessons} Temas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Nivel</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{course.level || 'General'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tu Progreso</span>
            <span className={cn(
              "text-xs font-black",
              isCompleted ? "text-emerald-600" : "text-blue-600"
            )}>{course.progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                isCompleted ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.3)]"
              )}
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>

        <button className={cn(
          "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95",
          isCompleted 
            ? "bg-slate-100 text-slate-500 hover:bg-slate-200 shadow-slate-100" 
            : "bg-slate-950 text-white hover:bg-blue-600 shadow-slate-200 hover:shadow-blue-500/20"
        )}>
          {isCompleted ? (
            <>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              VER CERTIFICADO
            </>
          ) : (
            <>
              <PlayCircle className={cn("h-5 w-5", inProgress ? "animate-pulse" : "")} />
              {course.progress > 0 ? 'CONTINUAR APRENDIZAJE' : 'INICIAR CURSO'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden h-[500px] animate-pulse">
      <div className="aspect-video bg-slate-200" />
      <div className="p-8 space-y-6">
        <div className="h-6 bg-slate-200 rounded-lg w-3/4" />
        <div className="h-4 bg-slate-100 rounded-lg w-full" />
        <div className="h-4 bg-slate-100 rounded-lg w-5/6" />
        <div className="h-12 bg-slate-200 rounded-2xl w-full mt-auto" />
      </div>
    </div>
  );
}
