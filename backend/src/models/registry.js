// backend/src/models/registry.js
import { sequelize } from '../core/db.js';
import { registerModels } from './index.js';
import { setupAssociations } from './associations.js';

let models;

export async function initModels() {
  if (!models) {
    const m = await registerModels(sequelize);
    setupAssociations(m);
    models = m;
  }
  return models;
}