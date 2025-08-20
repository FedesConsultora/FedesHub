// backend/src/server.js 
import app from './app.js';
import { logger } from './core/logger.js';
import { sequelize } from './core/db.js';
import { registerModels } from './models/index.js';
import { setupAssociations } from './models/associations.js';

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    const models = await registerModels(sequelize);
    setupAssociations(models);

    await sequelize.authenticate();
    logger.info('DB connected');

    app.listen(PORT, () => logger.info(`API on http://localhost:${PORT}`));
  } catch (err) {
    logger.error({ err }, 'Startup failed');
    process.exit(1);
  }
})();
