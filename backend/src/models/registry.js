// backend/src/models/registry.js
import { sequelize } from '../core/db.js';
import { registerModels } from './index.js';
import { setupAssociations } from './associations.js';

let models;

export async function initModels() {
  if (!models) {
    // 1) Cargar/registrar todos los modelos
    const m = await registerModels(sequelize);

    // 2) Asociaciones
    try {
      setupAssociations(m);
    } catch (e) {
      console.error('[models] fallo al asociar:', e?.stack || e);
      throw e;
    }

    models = m;
  }
  return models;
}