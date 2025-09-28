import app from './app.js';
import { logger } from './core/logger.js';
import { sequelize } from './core/db.js';
import { initModels } from './models/registry.js';
import { startRevocationCleanupJob } from './modules/auth/revocationCleanup.js';
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

    startRevocationCleanupJob();
    app.listen(PORT, () => logger.info(`API on http://localhost:${PORT}`));
  } catch (err) {
    logger.error({ err }, 'Startup failed');
    process.exit(1);
  }
})();
