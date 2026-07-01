import { request } from './apiClient.js';

export const registroService = {
    getRegistro: (cod, version) => {
        const endpoint = `/registro_calificado/${cod}/${version}`;
        return request(endpoint);
    },

    // Obtener todos los registros (endpoint público del backend)
    getAllRegistro: (limit = 500, skip = 0) => {
        const endpoint = `/registro_calificado/registro_calificado/?limit=${limit}&skip=${skip}`;
        return request(endpoint);
    },

    // Obtener registro por cod/version usando la ruta completa (registro_calificado/registro_calificado/{cod}/{version})
    getRegistroDetalle: (cod, version) => {
        const endpoint = `/registro_calificado/registro_calificado/${cod}/${version}`;
        return request(endpoint);
    },

    // Actualizar registro usando la ruta completa
    updateRegistroDetalle: (cod, version, payload) => {
        const endpoint = `/registro_calificado/registro_calificado/${cod}/${version}`;
        return request(endpoint, { method: 'PUT', body: JSON.stringify(payload) });
    },

    createRegistro: (payload) => {
        const endpoint = `/registro_calificado/registro_calificado/registrar`;
        return request(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    },

    updateRegistro: (cod, version, payload) => {
        const endpoint = `/registro_calificado/${cod}/${version}`;
        return request(endpoint, { method: 'PUT', body: JSON.stringify(payload) });
    }
};