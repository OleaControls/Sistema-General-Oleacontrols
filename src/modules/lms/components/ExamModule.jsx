import React, { useState } from 'react';
import { HelpCircle, CheckCircle, XCircle, Trophy, ArrowRight, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExamModule({ exam, onComplete, courseTitle }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  const handleSelect = (optionIndex) => {
    setAnswers({ ...answers, [currentQuestion]: optionIndex });
  };

  const handleNext = () => {
    if (currentQuestion < exam.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calcular resultado
      let correctCount = 0;
      exam.questions.forEach((q, idx) => {
        if (answers[idx] === q.correct) correctCount++;
      });
      const finalScore = (correctCount / exam.questions.length) * 100;
      setScore(finalScore);
      setIsFinished(true);
      if (finalScore >= 80) onComplete();
    }
  };

  if (isFinished) {
    const passed = score >= 80;
    return (
      <div className="text-center space-y-8 py-10 animate-in zoom-in duration-500">
        <div className="flex justify-center">
          <div className={cn(
            "p-6 rounded-full shadow-2xl",
            passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          )}>
            {passed ? <Trophy className="h-16 w-16" /> : <XCircle className="h-16 w-16" />}
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-gray-900">
            {passed ? '¡Felicidades, aprobado!' : 'No alcanzaste el mínimo'}
          </h3>
          <p className="text-gray-500 font-medium">
            Obtuviste un <span className="text-gray-900 font-bold">{score}%</span> en el examen de {courseTitle}.
          </p>
        </div>

        {passed ? (
          <div className="bg-green-50 p-6 rounded-3xl border border-green-100 max-w-sm mx-auto">
            <p className="text-green-800 text-xs font-bold uppercase tracking-widest mb-2">Certificación Generada</p>
            <p className="text-green-600 text-[11px] leading-relaxed">Tu certificación ha sido enviada a tu expediente digital en el módulo de RH automáticamente.</p>
          </div>
        ) : (
          <button 
            onClick={() => { setIsFinished(false); setCurrentQuestion(0); setAnswers({}); }}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-primary transition-all shadow-xl shadow-gray-200"
          >
            <RefreshCcw className="h-4 w-4" />
            Reintentar Examen
          </button>
        )}
      </div>
    );
  }

  const q = exam.questions[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Pregunta {currentQuestion + 1} de {exam.questions.length}</span>
          <span className="text-[10px] font-bold text-gray-400 italic">Mínimo para aprobar: 80%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${((currentQuestion + 1) / exam.questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-xl font-black text-gray-900 leading-tight flex gap-3">
          <HelpCircle className="h-6 w-6 text-primary shrink-0" />
          {q.text}
        </h4>

        <div className="grid gap-3">
          {q.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={cn(
                "p-5 rounded-2xl border-2 text-left transition-all font-bold group",
                answers[currentQuestion] === idx 
                  ? "border-primary bg-primary/5 text-primary" 
                  : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{option}</span>
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  answers[currentQuestion] === idx ? "border-primary bg-primary" : "border-gray-200"
                )}>
                  {answers[currentQuestion] === idx && <div className="h-2 w-2 bg-white rounded-full" />}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={answers[currentQuestion] === undefined}
        onClick={handleNext}
        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-primary disabled:opacity-50 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-gray-200"
      >
        {currentQuestion === exam.questions.length - 1 ? 'Finalizar Examen' : 'Siguiente Pregunta'}
        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
