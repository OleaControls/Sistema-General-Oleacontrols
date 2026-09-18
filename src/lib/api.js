import { encolar } from '@/lib/outbox';

/**
 * Utility to make authenticated fetch requests.
 *
 * `encolarSiFalla: true` hace que una escritura que no pudo salir por falta de
 * red se guarde en la cola y se reintente sola. Devuelve entonces un 202 con
 * `{ encolado: true }` en vez de lanzar.
 *
 * Es opcional a propósito, y no el comportamiento por omisión: quien recibe un
 * 202 no tiene todavía la fila creada ni su id, así que solo puede pedirlo una
 * vista preparada para eso. Activarlo en todas partes haría que un formulario
 * que espera el objeto recién creado se rompiera de una forma difícil de ver.
 *
 * @param {string} url
 * @param {object} options
 */
export async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('olea_token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const { encolarSiFalla, descripcion, claveIdempotencia, ...opcionesFetch } = options;

    // Si quien llama trae una clave, el servidor garantiza que ese envio no se
    // ejecute dos veces aunque llegue repetido.
    if (claveIdempotencia) headers['Idempotency-Key'] = claveIdempotencia;
    const metodo = (opcionesFetch.method || 'GET').toUpperCase();
    const puedeEncolarse = encolarSiFalla && metodo !== 'GET' && metodo !== 'HEAD';

    let response;
    try {
        response = await fetch(url, { ...opcionesFetch, headers });
    } catch (error) {
        // fetch solo lanza cuando no hubo respuesta: sin red, DNS caído, el
        // servidor inalcanzable. Un 500 NO llega aquí, y hace bien: un error
        // del servidor se repetiría igual al reintentarlo.
        if (puedeEncolarse) {
            const clave = await encolar({
                url, metodo, cuerpo: opcionesFetch.body, descripcion,
            });
            if (clave) {
                return new Response(
                    JSON.stringify({ encolado: true, clave }),
                    { status: 202, headers: { 'Content-Type': 'application/json' } }
                );
            }
        }
        throw error;
    }

    if (response.status === 401) {
        // Token expirado o inválido: limpiar sesión y redirigir al login.
        // Evitamos el redirect si ya estamos en /login para no crear un bucle.
        localStorage.removeItem('olea_user');
        localStorage.removeItem('olea_token');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    return response;
}
