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
        // Opcional: Manejar expiración de token
        // localStorage.removeItem('olea_user');
        // localStorage.removeItem('olea_token');
        // window.location.href = '/login';
    }

    return response;
}
