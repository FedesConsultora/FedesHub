import app from './app.js';
import { logger } from './core/logger.js';
import { sequelize } from './core/db.js';
import { initModels } from './models/registry.js';
import { startRevocationCleanupJob } from './modules/auth/revocationCleanup.js';

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate();
    await initModels();
    logger.info('DB connected & models initialized');

    startRevocationCleanupJob();

    app.listen(PORT, () => logger.info(`API on http://localhost:${PORT}`));
  } catch (err) {
    logger.error({ err }, 'Startup failed');
    process.exit(1);
  }
})();
