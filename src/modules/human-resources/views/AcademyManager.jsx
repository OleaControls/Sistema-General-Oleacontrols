import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  BookOpen, 
  Video, 
  FileQuestion, 
  Users, 
  Edit3, 
  Trash2, 
  ChevronRight,
  MonitorPlay,
  Save,
  X
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
      category: 'TÉCNICO',
      type: 'GENERAL', // GENERAL or AREA
      targetArea: 'TODOS',
      roles: ['TECHNICIAN'],
      thumbnail: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=400',
      duration: '1h',
      lessons: 0,
      xpReward: 100,
      publishDate: new Date().toISOString().split('T')[0],
      content: [],
      exam: { questions: [] }
    });
    setIsModalOpen(true);
  };

  const handleSave = async (courseData) => {
    await lmsService.saveCourse(courseData);
    loadCourses();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Gestión de Academia</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Crea cursos, diseña exámenes y monitorea el avance del personal.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" /> Crear Nuevo Curso
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={BookOpen} label="Cursos Activos" value={courses.length} color="text-blue-600" />
        <StatCard icon={Users} label="Total Inscritos" value="124" color="text-purple-600" />
        <StatCard icon={MonitorPlay} label="Certificaciones Emitidas" value="42" color="text-emerald-600" />
      </div>

      <div className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Catálogo Maestro de Capacitación</h3>
        </div>
        
        <div className="divide-y divide-gray-50">
          {courses.map((course) => (
            <div key={course.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-gray-50/50 transition-all group">
              <div className="flex items-center gap-6">
                <img src={course.thumbnail} className="h-16 w-24 rounded-2xl object-cover border shadow-sm group-hover:scale-105 transition-transform" alt="" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">{course.category}</span>
                    <span className="text-[10px] font-bold text-gray-400">ID: {course.id}</span>
                  </div>
                  <h4 className="font-black text-gray-900 leading-tight group-hover:text-primary transition-colors">{course.title}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest">
                    {course.roles.join(' • ')} — {course.content.length} LECCIONES
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right mr-4 hidden md:block">
                  <p className="text-xs font-black text-gray-900">85%</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Cumplimiento</p>
                </div>
                <button 
                  onClick={() => { setEditingCourse(course); setIsModalOpen(true); }}
                  className="p-3 bg-white border rounded-xl text-gray-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button className="p-3 bg-white border rounded-xl text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
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

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4">
      <div className={cn("p-3 rounded-2xl bg-gray-50", color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function CourseEditorModal({ course, onClose, onSave }) {
  const [formData, setFormData] = useState(course);
  const [activeSubTab, setActiveTab] = useState('GENERAL'); // GENERAL, CONTENT, EXAM

  const handleAddLesson = () => {
    const newLesson = { id: Date.now(), title: 'Nueva Lección', type: 'VIDEO', duration: '10 min' };
    setFormData({ ...formData, content: [...formData.content, newLesson] });
  };

  const handleAddQuestion = () => {
    const newQ = { id: Date.now(), text: '¿Nueva pregunta?', options: ['', '', ''], correct: 0 };
    setFormData({ ...formData, exam: { questions: [...formData.exam.questions, newQ] } });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-black text-gray-900">Configurador de Curso</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Diseña la experiencia de aprendizaje técnica</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {/* Sub Tabs */}
        <div className="flex px-8 border-b gap-8">
          {[
            { id: 'GENERAL', label: 'Datos Generales', icon: BookOpen },
            { id: 'CONTENT', label: 'Contenido / Videos', icon: Video },
            { id: 'EXAM', label: 'Examen de Certificación', icon: FileQuestion },
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "py-4 border-b-2 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all",
                activeSubTab === t.id ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeSubTab === 'GENERAL' && (
            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Curso</label>
                  <select 
                    className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold outline-none"
                    value={formData.type || 'GENERAL'}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="GENERAL">General (Toda la Empresa)</option>
                    <option value="AREA">Por Área / Departamento</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Área Destino</label>
                  <select 
                    className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold outline-none"
                    value={formData.targetArea || 'TODOS'}
                    onChange={(e) => setFormData({...formData, targetArea: e.target.value})}
                    disabled={formData.type === 'GENERAL'}
                  >
                    <option value="TODOS">Todos</option>
                    <option value="TÉCNICO">Técnico / Ingeniería</option>
                    <option value="VENTAS">Ventas / Comercial</option>
                    <option value="RH">Recursos Humanos</option>
                    <option value="ADMIN">Administración</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título del Curso</label>
                <input 
                  className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold text-gray-900 outline-none focus:border-primary"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recompensa (XP)</label>
                  <input 
                    type="number"
                    className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold outline-none"
                    value={formData.xpReward || 100}
                    onChange={(e) => setFormData({...formData, xpReward: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha Programada</label>
                  <input 
                    type="date"
                    className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold outline-none"
                    value={formData.publishDate || ''}
                    onChange={(e) => setFormData({...formData, publishDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción</label>
                <textarea 
                  rows="3"
                  className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-medium text-gray-700 outline-none focus:border-primary"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Color Temático del Curso</label>
                <div className="flex gap-4 items-center">
                  <input 
                    type="color"
                    className="h-12 w-20 bg-gray-50 border p-1 rounded-xl cursor-pointer"
                    value={formData.themeColor || '#10b981'}
                    onChange={(e) => setFormData({...formData, themeColor: e.target.value})}
                  />
                  <input 
                    type="text"
                    className="flex-1 bg-gray-50 border px-4 py-3 rounded-xl font-mono text-xs font-bold outline-none"
                    value={formData.themeColor || '#10b981'}
                    onChange={(e) => setFormData({...formData, themeColor: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'CONTENT' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-black text-gray-900 uppercase text-xs">Lecciones del Curso</h4>
                <button 
                  onClick={handleAddLesson}
                  className="text-xs font-black text-primary uppercase bg-primary/5 px-4 py-2 rounded-xl hover:bg-primary/10 transition-all"
                >
                  + Añadir Lección
                </button>
              </div>
              {formData.content.map((lesson, idx) => (
                <div key={lesson.id} className="flex items-center gap-4 p-4 border rounded-2xl bg-gray-50 group">
                  <div className="h-8 w-8 bg-white border rounded-lg flex items-center justify-center font-black text-xs text-gray-400">{idx+1}</div>
                  <input 
                    className="flex-1 bg-transparent font-bold text-gray-900 outline-none"
                    value={lesson.title}
                    onChange={(e) => {
                      const newContent = [...formData.content];
                      newContent[idx].title = e.target.value;
                      setFormData({...formData, content: newContent});
                    }}
                  />
                  <select 
                    className="bg-white border rounded-lg px-2 py-1 text-[10px] font-black outline-none"
                    value={lesson.type}
                    onChange={(e) => {
                      const newContent = [...formData.content];
                      newContent[idx].type = e.target.value;
                      setFormData({...formData, content: newContent});
                    }}
                  >
                    <option value="VIDEO">VIDEO</option>
                    <option value="PDF">PDF / DOCUMENTO</option>
                    <option value="IMAGE">IMAGEN / INFOGRAFÍA</option>
                    <option value="PHOTO">FOTOGRAFÍA</option>
                    <option value="TEXT">TEXTO</option>
                  </select>
                  <button className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}

          {activeSubTab === 'EXAM' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-gray-900 uppercase text-xs">Banco de Preguntas</h4>
                <button 
                  onClick={handleAddQuestion}
                  className="text-xs font-black text-purple-600 uppercase bg-purple-50 px-4 py-2 rounded-xl hover:bg-purple-100 transition-all"
                >
                  + Añadir Pregunta
                </button>
              </div>
              
              {formData.exam.questions.map((q, qIdx) => (
                <div key={q.id} className="p-6 border rounded-[2rem] bg-gray-50/50 space-y-4">
                  <input 
                    placeholder="Escribe la pregunta..."
                    className="w-full bg-white border px-4 py-3 rounded-xl font-bold text-gray-900 outline-none focus:border-purple-400"
                    value={q.text}
                    onChange={(e) => {
                      const newQs = [...formData.exam.questions];
                      newQs[qIdx].text = e.target.value;
                      setFormData({...formData, exam: { questions: newQs }});
                    }}
                  />
                  <div className="grid gap-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          checked={q.correct === oIdx} 
                          onChange={() => {
                            const newQs = [...formData.exam.questions];
                            newQs[qIdx].correct = oIdx;
                            setFormData({...formData, exam: { questions: newQs }});
                          }}
                        />
                        <input 
                          placeholder={`Opción ${oIdx + 1}`}
                          className="flex-1 bg-white border px-3 py-2 rounded-lg text-sm outline-none"
                          value={opt}
                          onChange={(e) => {
                            const newQs = [...formData.exam.questions];
                            newQs[qIdx].options[oIdx] = e.target.value;
                            setFormData({...formData, exam: { questions: newQs }});
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t bg-gray-50 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900 uppercase text-xs tracking-widest">Descartar</button>
          <button 
            onClick={() => onSave(formData)}
            className="bg-gray-900 text-white px-10 py-3 rounded-2xl font-black shadow-xl hover:bg-primary transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
          >
            <Save className="h-4 w-4" /> Publicar en Academy
          </button>
        </div>
      </div>
    </div>
  );
}
