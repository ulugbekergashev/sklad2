const API_BASE = '/api';

function getToken() {
    return localStorage.getItem('sklad_token');
}

export function setToken(token) {
    localStorage.setItem('sklad_token', token);
}

export function removeToken() {
    localStorage.removeItem('sklad_token');
}

export async function api(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add auth token if available
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions = {
        method: options.method || 'GET',
        headers,
    };

    // Stringify body for POST/PUT
    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
    }

    const res = await fetch(`${API_BASE}${path}`, fetchOptions);

    if (res.status === 401) {
        // Don't remove token for login requests (wrong password)
        const isLoginRequest = path.includes('/auth/login');
        if (!isLoginRequest) {
            removeToken();
            window.location.href = '/login';
        }
        let err;
        try { err = await res.json(); } catch (e) { err = { detail: 'Unauthorized' }; }
        throw new Error(err.detail || 'Unauthorized');
    }

    if (!res.ok) {
        let err;
        try { err = await res.json(); } catch (e) { err = { detail: 'Xatolik yuz berdi' }; }
        throw new Error(err.detail || 'Xatolik yuz berdi');
    }

    if (res.headers.get('content-type')?.includes('application/json')) {
        return res.json();
    }
    return res;
}

export const apiGet = (path) => api(path);
export const apiPost = (path, body) => api(path, { method: 'POST', body });
export const apiPut = (path, body) => api(path, { method: 'PUT', body });
export const apiDelete = (path) => api(path, { method: 'DELETE' });

