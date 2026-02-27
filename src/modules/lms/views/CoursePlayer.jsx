import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  PlayCircle, 
  FileText, 
  CheckCircle, 
  Lock, 
  ArrowRight,
  MonitorPlay,
  FileSearch,
  Image as ImageIcon,
  Camera,
  BookOpen,
  Award
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
  const [activeLesson, setActiveLesson] = useState(0);
  const [showExam, setShowExam] = useState(false);
  const [completedLessons, setCompletedLessons] = useState([]);

  useEffect(() => {
    const fetchCourse = async () => {
      const all = await lmsService.getCourses(user.role);
      const found = all.find(c => c.id === id);
      setCourse(found);
    };
    fetchCourse();
  }, [id, user.role]);

  if (!course) return <div className="p-10 font-black text-gray-400 animate-pulse">Cargando curso...</div>;

  const handleLessonComplete = (index) => {
    if (!completedLessons.includes(index)) {
      const newCompleted = [...completedLessons, index];
      setCompletedLessons(newCompleted);
      
      const progress = Math.round((newCompleted.length / (course.content.length + 1)) * 100);
      lmsService.updateProgress(course.id, progress);
    }
    
    if (index < course.content.length - 1) {
      setActiveLesson(index + 1);
    } else {
      setShowExam(true);
    }
  };

  const currentLesson = course.content[activeLesson];
  const themeColor = course.themeColor || '#10b981';

  const renderContent = () => {
    if (!currentLesson) return null;

    switch (currentLesson.type) {
      case 'VIDEO':
        return (
          <div className="aspect-video bg-gray-900 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center text-white space-y-4 group cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
            <PlayCircle className="h-20 w-20 text-white/50 group-hover:text-white group-hover:scale-110 transition-all z-10" />
            <p className="text-sm font-bold tracking-widest uppercase text-white/50 z-10">Reproduciendo Video de Lección</p>
            <div className="absolute bottom-6 left-6 right-6 h-1.5 bg-white/20 rounded-full z-10">
              <div className="h-full bg-primary w-1/3 rounded-full" style={{ backgroundColor: themeColor }} />
            </div>
          </div>
        );
      case 'PDF':
        return (
          <div className="aspect-video bg-gray-100 rounded-[2.5rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center space-y-4 group">
            <FileSearch className="h-20 w-20 text-gray-300 group-hover:text-primary transition-colors" style={{ color: themeColor }} />
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 uppercase">Documento PDF Adjunto</p>
              <p className="text-xs font-bold text-gray-400 mt-1">{currentLesson.title}.pdf</p>
            </div>
            <button className="bg-white border shadow-sm px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Visualizar Documento</button>
          </div>
        );
      case 'IMAGE':
      case 'PHOTO':
        return (
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-gray-100 aspect-video relative group">
            <img 
              src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1200" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
              alt="Lesson Material"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               {currentLesson.type === 'PHOTO' ? <Camera className="h-12 w-12 text-white" /> : <ImageIcon className="h-12 w-12 text-white" />}
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-gray-50 p-12 rounded-[2.5rem] border space-y-6">
            <BookOpen className="h-12 w-12 text-primary" style={{ color: themeColor }} />
            <div className="prose prose-slate max-w-none">
              <h2 className="text-2xl font-black text-gray-900">Lectura Técnica</h2>
              <p className="text-gray-600 font-medium leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar - Temario */}
      <aside className="w-full md:w-80 bg-gray-50 border-r flex flex-col h-full overflow-y-auto">
        <div className="p-6 border-b bg-white sticky top-0 z-10">
          <button 
            onClick={() => navigate('/academy')}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-primary transition-colors mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            VOLVER A ACADEMY
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{course.category}</span>
          </div>
          <h2 className="font-black text-gray-900 leading-tight">{course.title}</h2>
          <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
            <span>Tu Progreso</span>
            <span style={{ color: themeColor }}>{Math.round(((completedLessons.length) / (course.content.length + 1)) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full transition-all duration-500" 
              style={{ 
                width: `${((completedLessons.length) / (course.content.length + 1)) * 100}%`,
                backgroundColor: themeColor
              }}
            />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {course.content.map((lesson, idx) => {
            const isCompleted = completedLessons.includes(idx);
            const isActive = activeLesson === idx && !showExam;
            
            return (
              <button
                key={lesson.id}
                onClick={() => { setActiveLesson(idx); setShowExam(false); }}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all group",
                  isActive
                    ? "bg-white shadow-md border border-gray-100 ring-1 ring-primary/10" 
                    : "hover:bg-gray-100"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors",
                  isCompleted 
                    ? "bg-emerald-50 border-emerald-500 text-emerald-600" 
                    : isActive ? "text-white" : "border-gray-200 text-gray-400"
                )} style={isActive && !isCompleted ? { backgroundColor: themeColor, borderColor: themeColor } : {}}>
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-bold truncate",
                    isActive ? "text-gray-900" : "text-gray-700"
                  )} style={isActive ? { color: themeColor } : {}}>{lesson.title}</p>
                  <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{lesson.type} • {lesson.duration}</p>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => setShowExam(true)}
            disabled={completedLessons.length < course.content.length}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all mt-6 border-2 border-dashed",
              showExam 
                ? "text-white shadow-lg" 
                : completedLessons.length < course.content.length 
                  ? "bg-gray-50 text-gray-300 border-gray-100 opacity-60 cursor-not-allowed" 
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
            )}
            style={showExam ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
          >
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2",
              showExam ? "border-white" : "border-current"
            )}>
              {completedLessons.length < course.content.length ? <Lock className="h-4 w-4" /> : <MonitorPlay className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Examen Final</p>
              <p className="text-[9px] font-bold opacity-70">Certificación Oficial</p>
            </div>
          </button>
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 bg-white overflow-y-auto">
        {!showExam ? (
          <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-8 animate-in fade-in duration-500">
            {renderContent()}

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest" style={{ color: themeColor, backgroundColor: `${themeColor}10` }}>Módulo {activeLesson + 1}</span>
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">{currentLesson?.title}</h1>
              <p className="text-lg text-gray-600 leading-relaxed font-medium">
                En esta lección de {currentLesson?.type.toLowerCase()}, cubriremos los aspectos fundamentales de {course.title}. 
                Presta especial atención a los materiales visuales, ya que contienen información clave para el examen final.
              </p>
            </div>

            <div className="pt-8 border-t flex justify-end">
              <button 
                onClick={() => handleLessonComplete(activeLesson)}
                className="bg-gray-900 text-white px-10 py-5 rounded-2xl font-black transition-all flex items-center gap-3 shadow-xl shadow-gray-200 group uppercase text-xs tracking-widest"
                style={{ backgroundColor: themeColor }}
              >
                Completar y Siguiente
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-6 md:p-12">
            <div className="text-center mb-12 space-y-4">
              <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="h-10 w-10 text-emerald-500" />
              </div>
              <h2 className="text-5xl font-black text-gray-900 tracking-tight">Examen Final</h2>
              <p className="text-gray-500 font-medium text-lg max-w-lg mx-auto leading-relaxed">
                Has completado exitosamente la fase teórica. Es momento de validar tus conocimientos y obtener <span className="text-emerald-600 font-black">+{course.xpReward || 100} XP</span>.
              </p>
            </div>
            <ExamModule 
              exam={course.exam} 
              courseTitle={course.title}
              onComplete={() => {
                lmsService.updateProgress(course.id, 100, true);
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
