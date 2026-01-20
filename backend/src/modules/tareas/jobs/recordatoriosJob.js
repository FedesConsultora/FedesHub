// backend/src/modules/tareas/jobs/recordatoriosJob.js
import { procesarRecordatorios } from '../services/recordatorios.service.js';
import { logger } from '../../../core/logger.js';

let intervalId = null;

export function startRecordatoriosJob() {
    if (intervalId) return;

    logger.info('Task reminders job started (runs every minute)');

    // Correr cada 20 segundos para mayor precisión (evita el delay de 1m)
    intervalId = setInterval(async () => {
        try {
            await procesarRecordatorios();
        } catch (err) {
            logger.error({ err }, 'Error in recordatoriosJob');
        }
    }, 20000);
}

export function stopRecordatoriosJob() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}
