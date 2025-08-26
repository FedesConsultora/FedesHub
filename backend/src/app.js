// backend/src/app.js
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { logger } from './core/logger.js';
import apiRoutes from './router.js';

const app = express();

// si estamos detrás de proxy/ingress con TLS
app.set('trust proxy', 1);

// CORS con credenciales (cookies) para el frontend
const ORIGINS = (process.env.WEB_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: ORIGINS.length ? ORIGINS : true,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token']
}));

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'fedeshub-backend' }));
app.use('/api', apiRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// errores (incluye zod → 400) — VERBOSO EN DEV
app.use((err, req, res, _next) => {
  if (err?.name === 'ZodError') {
    return res.status(400).json({ error: 'ValidationError', details: err.issues });
  }
  const status = err.status || 500;
  const payload = { error: err.message || 'Internal Error' };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
    payload.path = req.path;
    payload.method = req.method;
  }

  logger.error({ err, path: req.path, method: req.method }, 'UnhandledError');
  res.status(status).json(payload);
});


export default app;