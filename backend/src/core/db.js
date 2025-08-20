// backend/src/core/db.js
import { Sequelize } from 'sequelize';
import { runtimeDbConfig } from './config.js';

const env = process.env.NODE_ENV || 'development';
const cfg = runtimeDbConfig[env];

export const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, cfg);
