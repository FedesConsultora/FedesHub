// backend/src/app.js
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import apiRoutes from './router.js';
import { requestLogger } from './infra/http/requestLogger.js';
import { errorHandler } from './infra/http/errorHandler.js';

const app = express();

// si estamos detrás de proxy/ingress con TLS
app.set('trust proxy', 1);

// --- 1. ARCHIVOS ESTÁTICOS (Prioridad máxima para evitar 502) ---
const uploadsDir = path.resolve(process.env.STORAGE_BASE_DIR || 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    console.log(`[INIT] Creating uploads directory: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.error(`[CRITICAL] Failed to ensure uploads directory: ${err.message}`);
}

app.use('/uploads', express.static(uploadsDir, { maxAge: '365d', immutable: true }));
app.use('/avatars', express.static(path.resolve('public/avatars'), { maxAge: '7d' }));
app.use(express.static(path.resolve('public')));

// --- 2. CONFIGURACIÓN DE ORIGENS ---
const ORIGINS = (process.env.WEB_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = ORIGINS.length ? ORIGINS : ['http://localhost:3000', 'http://localhost:5173', 'https://hub.fedes.ai'];

// --- 3. MIDDLEWARES GLOBALES ---
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id']
}));

app.use(requestLogger);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Desactivamos CSP temporalmente para asegurar carga de recursos
}));

app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ extended: true, limit: '50gb' }));
app.use(cookieParser());

// --- 4. RUTAS ---
app.get('/health', (_req, res) => res.json({ ok: true, service: 'fedeshub-backend' }));
app.use('/api', apiRoutes);

// 404 explícito
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// 🎯 Manejador de errores
app.use(errorHandler);

export default app;
