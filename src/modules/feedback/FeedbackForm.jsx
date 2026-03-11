import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Send, CheckCircle, AlertCircle, Award, Zap, ShieldCheck, MessageSquare, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EVALUATION_TYPES = {
  CUSTOMER_TECH: {
    title: 'Evaluación de Servicio Técnico',
    subtitle: 'Gracias por responder, así mejoramos tu experiencia',
    icon: <Zap className="w-8 h-8 text-blue-600" />,
    q1: '¿Cómo calificaría nuestro servicio técnico?',
    q2: '¿El técnico llegó puntualmente a la cita?',
    q3: '¿Cómo calificaría el nivel de conocimientos del técnico?',
    showQ3: true
  },
  OPS_TECH: {
    title: 'Eficiencia Operativa',
    subtitle: 'Control interno de calidad y liderazgo',
    icon: <ShieldCheck className="w-8 h-8 text-indigo-600" />,
    q1: '¿Qué tan eficiente fue el tiempo de ejecución?',
    q2: '¿Demostró una actitud de liderazgo en sitio?',
    q3: '',
    showQ3: false,
    showMaterial: true
  },
  CUSTOMER_EXEC: {
    title: 'Experiencia con Ejecutivo',
    subtitle: 'Calidad en la gestión y seguimiento',
    icon: <Award className="w-8 h-8 text-blue-500" />,
    q1: '¿Cómo calificaría la atención de su ejecutivo?',
    q2: '¿La explicación del proceso fue clara y simple?',
    q3: '¿Qué podría mejorar de nuestra atención?',
    showQ3: true,
    isTextQ3: true
  }
};

const StarRating = ({ value, onChange, label }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="mb-8 p-6 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
  >
    <p className="text-gray-500 font-bold mb-4 text-[11px] uppercase tracking-[0.15em] flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-blue-500" /> {label}
    </p>
    <div className="flex gap-4 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(star)}
          className={`relative p-1 transition-all duration-300 ${
            value >= star ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200'
          }`}
        >
          <Star className={`w-12 h-12 ${value >= star ? 'fill-current' : ''}`} />
        </motion.button>
      ))}
    </div>
  </motion.div>
);

export default function FeedbackForm() {
  const { type, otId } = useParams();
  const [ot, setOt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    score1: 0, score2: 0, score3: 0,
    materialUsage: '', improvements: '', comment: ''
  });

  const config = EVALUATION_TYPES[type];

  useEffect(() => {
    async function fetchData() {
      try {
        const checkRes = await fetch(`/api/evaluations?otId=${otId}&type=${type}`);
        if (checkRes.ok) {
          const existing = await checkRes.json();
          if (existing && existing.id) {
            setSubmitted(true);
            setLoading(false);
            return;
          }
        }
        const otRes = await fetch(`/api/ots?id=${otId}`);
        if (!otRes.ok) throw new Error('Orden de Trabajo no encontrada');
        const data = await otRes.json();
        setOt(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [otId, type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      otId, type,
      targetId: type === 'CUSTOMER_EXEC' ? (ot?.creatorId || 'admin') : ot?.technicianId,
      score1: formData.score1,
      score2: formData.score2,
      score3: config.isTextQ3 ? null : formData.score3,
      materialUsage: formData.materialUsage,
      improvements: config.isTextQ3 ? formData.score3 : null,
      comment: formData.comment
    };

    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al enviar evaluación');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 selection:bg-blue-100 overflow-x-hidden relative font-sans">
      <div className="relative z-10 py-16 px-4 max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-gray-100 rounded-[3rem] p-12 text-center shadow-2xl shadow-blue-100/50"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black mb-4 text-gray-900 tracking-tight">¡Muchas Gracias!</h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                Tu feedback es fundamental para seguir brindando la calidad que mereces en OleaControls.
              </p>
            </motion.div>
          ) : error ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border border-red-100 p-10 rounded-[2.5rem] text-center"
            >
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-black text-red-900 uppercase tracking-widest">Atención</h2>
              <p className="text-red-700 font-medium mt-2 opacity-70">{error}</p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              {/* Brand Header */}
              <div className="text-center space-y-4">
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 flex justify-center"
                >
                  <img 
                    src="/img/OLEACONTROLS.png" 
                    alt="OLEACONTROLS" 
                    className="h-10 md:h-12 object-contain drop-shadow-sm"
                  />
                </motion.div>
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-blue-600">OleaControls México</h2>
                    <h1 className="text-4xl font-black tracking-tighter text-gray-900">
                      {config.title}
                    </h1>
                </div>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{config.subtitle}</p>
              </div>

              {/* OT Info Card */}
              <div className="bg-white border border-gray-100 rounded-3xl p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Box className="w-5 h-5" /></div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Folio de Servicio</p>
                    <p className="text-sm font-black text-gray-900">{ot?.otNumber}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-xl shadow-lg shadow-blue-200 uppercase tracking-widest">En Línea</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <StarRating label={config.q1} value={formData.score1} onChange={(v) => setFormData({...formData, score1: v})} />
                <StarRating label={config.q2} value={formData.score2} onChange={(v) => setFormData({...formData, score2: v})} />

                {config.showQ3 && !config.isTextQ3 && (
                  <StarRating label={config.q3} value={formData.score3} onChange={(v) => setFormData({...formData, score3: v})} />
                )}

                {config.isTextQ3 && (
                  <motion.div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-2">{config.q3}</label>
                    <textarea
                      className="w-full bg-white border border-gray-100 rounded-[2rem] p-8 outline-none focus:border-blue-500 transition-all text-sm min-h-[140px] shadow-sm font-medium focus:shadow-xl focus:shadow-blue-100/50"
                      placeholder="Escribe tu opinión aquí..."
                      value={formData.score3}
                      onChange={(e) => setFormData({...formData, score3: e.target.value})}
                    />
                  </motion.div>
                )}

                {config.showMaterial && (
                  <motion.div className="space-y-5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-2">¿Cuánto material utilizó el técnico?</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['NADA', 'POCO', 'MUCHO'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormData({...formData, materialUsage: opt})}
                          className={`py-5 rounded-2xl border-2 font-black text-[11px] tracking-widest transition-all ${
                            formData.materialUsage === opt 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 scale-[1.05]' 
                              : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="space-y-4 pt-4">
                  <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" /> Comentarios Adicionales
                  </label>
                  <textarea
                    className="w-full bg-white border border-gray-100 rounded-[2rem] p-8 outline-none focus:border-blue-500 transition-all text-sm min-h-[120px] shadow-sm font-medium focus:shadow-xl focus:shadow-blue-100/50"
                    placeholder="Cuéntanos más sobre tu experiencia (Opcional)..."
                    value={formData.comment}
                    onChange={(e) => setFormData({...formData, comment: e.target.value})}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={!formData.score1 || !formData.score2 || loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-blue-600 text-white font-black text-[13px] uppercase tracking-[0.3em] py-7 rounded-[2.5rem] shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-4 mt-8"
                >
                  <Send className="w-5 h-5" />
                  Enviar Evaluación
                </motion.button>
              </form>

              <div className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
                  Plataforma de Calidad OleaControls
                </p>
                <p className="text-[9px] font-bold text-blue-500/40 uppercase tracking-widest">
                  Garantía de Satisfacción 2026
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
