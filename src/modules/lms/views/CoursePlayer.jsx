import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, PlayCircle, FileText, CheckCircle, Lock, 
  ArrowRight, MonitorPlay, FileSearch, Image as ImageIcon, 
  Camera, BookOpen, Award, Zap, Clock, Star, Info, Menu, X, 
  ChevronRight, Volume2, Settings, Maximize2
} from 'lucide-react';
import { lmsService } from '@/api/lmsService';
import { useAuth } from '@/store/AuthContext';
import ExamModule from '../components/ExamModule';
import { cn } from '@/lib/utils';

export default function CoursePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [showExam, setShowExam] = useState(false);
  const [completedLessons, setCompletedLessons] = useState([]); // Array de strings "mIdx-lIdx"
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      const data = await lmsService.getCourse(id);
      if (data) setCourse(data);
    };
    fetchCourse();
  }, [id]);

  if (!course) return (
    <div className="h-screen w-full flex flex-col items-center justify-center space-y-4 bg-slate-50">
      <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Sincronizando Academia...</p>
    </div>
  );

  // Aplanar lecciones para navegación global
  const allLessons = course.modules.flatMap((m, mIdx) => 
    m.lessons.map((l, lIdx) => ({ ...l, mIdx, lIdx }))
  );
  
  const currentLesson = course.modules[activeModuleIdx]?.lessons[activeLessonIdx];
  const progressPct = Math.round((completedLessons.length / allLessons.length) * 100);

  const handleLessonComplete = () => {
    const key = `${activeModuleIdx}-${activeLessonIdx}`;
    if (!completedLessons.includes(key)) {
      setCompletedLessons([...completedLessons, key]);
    }
    
    // Ir a la siguiente lección
    const currentGlobalIdx = allLessons.findIndex(l => l.mIdx === activeModuleIdx && l.lIdx === activeLessonIdx);
    if (currentGlobalIdx < allLessons.length - 1) {
      const next = allLessons[currentGlobalIdx + 1];
      setActiveModuleIdx(next.mIdx);
      setActiveLessonIdx(next.lIdx);
    } else {
      setShowExam(true);
    }
  };

  const renderPlayer = () => {
    if (!currentLesson) return null;

    if (currentLesson.type === 'VIDEO') {
      const getYouTubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url?.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
      };
      const ytId = getYouTubeId(currentLesson.content);

      return (
        <div className="aspect-video bg-slate-950 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-slate-800">
          {ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1&showinfo=0`}
              className="w-full h-full absolute inset-0 z-10"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={currentLesson.title}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <Zap className="h-12 w-12 opacity-20" />
              <p className="font-black text-xs uppercase tracking-[0.2em]">Video no disponible</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-sm min-h-[500px] flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            {currentLesson.type === 'PDF' ? <FileSearch className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Material de Lectura</span>
            <h3 className="font-black text-slate-900 leading-none mt-1 uppercase text-sm tracking-tight">{currentLesson.title}</h3>
          </div>
        </div>
        
        <div className="prose prose-slate max-w-none flex-1">
          {currentLesson.content ? (
            <div className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
              {currentLesson.content}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
               <FileText className="h-16 w-16 mb-4 opacity-20" />
               <p className="font-black text-xs uppercase tracking-widest">Sin contenido disponible</p>
            </div>
          )}
        </div>

        {currentLesson.type === 'PDF' && currentLesson.content?.startsWith('http') && (
          <a 
            href={currentLesson.content} 
            target="_blank" 
            rel="noreferrer"
            className="mt-8 flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
          >
            <Maximize2 className="h-4 w-4" /> Abrir Documento Completo
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[100] flex flex-col overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* 🧭 Top Navigation Bar */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/academy')}
            className="p-3 hover:bg-slate-50 text-slate-400 hover:text-slate-950 rounded-2xl transition-all group"
            title="Volver a Catálogo"
          >
            <ChevronLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          
          <div className="h-10 w-[1px] bg-slate-200 hidden md:block" />
          
          <div className="hidden md:block">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase tracking-widest">Curso Activo</span>
              <span className="text-[10px] font-bold text-slate-400">ID: {course.id.split('-')[0]}</span>
            </div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none truncate max-w-[400px]">
              {course.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end gap-1.5 mr-4 w-48">
            <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Progreso Global</span>
              <span className="text-blue-600">{progressPct}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div className="h-full bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-all duration-1000" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "p-3 rounded-2xl transition-all",
              isSidebarOpen ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200 hover:border-slate-400"
            )}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 📖 Course Sidebar (Playlist style) */}
        <aside className={cn(
          "absolute inset-y-0 right-0 z-20 w-full md:w-[400px] bg-white border-l border-slate-200 transform transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl flex flex-col",
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="p-8 border-b border-slate-100 shrink-0">
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Contenido del Curso</h4>
             <div className="flex gap-4">
                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Módulos</p>
                   <p className="text-xl font-black text-slate-900 mt-1">{course.modules.length}</p>
                </div>
                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Lecciones</p>
                   <p className="text-xl font-black text-slate-900 mt-1">{allLessons.length}</p>
                </div>
             </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {course.modules.map((module, mIdx) => (
              <div key={mIdx} className="space-y-3">
                <header className="px-4 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{module.title}</span>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{module.lessons.length}</span>
                </header>
                
                <div className="space-y-1">
                  {module.lessons.map((lesson, lIdx) => {
                    const isActive = activeModuleIdx === mIdx && activeLessonIdx === lIdx && !showExam;
                    const isCompleted = completedLessons.includes(`${mIdx}-${lIdx}`);
                    
                    return (
                      <button 
                        key={lIdx}
                        onClick={() => { setActiveModuleIdx(mIdx); setActiveLessonIdx(lIdx); setShowExam(false); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all group",
                          isActive ? "bg-slate-900 shadow-xl shadow-slate-200" : "hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border-2 transition-all",
                          isActive 
                            ? "bg-blue-600 border-blue-600 text-white rotate-6" 
                            : isCompleted 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-500" 
                              : "bg-white border-slate-200 text-slate-400"
                        )}>
                          {isCompleted ? <CheckCircle className="h-5 w-5" /> : (
                            lesson.type === 'VIDEO' ? <PlayCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs font-black leading-tight truncate",
                            isActive ? "text-white" : "text-slate-900"
                          )}>{lesson.title}</p>
                          <div className={cn(
                            "flex items-center gap-2 mt-1",
                            isActive ? "text-slate-400" : "text-slate-400"
                          )}>
                             <span className="text-[9px] font-black uppercase tracking-widest">{lesson.type}</span>
                             <span className="h-1 w-1 rounded-full bg-slate-300" />
                             <span className="text-[9px] font-bold">{lesson.duration} min</span>
                          </div>
                        </div>
                        {isActive && <ChevronRight className="h-4 w-4 text-blue-400 animate-pulse" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button 
              onClick={() => setShowExam(true)}
              disabled={completedLessons.length < allLessons.length}
              className={cn(
                "w-full mt-6 p-6 rounded-[2rem] flex flex-col items-center gap-4 border-2 border-dashed transition-all",
                showExam 
                  ? "bg-slate-950 border-slate-950 text-white shadow-2xl" 
                  : completedLessons.length < allLessons.length 
                    ? "bg-slate-50 border-slate-200 text-slate-300 opacity-60 grayscale cursor-not-allowed" 
                    : "bg-white border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
              )}
            >
               <div className={cn(
                 "h-16 w-16 rounded-3xl flex items-center justify-center shadow-lg transition-transform",
                 showExam ? "bg-blue-600 scale-110" : "bg-white"
               )}>
                  <Award className={cn("h-8 w-8", showExam ? "text-white" : "text-slate-200")} />
               </div>
               <div className="text-center">
                  <h5 className="font-black uppercase tracking-[0.2em] text-[10px]">Examen Final</h5>
                  <p className="text-[9px] font-bold opacity-60 mt-0.5">Valida tus conocimientos</p>
               </div>
            </button>
          </nav>

          <footer className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-3">
                <img src={user.avatar} className="h-10 w-10 rounded-xl border-2 border-white shadow-sm" alt="" />
                <div>
                   <p className="text-xs font-black text-slate-900 leading-none">{user.name.split(' ')[0]}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{user.role}</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-300 hover:text-slate-900 cursor-pointer transition-colors" />
             </div>
          </footer>
        </aside>

        {/* 🎬 Content Area - Immersive Focus */}
        <main className="flex-1 overflow-y-auto bg-white custom-scrollbar relative">
          {!showExam ? (
            <div className="max-w-[1000px] mx-auto p-6 md:p-12 lg:p-20 space-y-12">
              
              <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-blue-100">
                    Módulo {activeModuleIdx + 1}
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Lección {activeLessonIdx + 1}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  {currentLesson?.title}
                </h2>
              </div>

              <div className="animate-in fade-in zoom-in-95 duration-700 delay-200">
                {renderPlayer()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                 <div className="md:col-span-2 space-y-6">
                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-widest">
                      <Info className="h-4 w-4 text-blue-500" /> Sobre esta lección
                    </h4>
                    <p className="text-slate-600 font-medium leading-relaxed text-lg">
                      En esta sección cubriremos los objetivos fundamentales de <strong>{course.title}</strong>. 
                      Asegúrate de completar el video/lectura en su totalidad antes de avanzar, ya que estos temas 
                      son la base para la evaluación final y tu certificación oficial.
                    </p>
                 </div>
                 
                 <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6 h-fit">
                    <div className="flex items-center gap-3">
                       <Zap className="h-6 w-6 text-amber-500 fill-amber-500/20" />
                       <span className="font-black text-xs text-slate-900 uppercase tracking-widest">Meta de HOY</span>
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                          <span>Completadas hoy</span>
                          <span className="text-slate-900">2 / 5</span>
                       </div>
                       <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 w-2/5 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                       </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold italic">"El conocimiento es la mejor herramienta de un técnico Olea."</p>
                 </div>
              </div>

              {/* 🏁 Lesson Footer Action */}
              <div className="pt-12 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Tiempo estimado: {currentLesson?.duration} min</span>
                 </div>
                 <button 
                  onClick={handleLessonComplete}
                  className="w-full sm:w-auto bg-slate-950 text-white px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-4 group/btn"
                 >
                    Completar y Siguiente
                    <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                 </button>
              </div>
            </div>
          ) : (
            <div className="max-w-[800px] mx-auto p-6 md:p-20 text-center space-y-12">
              <div className="space-y-6">
                <div className="h-24 w-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner animate-bounce duration-[3000ms]">
                  <Award className="h-12 w-12 text-emerald-500" />
                </div>
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Evaluación de Certificación</h2>
                <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-lg mx-auto">
                  Has demostrado constancia. Ahora es momento de validar tus conocimientos sobre <strong>{course.title}</strong> para obtener tu insignia oficial.
                </p>
              </div>
              
              <div className="bg-slate-50 p-1 rounded-[3rem] border shadow-inner">
                <ExamModule 
                  exam={course.exam} 
                  courseTitle={course.title}
                  onComplete={async () => {
                    try {
                      await lmsService.completeCourse(course.id, true);
                      navigate('/academy');
                    } catch(e) {
                      console.error(e);
                    }
                  }}
                />
              </div>

              <button 
                onClick={() => setShowExam(false)}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
              >
                ← Regresar a las lecciones
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
