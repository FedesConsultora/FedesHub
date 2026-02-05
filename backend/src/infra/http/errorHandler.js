import { log } from '../logging/logger.js';

function isZodError(e) { return e?.name === 'ZodError' && Array.isArray(e.issues); }
function isSequelize(e) { return e?.name?.startsWith?.('Sequelize'); }
function guessStatus(e) {
  if (e.status) return e.status;
  if (isZodError(e)) return 400;
  return 500;
}

export function errorHandler(err, req, res, _next) {
  const status = guessStatus(err);
  const payload = {
    ok: false,
    message: err?.message || 'Ocurrió un error inesperado',
    error: err?.message || 'error',
    type: err?.name || 'Error',
  };

  if (isZodError(err)) {
    payload.validation = err.issues?.map(i => ({ path: i.path, code: i.code, msg: i.message })).slice(0, 50);
    payload.message = 'Error de validación: ' + err.issues.map(i => i.message).join(', ');
  }

  const ctx = {
    status,
    error: err?.message,
    name: err?.name,
    stack: process.env.LOG_STACK === '1' ? err?.stack : undefined, // Solo exponer stack en desarrollo
    zod: isZodError(err) ? payload.validation : undefined,
    sequelize: isSequelize(err) ? { parent: err?.parent?.code, fields: err?.fields } : undefined,
  };

  if (req?.log) req.log.error('ERR', ctx);
  else log.error('ERR(no-req)', ctx);

  res.status(status).json(payload);
}
