// backend/src/app.js 
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { logger } from './core/logger.js';
import apiRoutes from './routes.js';

const app = express();
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'fedeshub-backend' }));
app.use('/api', apiRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// error handler
app.use((err, _req, res, _next) => {
  logger.error({ err }, 'UnhandledError');
  res.status(err.status || 500).json({ error: err.message || 'Internal Error' });
});

export default app;
