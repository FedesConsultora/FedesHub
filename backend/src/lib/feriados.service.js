// backend/src/lib/feriados.service.js

/**
 * Servicio para obtener feriados argentinos desde ArgentinaDatos
 */
export const feriadosService = {
    /**
     * Obtiene la lista de feriados para un año específico
     * @param {number|string} year 
     * @returns {Promise<Array>}
     */
    getFeriados: async (year) => {
        const url = `https://api.argentinadatos.com/v1/feriados/${year}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Error al obtener feriados (${response.status}): ${response.statusText}`);
            }

            const data = await response.json();

            // La API retorna una lista de objetos: { fecha, tipo, nombre }
            return data;
        } catch (error) {
            console.error(`[FeriadosService] Error fetching holidays for ${year}:`, error);
            throw error;
        }
    }
};
