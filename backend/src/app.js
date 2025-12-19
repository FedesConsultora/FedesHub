// backend/src/app.js
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';

import apiRoutes from './router.js';

import { requestLogger } from './infra/http/requestLogger.js';
import { errorHandler } from './infra/http/errorHandler.js';

const app = express();

// si estamos detrás de proxy/ingress con TLS
app.set('trust proxy', 1);

// CORS con credenciales (cookies) para el frontend
const ORIGINS = (process.env.WEB_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: ORIGINS.length ? ORIGINS : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id']
}));

// estáticos
const uploadsDir = path.resolve(process.env.STORAGE_BASE_DIR || 'uploads')
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '365d',
  immutable: true
}))

// También servimos la carpeta public (donde están los avatars)
app.use(express.static(path.resolve('public')))

// seguridad básica
app.use(helmet());

// body parsers - límites muy altos para videos de producción (suben a Drive, no al server)
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ extended: true, limit: '50gb' }));
app.use(cookieParser());

// 🔎 nuestro logger por request (correlación + tiempos + body sanitizado)
app.use(requestLogger);

// healthcheck simple (fuera de /api)
app.get('/health', (_req, res) => res.json({ ok: true, service: 'fedeshub-backend' }));

// rutas de API
app.use('/api', apiRoutes);

// 404 explícito (deja rastro en requestLogger como RES 404)
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// 🎯 único manejador de errores (incluye Zod → 400, Sequelize, etc.)
app.use(errorHandler);

export default app;
