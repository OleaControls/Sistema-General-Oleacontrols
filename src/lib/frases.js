/* Frases de OLEA CONTROLS para las pantallas de espera (splash de carga y
   bienvenida del login). Un solo lugar: agregar o quitar aquí las cambia en
   todas partes. */

export const FRASES = [
  'Cada gran logro comienza con un pequeño paso.',
  'En OLEA CONTROLS, cada persona hace la diferencia.',
  'La innovación comienza con una idea y crece con un gran equipo.',
  'Juntos convertimos retos en soluciones.',
  'Tu trabajo impulsa nuestro crecimiento.',
  'Hoy es un buen día para superar tus límites.',
  'La excelencia no es un acto, es un hábito.',
  'Cada problema es una oportunidad para mejorar.',
  'Construimos soluciones. Creamos futuro.',
  'El éxito de OLEA CONTROLS comienza con nuestro equipo.',
  'Haz que hoy cuente.',
  'Tu talento es parte de nuestra tecnología.',
  'Innovar es atreverse a hacer las cosas mejor.',
  'Los grandes resultados se construyen en equipo.',
  'No busques el camino fácil, construye el mejor camino.',
  'Cada proyecto es una oportunidad para demostrar de qué somos capaces.',
  'La calidad comienza con la actitud.',
  'Piensa diferente. Trabaja en equipo. Hazlo realidad.',
  'Donde otros ven problemas, nosotros vemos soluciones.',
  'OLEA CONTROLS: tecnología, compromiso y futuro.',
];

/** Una frase al azar, distinta a la que se esté mostrando. */
export const fraseAlAzar = (excepto) => {
  const pool = excepto ? FRASES.filter(f => f !== excepto) : FRASES;
  return pool[Math.floor(Math.random() * pool.length)];
};

export default FRASES;
