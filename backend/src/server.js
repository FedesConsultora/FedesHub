import app from './app.js'; // Sync comment
import { logger } from './core/logger.js';
import { sequelize } from './core/db.js';
import { initModels } from './models/registry.js';
import { startRevocationCleanupJob } from './modules/auth/revocationCleanup.js';
import { startAutoCloseAttendanceJob } from './modules/asistencia/jobs/autoCloseAttendance.js';
import { startOnboardingJob } from './modules/comercial/jobs/onboardingJob.js';
import { startRecordatoriosJob } from './modules/tareas/jobs/recordatoriosJob.js';
import { storage } from './infra/storage/index.js';


const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate();
    await initModels();
    logger.info('DB connected & models initialized');

    // 🔎 Verificar acceso a Drive en startup
    if (storage.checkAccess) {
      const check = await storage.checkAccess();
      if (check.ok) {
        logger.info({ drive: check.drive }, 'Google Drive access OK');
      } else {
        logger.warn({ error: check.error }, 'Google Drive access FAILED');
      }
    }

    // Start background jobs safely
    const runJob = (name, fn) => {
      try {
        fn();
        logger.info(`Job started: ${name}`);
      } catch (err) {
        logger.error({ err }, `Failed to start job: ${name}`);
      }
    };

    runJob('RevocationCleanup', startRevocationCleanupJob);
    runJob('AutoCloseAttendance', startAutoCloseAttendanceJob);
    runJob('Onboarding', startOnboardingJob);
    runJob('Recordatorios', startRecordatoriosJob);

    app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT, host: '0.0.0.0' }, 'SERVER STARTED SUCCESSFULY');
    });
  } catch (err) {
    logger.error({ err }, 'FATAL STARTUP ERROR');
    process.exit(1);
  }
})();
