// backend/src/models/index.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { DataTypes } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carga dinámica de modelos ESM.
 * - Recorre recursivamente ./ (excepto index.js y associations.js)
 * - Importa cada archivo .js y ejecuta su export default(sequelize, DataTypes)
 * Devuelve el diccionario { ModelName: Model }.
 */
export const registerModels = async (sequelize) => {
  const models = {};

  const load = async (dir) => {
    const abs = path.join(__dirname, dir);
    if (!fs.existsSync(abs)) return;
    const files = fs.readdirSync(abs);

    for (const file of files) {
      const full = path.join(abs, file);

      if (fs.statSync(full).isDirectory()) {
        await load(path.join(dir, file));
        continue;
      }
      if (!file.endsWith('.js')) continue;
      if (file === 'index.js' || file === 'associations.js') continue;

      const url = pathToFileURL(full).href;
      try {
        const mod = await import(url);
        const def = mod.default;
        if (typeof def !== 'function') continue;

        const model = def(sequelize, DataTypes);
        if (!model || !model.name) continue;
        models[model.name] = model;
      } catch (err) {
        console.error('[models] ERROR IMPORTANDO:', url, err.message);
      }
    }
  };

  await load('.');
  return models;
};
