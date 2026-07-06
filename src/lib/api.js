/**
 * Utility to make authenticated fetch requests.
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

    const response = await fetch(url, {
        ...options,
        headers,
    });

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
