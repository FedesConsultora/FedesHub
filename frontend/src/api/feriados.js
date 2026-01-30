// frontend/src/api/feriados.js
import { api } from './client'

/**
 * Utility to fetch Argentine holidays via our backend
 */
export const feriadosApi = {
    /**
     * List holidays for a specific year
     * @param {number|string} year 
     * @returns {Promise<Array>}
     */
    list: (year) => api.get(`/calendario/feriados/${year}`).then(r => r.data)
}
