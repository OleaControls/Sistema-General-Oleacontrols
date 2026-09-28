import prisma from './prisma.js';
import { verifyToken } from './auth.js';

/**
 * Corta las sesiones que dejaron de ser válidas.
 *
 * EL PROBLEMA QUE RESUELVE
 * Un JWT es una afirmación firmada, no una consulta: una vez emitido, vale
 * hasta que caduca —aquí, 7 días— y nadie puede retirarlo. Eso significaba
 * que dar de baja a un empleado no le quitaba el acceso: `login.js` le
 * impedía volver a entrar, pero el token que ya tenía en el navegador seguía
 * abriendo nómina, gastos y clientes durante una semana. Lo mismo al quitarle
 * un rol: su token viejo seguía diciendo ADMIN.
 *
 * POR QUÉ AQUÍ Y NO EN authMiddleware
 * `authMiddleware` es síncrona y la llaman los 45 handlers en su primera
 * línea. Volverla asíncrona obligaría a tocar los 45 y a no equivocarse en
 * ninguno. El gateway, en cambio, es un solo punto por el que pasan todos:
 * la comprobación se hace una vez y los cubre a todos sin editarlos.
 *
 * EL CACHÉ
 * Sin caché esto sería una consulta extra por petición, justo lo contrario de
 * lo que se viene optimizando. Con 60 segundos, cada usuario cuesta como mucho
 * una consulta por minuto y por instancia caliente, y la ventana de exposición
 * tras una baja queda acotada a ese minuto. Un minuto de acceso residual es
 * otra cosa que siete días.
 */
const MS_VIGENCIA = 60_000;
const MAX_ENTRADAS = 500;

/** empleadoId -> { activo, roles, hasta } */
const cache = new Map();

function limpiarSiCrece() {
  // La empresa tiene decenas de usuarios, no miles: esto casi nunca corre. Está
  // para que una instancia de larga vida no acumule entradas indefinidamente.
  if (cache.size < MAX_ENTRADAS) return;
  const ahora = Date.now();
  for (const [id, v] of cache) if (v.hasta <= ahora) cache.delete(id);
}

async function estadoDe(empleadoId) {
  const guardado = cache.get(empleadoId);
  if (guardado && guardado.hasta > Date.now()) return guardado;

  const fila = await prisma.credentials.findUnique({
    where: { employeeId: empleadoId },
    select: { roles: true, employee: { select: { status: true } } },
  });

  const estado = {
    // Sin fila de credenciales no hay cuenta: la sesión no puede seguir viva.
    activo: !!fila && fila.employee?.status !== 'INACTIVE',
    roles: fila?.roles || [],
    hasta: Date.now() + MS_VIGENCIA,
  };
  limpiarSiCrece();
  cache.set(empleadoId, estado);
  return estado;
}

/** Fuerza que la próxima petición de esa persona vuelva a consultar la base. */
export function olvidarSesion(empleadoId) {
  cache.delete(empleadoId);
}

const mismosRoles = (a, b) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * Devuelve el motivo por el que la sesión ya no vale, o null si sigue siendo
 * buena. No responde por sí misma: quien llama decide qué hacer.
 */
export async function motivoRevocacion(req) {
  /* El login queda fuera, y no es un descuido: el navegador manda el token
     viejo en todas sus peticiones, incluida la de entrar. Sin esta excepción,
     alguien a quien le cambiaron los roles recibiría "vuelve a iniciar sesión"
     justo al intentar iniciar sesión, y no habría forma de salir del bucle. */
  if ((req.url || '').split('?')[0].endsWith('/login')) return null;

  const cabecera = req.headers?.authorization;
  if (!cabecera?.startsWith('Bearer ')) return null; // sin token: no es asunto de aquí

  const token = verifyToken(cabecera.split(' ')[1]);
  if (!token?.id) return null; // firma inválida o caducada: lo rechaza authMiddleware

  try {
    const estado = await estadoDe(token.id);

    if (!estado.activo) {
      return 'Tu cuenta fue dada de baja. Contacta a Recursos Humanos.';
    }

    /* Los roles del token quedaron congelados al iniciar sesión. Si cambiaron,
       se corta: es la única forma de que quitar un permiso surta efecto sin
       esperar a que caduque el token. La persona vuelve a entrar y su sesión
       nueva ya trae los roles correctos. */
    if (!mismosRoles(token.roles || [], estado.roles)) {
      return 'Tus permisos cambiaron. Vuelve a iniciar sesión.';
    }

    return null;
  } catch (err) {
    /* Si la base no responde, se deja pasar. No es una concesión: prácticamente
       todos los handlers consultan la base, así que la petición va a fallar de
       todas formas unos milisegundos después. Cerrar aquí no protegería nada y
       convertiría cualquier hipo de la base en un muro de login para todos. */
    console.error('[sesiones] No se pudo revalidar, se deja pasar:', err.message);
    return null;
  }
}
