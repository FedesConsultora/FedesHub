// backend/src/modules/asistencia/jobs/autoCloseAttendance.js
import { svcAutoCloseOverdueRecords } from '../services/asistencia.service.js';
import { logger } from '../../../core/logger.js';

/**
 * Job que cierra automáticamente registros de asistencia abiertos
 * que deberían haberse cerrado a las 21:00 o 23:59 hs (hora Argentina UTC-3)
 * 
 * Frecuencia: cada 15 minutos
 */
export const startAutoCloseAttendanceJob = () => {
    const FIFTEEN_MINUTES = 15 * 60 * 1000;

    const run = async () => {
        try {
            const result = await svcAutoCloseOverdueRecords();
            if (result.closed > 0 || result.errors > 0) {
                logger.info(result, 'Auto-close attendance job: ejecución completada');
            }
        } catch (err) {
            logger.error({ err }, 'Auto-close attendance job: error en ejecución');
        }
    };

    // Ejecutar inmediatamente al iniciar
    run();

    // Programar ejecuciones cada 15 minutos
    setInterval(run, FIFTEEN_MINUTES);

    logger.info('Auto-close attendance job started (runs every 15 minutes)');
};
