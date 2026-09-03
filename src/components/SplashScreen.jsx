import { useEffect, useState } from 'react';
import LoadingCanvas, { Cita, Etiqueta, AZUL } from './LoadingCanvas';
import { FRASES, fraseAlAzar } from '@/lib/frases';

/* Pantalla de espera de la plataforma: se ve mientras se resuelve la sesión y
   al abrir por primera vez una sección. Mismo lienzo que la bienvenida del
   login, con las frases de la casa turnándose. */

export { FRASES };

/** Cada cuánto cambia la frase: alcanza a leerse sin llegar a cansar. */
const MS_POR_FRASE = 5000;

export default function SplashScreen({ mensaje = 'Preparando tu plataforma' }) {
  const [frase, setFrase] = useState(() => fraseAlAzar());

  useEffect(() => {
    const t = setInterval(() => setFrase(actual => fraseAlAzar(actual)), MS_POR_FRASE);
    return () => clearInterval(t);
  }, []);

  return (
    <LoadingCanvas
      pieIzq={
        <span>
          <Etiqueta tono="rgba(242,241,237,.55)">{mensaje}</Etiqueta>
          <span className="lc-cursor" />
        </span>
      }
      pieDer={<Etiqueta tono="rgba(242,241,237,.3)">Plataforma Global</Etiqueta>}
      barra={<div className="lc-run" style={{ width: '25%', height: '100%', background: AZUL }} />}
    >
      {/* La key reinicia la entrada en cada cambio de frase */}
      <div key={frase} className="lc-rise">
        <Cita texto={frase} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: 'clamp(22px, 3vw, 34px)' }}>
          <span style={{ width: '34px', height: '1px', background: 'rgba(242,241,237,.28)' }} />
          <Etiqueta tono="rgba(242,241,237,.34)">Olea Controls</Etiqueta>
        </div>
      </div>
    </LoadingCanvas>
  );
}
