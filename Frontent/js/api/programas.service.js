// programas.service.js - Servicio intermedio para los endpoints de programas
// Este archivo: construye endpoints y delega en apiClient.js

import { request } from './apiClient.js';

export const programasService = {
    
    /**
     * Obtener todos los programas de formación
     * @param {number} limit - Límite de registros (default: 200)
     * @returns {Promise<array>} Array de programas
     */
    getProgramas: (limit = 200) => {
        const endpoint = `/programas_formacion/programas_formacion?limit=${limit}`;
        return request(endpoint);
    },

    /**
     * Obtener un programa específico por código y versión
     * @param {string} codPrograma - Código del programa
     * @param {number} version - Versión del programa
     * @returns {Promise<object>} Datos del programa
     */
    getProgramaByCodVersion: (codPrograma, version) => {
        const endpoint = `/programas_formacion/programas_formacion/${codPrograma}/${version}`;
        return request(endpoint);
    },

    /**
     * Obtener todas las versiones de un programa con sus registros calificados
     * @param {string} codPrograma - Código del programa
     * @returns {Promise<array>} Array de programas con registros
     */
    getProgramasConRegistros: (codPrograma) => {
        const endpoint = `/programas_formacion/programas_formacion/con-registros/${codPrograma}`;
        return request(endpoint);
    },

    /**
     * Obtener una red de conocimiento por su ID
     * @param {number} idRed - ID de la red de conocimiento
     * @returns {Promise<object>} Datos de la red
     */
    getRedConocimiento: (idRed) => {
        const endpoint = `/redes_conocimiento/obtener-por-id/${idRed}`;
        return request(endpoint);
    },

    /**
     * Obtener todas las redes de conocimiento
     */
    getTodasRedes: () => {
        const endpoint = `/redes_conocimiento/`;
        return request(endpoint);
    },

    /**
     * Obtener registro calificado por ID
     * @param {number} idRegistro - ID del registro calificado
     * @returns {Promise<object>} Datos del registro
     */
    getRegistroCalificado: (idRegistro) => {
        const endpoint = `/registro_calificado/${idRegistro}`;
        return request(endpoint);
    },

    /**
     * Actualizar un programa (PATCH)
     * @param {string} codPrograma
     * @param {number|string} version
     * @param {object} payload
     */
    updatePrograma: (codPrograma, version, payload) => {
        const endpoint = `/programas_formacion/programas_formacion/${codPrograma}/${version}`;
        return request(endpoint, { method: 'PUT', body: JSON.stringify(payload) });
    },

    /**
     * Crear un nuevo programa de formación
     * @param {object} payload - Datos del programa a crear
     */
    createPrograma: (payload) => {
        const endpoint = `/programas_formacion/programas_formacion/registrar`;
        return request(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    },

    // Aquí puedes agregar más métodos conforme necesites
};