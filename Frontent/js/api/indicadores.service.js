// indicadores.service.js - Servicio intermedio para endpoints de indicadores
// Construye endpoints y delega en apiClient.js

import { request } from './apiClient.js';

export const indicadoresService = {
    /**
     * Obtener indicadores (intenta la ruta principal y hace fallback si falla)
     * @returns {Promise<object>}
     */
    getIndicadores: async () => {
        try {
            // Intentar primero la ruta correcta (sin duplicar indicadores_programa)
            return await request('/indicadores_programa/');
        } catch (err) {
            try {
                // Fallback a la ruta con duplicación por compatibilidad
                return await request('/indicadores_programa/indicadores_programa/');
            } catch (err2) {
                throw err; // rethrow original
            }
        }
    },

    /**
     * Obtener indicadores por número de ficha
     * @param {string|number} numeroFicha
     * @returns {Promise<object|array>}
     */
    getIndicadoresByFicha: async (numeroFicha) => {
        // Ruta principal (según backend): /indicadores_programa/ficha/{numero_ficha}
        const endpointPrimary = `/indicadores_programa/ficha/${numeroFicha}`;
        try {
            return await request(endpointPrimary);
        } catch (err) {
            console.warn('Fallo getIndicadoresByFicha en endpoint primario:', endpointPrimary, err.message || err);
            // Fallback antiguo (legacy) por compatibilidad
            const endpointLegacy = `/indicadores_programa/indicadores_programa/${numeroFicha}`;
            try {
                return await request(endpointLegacy);
            } catch (err2) {
                console.error('Fallo getIndicadoresByFicha en endpoint legacy:', endpointLegacy, err2.message || err2);
                throw err; // rethrow original
            }
        }
    },
    /**
     * Actualizar indicadores por número de ficha (PUT)
     * @param {number|string} numeroFicha
     * @param {object} payload
     */
    updateIndicadores: async (numeroFicha, payload) => {
        const endpoint = `/indicadores_programa/ficha/${numeroFicha}`;
        try {
            return await request(endpoint, { method: 'PUT', body: JSON.stringify(payload) });
        } catch (err) {
            console.error('Error en updateIndicadores:', endpoint, err.message || err);
            throw err;
        }
    },

    /**
     * Crear indicadores (POST /registrar)
     * @param {object} payload
     */
    createIndicadores: async (payload) => {
        const endpointPrimary = `/indicadores_programa/registrar`;
        try {
            return await request(endpointPrimary, { method: 'POST', body: JSON.stringify(payload) });
        } catch (err) {
            console.error('Error en createIndicadores (primary):', endpointPrimary, err.status || err.message || err);
            // Si recibimos 404 en registrar, intentar POST a raíz por compatibilidad
            if (err && err.status === 404) {
                const endpointFallback = `/indicadores_programa/`;
                try {
                    return await request(endpointFallback, { method: 'POST', body: JSON.stringify(payload) });
                } catch (err2) {
                    console.error('Error en createIndicadores (fallback):', endpointFallback, err2.status || err2.message || err2);
                    // Antes de re-lanzar, intentar diagnosticar con OpenAPI si el path existe
                    try {
                        const openapi = await request('/openapi.json');
                        const paths = openapi.paths || {};
                        const hasRegistrar = Object.keys(paths).some(p => p.endsWith('/indicadores_programa/registrar'));
                        const hasRoot = Object.keys(paths).some(p => p.endsWith('/indicadores_programa/')) || Object.keys(paths).some(p => p.endsWith('/indicadores_programa'));
                        err2._diagnosis = { hasRegistrar, hasRoot };
                    } catch (diagErr) {
                        console.warn('No se pudo obtener /openapi.json para diagnóstico:', diagErr.message || diagErr);
                    }
                    throw err2;
                }
            }
            throw err;
        }
    }
};
