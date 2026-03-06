import { initModels } from 'c:/Users/Belen/Desktop/Fedes/FedesHub/backend/src/models/registry.js';
const m = await initModels();
const types = await m.EventoTipo.findAll();
console.log(JSON.stringify(types.map(t => t.get({ plain: true })), null, 2));
process.exit(0);
