import React, { useState, useEffect } from 'react';
import { Plus, BarChart3, ClipboardCheck, MessageSquare, Trash2, Eye, X, Save } from 'lucide-react';
import { surveyService } from '@/api/surveyService';
import { cn } from '@/lib/utils';

export default function SurveyManager() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    const data = await surveyService.getAll();
    setSurveys(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Clima Laboral</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Escucha a tu equipo y toma decisiones basadas en datos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" /> Crear Encuesta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surveys.map((survey) => (
          <div key={survey.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span className={cn(
                "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest",
                survey.status === 'ACTIVE' ? "bg-green-50 text-green-600 border border-green-100" : "bg-gray-100 text-gray-500"
              )}>
                {survey.status}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Expira: {survey.endDate}</span>
            </div>

            <h3 className="text-lg font-black text-gray-900 group-hover:text-primary transition-colors">{survey.title}</h3>
            <p className="text-xs text-gray-500 font-medium mt-2 line-clamp-2">{survey.description}</p>

            <div className="mt-6 space-y-4 flex-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
                <span>Participación</span>
                <span className="text-gray-900">{survey.responsesCount} Respuestas</span>
              </div>
              <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '45%' }} />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex gap-2">
              <button className="flex-1 bg-gray-50 text-gray-600 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                <BarChart3 className="h-3.5 w-3.5" /> Resultados
              </button>
              <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && <SurveyFormModal onClose={() => setIsModalOpen(false)} onSave={loadSurveys} />}
    </div>
  );
}

function SurveyFormModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    endDate: '',
    status: 'ACTIVE',
    anonymous: true,
    questions: []
  });

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { id: Date.now(), text: '', type: 'RATING' }]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await surveyService.save(formData);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-xl font-black text-gray-900">Nueva Encuesta de Clima</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <input 
              required
              placeholder="Título de la consulta..."
              className="w-full text-2xl font-black text-gray-900 border-b-2 border-gray-100 focus:border-primary outline-none pb-2"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
            <textarea 
              placeholder="Instrucciones para el empleado..."
              className="w-full bg-gray-50 border p-4 rounded-2xl text-sm font-medium outline-none focus:border-primary"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase">Fecha de Cierre</label>
              <input type="date" className="w-full bg-gray-50 border px-4 py-2 rounded-xl text-sm font-bold" 
                onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" checked={formData.anonymous} onChange={e => setFormData({...formData, anonymous: e.target.checked})} />
              <span className="text-xs font-bold text-gray-600">Anónima</span>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-gray-900 uppercase">Preguntas</h4>
              <button type="button" onClick={addQuestion} className="text-primary text-[10px] font-black uppercase">+ Agregar Pregunta</button>
            </div>
            {formData.questions.map((q, idx) => (
              <div key={q.id} className="p-4 bg-gray-50 rounded-2xl flex gap-3 items-start border border-gray-100">
                <span className="h-6 w-6 bg-white border rounded-lg flex items-center justify-center text-[10px] font-black text-gray-400">{idx+1}</span>
                <input 
                  placeholder="Ej: ¿Te gusta el café de la oficina?"
                  className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-700"
                  value={q.text}
                  onChange={e => {
                    const newQs = [...formData.questions];
                    newQs[idx].text = e.target.value;
                    setFormData({...formData, questions: newQs});
                  }}
                />
              </div>
            ))}
          </div>

          <button type="submit" className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-primary transition-all uppercase tracking-widest text-sm">
            Publicar Encuesta
          </button>
        </form>
      </div>
    </div>
  );
}
