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

const allowedOrigins = ORIGINS.length ? ORIGINS : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origen (como apps móviles o curl si no se requiere CORS)
    // O verificar contra la lista permitida
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origen no permitido'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id']
}));

// 🔎 nuestro logger por request (correlación + tiempos + body sanitizado)
app.use(requestLogger);

// seguridad básica - relajamos políticas para permitir servir imágenes/archivos correctamente
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:", "https:", "http:"],
      "media-src": ["'self'", "data:", "blob:", "https:", "http:"],
    },
  },
}));

// estáticos
const uploadsDir = path.resolve(process.env.STORAGE_BASE_DIR || 'uploads')
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '365d',
  immutable: true
}))

// También servimos la carpeta public (donde están los avatars)
app.use(express.static(path.resolve('public')))

// body parsers - límites muy altos para videos de producción (suben a Drive, no al server)
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ extended: true, limit: '50gb' }));
app.use(cookieParser());

// healthcheck simple (fuera de /api)
app.get('/health', (_req, res) => res.json({ ok: true, service: 'fedeshub-backend' }));

// rutas de API
app.use('/api', apiRoutes);

// 404 explícito (deja rastro en requestLogger como RES 404)
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// 🎯 único manejador de errores (incluye Zod → 400, Sequelize, etc.)
app.use(errorHandler);

export default app;
