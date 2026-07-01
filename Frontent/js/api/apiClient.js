// apiClient.js - Cliente central para todas las peticiones a la API
// Este archivo centraliza: agregar URL base, poner el token, manejar errores 401/403

const API_BASE_URL = 'http://127.0.0.1:8000';

/**
 * Cliente central para realizar todas las peticiones a la API.
 * Automaticamente agrega:
 * - URL base
 * - Token de autorización (Bearer)
 * - Headers necesarios
 * - Manejo de errores 401 (sin permisos) y 403 (token inválido)
 * 
 * @param {string} endpoint - El endpoint al que se llamará (ej. '/programas_formacion/programas_formacion').
 * @param {object} [options={}] - Opciones para la petición fetch (method, headers, body).
 * @returns {Promise<any>} - La respuesta de la API en formato JSON.
 */                          
export async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('access_token');

    // Configuramos las cabeceras por defecto
    const headers = {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        ...options.headers, // Permite sobrescribir o añadir cabeceras
    };

    // Si hay un token, lo añadimos a la cabecera de Authorization
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, { ...options, headers });

        // Manejo centralizado del error 401 (Token inválido/expirado)
        if (response.status === 401) {
            alert("No tiene permisos. Por favor inicie sesión nuevamente.");
            window.location.href = 'login.html';
            return Promise.reject(new Error('Sesión expirada.'));
        }

        // Manejo de error 403 (Token inválido)
        if (response.status === 403) {
            alert("Token inválido. Por favor inicie sesión nuevamente.");
            window.location.href = 'login.html';
            return Promise.reject(new Error('Token inválido.'));
        }

        if (!response.ok) {
            const errorData = await response.json().catch(async () => {
                const txt = await response.text().catch(() => '');
                return { detail: txt || 'Ocurrió un error en la petición.' };
            });
            const message = `${response.status} ${errorData.detail || response.statusText}`.trim();
            const err = new Error(message);
            err.status = response.status;
            err.response = errorData;
            throw err;
        }
        
        // Si la respuesta no tiene contenido (ej. status 204), devolvemos un objeto vacío.
        return response.status === 204 ? {} : await response.json();

    } catch (error) {
        console.error(`Error en la petición a ${endpoint}:`, error);
        throw error;
    }
}
