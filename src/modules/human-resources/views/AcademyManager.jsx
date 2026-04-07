import React, { useState, useEffect } from 'react';
import { 
  Plus, BookOpen, Video, FileQuestion, Users, Edit3, Trash2, 
  MonitorPlay, Save, X, GripVertical, Link as LinkIcon, FileText, ChevronDown, ChevronUp, Image as ImageIcon
} from 'lucide-react';
import { lmsService } from '@/api/lmsService';
import { cn } from '@/lib/utils';

export default function AcademyManager() {
  const [courses, setCourses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const loadCourses = async () => {
    const data = await lmsService.getAllAdmin();
    setCourses(data);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleOpenCreate = () => {
    setEditingCourse({
      title: '',
      description: '',
      level: 'BEGINNER',
      status: 'DRAFT',
      thumbnail: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=400',
      modules: []
    });
    setIsModalOpen(true);
  };

  const handleSave = async (courseData) => {
    try {
      await lmsService.saveCourse(courseData);
      await loadData();
      setIsModalOpen(false);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">Academia Corporativa</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Crea y gestiona cursos, contenido multimedia y evaluaciones para el equipo.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-gray-900 text-white px-6 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-gray-200 hover:bg-primary transition-all hover:shadow-primary/20"
        >
          <Plus className="h-4 w-4" /> NUEVO CURSO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={BookOpen} label="Cursos Activos" value={courses.length} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={Users} label="Total Inscritos" value="124" color="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={MonitorPlay} label="Certificaciones Emitidas" value="42" color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      <div className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Catálogo Maestro de Capacitación</h3>
        </div>
        
        <div className="divide-y divide-gray-50">
          {courses.map((course) => (
            <div key={course.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-gray-50/50 transition-all group">
              <div className="flex items-center gap-6">
                <div className="h-20 w-32 rounded-2xl overflow-hidden shadow-sm relative group-hover:shadow-md transition-all shrink-0">
                  <img src={course.thumbnail} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" alt={course.title} />
                  <div className="absolute inset-0 bg-black/10" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest",
                      course.status === 'PUBLISHED' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>{course.status === 'PUBLISHED' ? 'PUBLICADO' : 'BORRADOR'}</span>
                    <span className="text-[10px] font-bold text-gray-400">ID: {course.id.split('-')[0]}</span>
                  </div>
                  <h4 className="text-lg font-black text-gray-900 leading-tight group-hover:text-primary transition-colors">{course.title}</h4>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-1 tracking-widest flex items-center gap-2">
                    <span>{course.level}</span>
                    <span className="h-1 w-1 bg-gray-300 rounded-full" />
                    <span>{course.modules?.length || 0} MÓDULOS</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setEditingCourse(course); setIsModalOpen(true); }}
                  className="p-3 bg-white border rounded-xl text-gray-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm group-hover:shadow-md"
                  title="Editar Curso"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="p-12 text-center text-gray-400 font-bold">No hay cursos creados aún.</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <CourseEditorModal 
          course={editingCourse} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center gap-5">
      <div className={cn("p-4 rounded-2xl", bg, color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-gray-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

// === CREADOR DE CURSOS (DRAG & DROP / BUILDER) ===

function CourseEditorModal({ course, onClose, onSave }) {
  const [formData, setFormData] = useState({
    ...course,
    modules: course.modules ? [...course.modules] : []
  });
  const [activeTab, setActiveTab] = useState('GENERAL'); // GENERAL, CURRICULUM

  const handleAddModule = () => {
    setFormData({
      ...formData,
      modules: [...formData.modules, { title: 'Nuevo Módulo', order: formData.modules.length, lessons: [] }]
    });
  };

  const handleAddLesson = (moduleIndex) => {
    const newModules = [...formData.modules];
    newModules[moduleIndex].lessons.push({
      title: 'Nueva Lección',
      type: 'VIDEO',
      content: '',
      duration: '10',
      order: newModules[moduleIndex].lessons.length
    });
    setFormData({ ...formData, modules: newModules });
  };

  const updateLesson = (mIdx, lIdx, field, value) => {
    const newModules = [...formData.modules];
    newModules[mIdx].lessons[lIdx][field] = value;
    setFormData({ ...formData, modules: newModules });
  };

  const removeLesson = (mIdx, lIdx) => {
    const newModules = [...formData.modules];
    newModules[mIdx].lessons.splice(lIdx, 1);
    setFormData({ ...formData, modules: newModules });
  };

  const removeModule = (mIdx) => {
    const newModules = [...formData.modules];
    newModules.splice(mIdx, 1);
    setFormData({ ...formData, modules: newModules });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl bg-gray-50 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-[85vh]">
        
        {/* Header */}
        <div className="p-6 md:p-8 bg-white border-b flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-gray-900">{formData.id ? 'Editar Curso' : 'Constructor de Curso'}</h3>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Sistema de Gestión de Aprendizaje</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-full transition-all">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 bg-white border-b shrink-0 gap-6">
          <button 
            onClick={() => setActiveTab('GENERAL')}
            className={cn(
              "py-4 border-b-2 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all",
              activeTab === 'GENERAL' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <BookOpen className="h-4 w-4" /> Datos del Curso
          </button>
          <button 
            onClick={() => setActiveTab('CURRICULUM')}
            className={cn(
              "py-4 border-b-2 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all",
              activeTab === 'CURRICULUM' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <Video className="h-4 w-4" /> Currículum (Lecciones)
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'GENERAL' && (
            <div className="space-y-6 md:space-y-8 max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-[2rem] border shadow-sm">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título del Curso</label>
                <input 
                  className="w-full bg-gray-50 border px-4 py-3 md:py-4 rounded-xl font-black text-gray-900 text-lg outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                  placeholder="Ej: Inducción a Olea V3"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nivel de Dificultad</label>
                  <select 
                    className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold text-gray-700 outline-none focus:border-primary"
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                  >
                    <option value="BEGINNER">Principiante</option>
                    <option value="INTERMEDIATE">Intermedio</option>
                    <option value="ADVANCED">Avanzado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</label>
                  <select 
                    className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold text-gray-700 outline-none focus:border-primary"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="DRAFT">Borrador (No visible)</option>
                    <option value="PUBLISHED">Publicado (Visible)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción Corta</label>
                <textarea 
                  rows="3"
                  className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-medium text-gray-700 outline-none focus:border-primary resize-none"
                  placeholder="Describe de qué trata este curso..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Portada del Curso (URL de Imagen)
                </label>
                <div className="flex gap-4 items-start">
                  <img src={formData.thumbnail} className="h-24 w-32 rounded-xl object-cover border shadow-sm shrink-0" alt="Preview" onError={(e) => e.target.src='https://via.placeholder.com/150'} />
                  <textarea 
                    rows="3"
                    className="flex-1 bg-gray-50 border px-4 py-3 rounded-xl font-mono text-xs outline-none focus:border-primary resize-none"
                    placeholder="https://..."
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CURRICULUM' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h4 className="font-black text-gray-900 text-lg">Estructura del Curso</h4>
                  <p className="text-xs text-gray-500 font-medium">Agrupa las lecciones en módulos. Los videos de YouTube se reproducirán automáticamente.</p>
                </div>
                <button 
                  onClick={handleAddModule}
                  className="text-xs font-black text-primary uppercase bg-white border shadow-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Añadir Módulo
                </button>
              </div>

              {formData.modules.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-300">
                  <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">Aún no hay módulos de contenido.</p>
                  <button onClick={handleAddModule} className="text-primary text-xs font-black mt-2 hover:underline">Crear el primer módulo</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.modules.map((module, mIdx) => (
                    <div key={mIdx} className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                      {/* Module Header */}
                      <div className="bg-gray-900 text-white p-4 flex items-center gap-4">
                        <GripVertical className="h-5 w-5 text-gray-500 cursor-move" />
                        <div className="bg-white/10 px-3 py-1 rounded-lg text-xs font-black">Módulo {mIdx + 1}</div>
                        <input 
                          className="flex-1 bg-transparent font-black text-lg outline-none border-b border-transparent focus:border-white/30 transition-all"
                          value={module.title}
                          onChange={(e) => {
                            const newM = [...formData.modules];
                            newM[mIdx].title = e.target.value;
                            setFormData({...formData, modules: newM});
                          }}
                          placeholder="Nombre del Módulo..."
                        />
                        <button onClick={() => removeModule(mIdx)} className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Lessons List */}
                      <div className="p-4 md:p-6 space-y-4 bg-gray-50/50">
                        {module.lessons.map((lesson, lIdx) => (
                          <div key={lIdx} className="bg-white border rounded-2xl p-4 shadow-sm relative group">
                            <div className="flex flex-col md:flex-row gap-4 md:items-center">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center font-black text-xs">{lIdx + 1}</div>
                                <select 
                                  className="bg-gray-50 border rounded-lg px-3 py-2 text-[10px] font-black outline-none w-32"
                                  value={lesson.type}
                                  onChange={(e) => updateLesson(mIdx, lIdx, 'type', e.target.value)}
                                >
                                  <option value="VIDEO">📹 VIDEO</option>
                                  <option value="PDF">📄 PDF</option>
                                  <option value="TEXT">📝 TEXTO</option>
                                </select>
                              </div>
                              
                              <input 
                                className="flex-1 bg-transparent font-bold text-gray-900 outline-none border-b border-dashed focus:border-primary px-2 py-1"
                                placeholder="Título de la lección..."
                                value={lesson.title}
                                onChange={(e) => updateLesson(mIdx, lIdx, 'title', e.target.value)}
                              />
                              
                              <div className="flex items-center gap-3 shrink-0">
                                <input 
                                  type="number"
                                  className="w-16 bg-gray-50 border rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-center"
                                  placeholder="Min"
                                  value={lesson.duration}
                                  onChange={(e) => updateLesson(mIdx, lIdx, 'duration', e.target.value)}
                                  title="Duración estimada (minutos)"
                                />
                                <span className="text-[10px] font-black text-gray-400 uppercase">Min</span>
                                <button onClick={() => removeLesson(mIdx, lIdx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors ml-2">
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                            </div>

                            {/* Content Input (YouTube Link or Text) */}
                            <div className="mt-4 pl-11">
                              {lesson.type === 'VIDEO' && (
                                <div className="relative">
                                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                                  <input 
                                    className="w-full bg-red-50/50 border border-red-100 text-red-900 placeholder:text-red-300 pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono outline-none focus:border-red-300 transition-all"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={lesson.content || ''}
                                    onChange={(e) => updateLesson(mIdx, lIdx, 'content', e.target.value)}
                                  />
                                </div>
                              )}
                              {(lesson.type === 'PDF' || lesson.type === 'TEXT') && (
                                <div className="relative">
                                  <FileText className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                                  <textarea 
                                    rows="2"
                                    className="w-full bg-blue-50/30 border border-blue-100 text-gray-700 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-blue-300 transition-all resize-y"
                                    placeholder={lesson.type === 'PDF' ? "URL del archivo PDF..." : "Contenido de texto (soporta Markdown simple)..."}
                                    value={lesson.content || ''}
                                    onChange={(e) => updateLesson(mIdx, lIdx, 'content', e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <button 
                          onClick={() => handleAddLesson(mIdx)}
                          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-2xl text-[10px] font-black text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all uppercase tracking-widest"
                        >
                          + Añadir Lección
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 border-t bg-white flex justify-end gap-4 shrink-0 z-10">
          <button onClick={onClose} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all uppercase text-xs tracking-widest">
            Cancelar
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="bg-gray-900 text-white px-8 md:px-10 py-3.5 rounded-2xl font-black shadow-xl hover:bg-primary transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
          >
            <Save className="h-4 w-4" /> Guardar Curso
          </button>
        </div>
      </div>
    </div>
  );
}
