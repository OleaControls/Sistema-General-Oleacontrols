import React, { useEffect, useRef } from 'react';
import SignaturePad from 'signature_pad';
import { Trash2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente de firma profesional (Retina-Ready, Velocity-Sensitive)
 * Sustituye a react-signature-canvas por una implementación mucho más estable
 */
const SignaturePadComponent = React.forwardRef(({ 
  className, 
  penColor = '#0f172a', // Navy Dark por defecto (Olea Style)
  minWidth = 0.5,
  maxWidth = 2.5,
  onEnd,
  placeholder = "Firme aquí..."
}, ref) => {
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Inicializar SignaturePad con configuraciones premium
    const pad = new SignaturePad(canvasRef.current, {
      penColor,
      minWidth,
      maxWidth,
      velocityFilterWeight: 0.7, // Suavizado de línea
    });

    signaturePadRef.current = pad;
    if (onEnd) pad.onEnd = onEnd;

    // Manejar redimensionado y Retina (High DPI)
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      
      // Guardar firma actual antes de redimensionar
      const data = pad.toData();
      
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      
      // Restaurar firma
      pad.clear();
      pad.fromData(data);
    };

    // Timeout ligero para asegurar que el DOM está listo
    const timer = setTimeout(resizeCanvas, 50);
    window.addEventListener("resize", resizeCanvas);

    // Exponer métodos al ref padre
    if (ref) {
      ref.current = {
        clear: () => pad.clear(),
        toDataURL: () => pad.toDataURL(),
        isEmpty: () => pad.isEmpty(),
        undo: () => {
          const data = pad.toData();
          if (data) {
            data.pop(); // Quitar último trazo
            pad.fromData(data);
          }
        }
      };
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      clearTimeout(timer);
    };
  }, [penColor, minWidth, maxWidth, onEnd, ref]);

  return (
    <div className={cn("relative w-full h-full flex flex-col group", className)}>
      <div className="absolute top-4 left-4 pointer-events-none transition-opacity duration-300 group-focus-within:opacity-0 opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{placeholder}</p>
      </div>
      
      <canvas 
        ref={canvasRef} 
        className="w-full h-full cursor-crosshair touch-none bg-transparent"
        style={{ touchAction: 'none' }}
      />

      <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          type="button"
          onClick={() => ref.current?.undo()}
          className="p-2 bg-white border shadow-sm rounded-lg text-gray-400 hover:text-primary transition-colors"
          title="Deshacer"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button 
          type="button"
          onClick={() => ref.current?.clear()}
          className="p-2 bg-white border shadow-sm rounded-lg text-gray-400 hover:text-red-500 transition-colors"
          title="Borrar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

SignaturePadComponent.displayName = "SignaturePad";

export default SignaturePadComponent;
