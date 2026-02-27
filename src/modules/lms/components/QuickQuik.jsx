import React, { useState, useEffect } from 'react';
import { HelpCircle, Clock, Zap, Trophy, X, ArrowRight } from 'lucide-react';

export default function QuickQuik({ onClose, onComplete }) {
  const [step, setStep] = useState('START'); // START, QUESTIONS, RESULTS
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(30);

  const questions = [
    {
      text: "¿Cuál es el valor principal de Olea Controls?",
      options: ["Innovación", "Integridad", "Seguridad", "Todas las anteriores"],
      correct: 3
    },
    {
      text: "¿A qué área pertenecen los equipos V3?",
      options: ["Sistemas", "Hidráulica", "Eléctrica", "Ventas"],
      correct: 1
    },
    {
      text: "¿Qué significan las siglas EPP?",
      options: ["Equipo para Personas", "Equipo de Protección Personal", "Estándar de Proceso Preventivo"],
      correct: 1
    }
  ];

  const finish = () => {
    setStep('RESULTS');
    onComplete(100); // Mock XP reward
  };

  useEffect(() => {
    let interval;
    if (step === 'QUESTIONS' && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && step === 'QUESTIONS') {
      finish();
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-indigo-900/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        {step === 'START' && (
          <div className="p-10 text-center space-y-8">
            <div className="h-24 w-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <Zap className="h-12 w-12 text-indigo-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-gray-900">Quick Quik!</h3>
              <p className="text-gray-500 font-medium">3 preguntas • 30 segundos • 100 XP</p>
            </div>
            <button 
              onClick={() => setStep('QUESTIONS')}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
            >
              ¡ESTOY LISTO!
            </button>
          </div>
        )}

        {step === 'QUESTIONS' && (
          <div className="p-10 space-y-8">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Pregunta {currentQ + 1} / {questions.length}</span>
              <div className="flex items-center gap-2 text-amber-500 font-black">
                <Clock className="h-4 w-4" />
                <span>{timer}s</span>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-2xl font-black text-gray-900 leading-tight">{questions[currentQ].text}</h4>
              <div className="grid gap-3">
                {questions[currentQ].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    className="w-full p-5 rounded-2xl border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 text-left font-bold transition-all"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'RESULTS' && (
          <div className="p-10 text-center space-y-8">
            <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Trophy className="h-12 w-12 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-gray-900">¡Desafío Superado!</h3>
              <p className="text-emerald-600 font-black text-xl">+100 XP RECLAMADOS</p>
              <p className="text-gray-400 font-medium text-sm">Has mantenido tu racha de 12 días.</p>
            </div>
            <button 
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black hover:bg-primary transition-all shadow-xl shadow-gray-200"
            >
              VOLVER A ACADEMY
            </button>
          </div>
        )}

        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
