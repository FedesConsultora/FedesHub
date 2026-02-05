import { makeReqLogger } from '../logging/logger.js';

// Nano requestId sin deps
function rid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SENSITIVE_FIELDS = ['password', 'old_password', 'new_password', 'token', 'access_token', 'refresh_token'];

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const safe = Array.isArray(body) ? [...body] : { ...body };

  for (const key in safe) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      safe[key] = '[REDACTED]';
    } else if (typeof safe[key] === 'object') {
      safe[key] = sanitizeBody(safe[key]);
    }
  }
  return safe;
}

export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const requestId = req.get('x-request-id') || rid();
  const route = `${req.method} ${req.originalUrl || req.url}`;
  req.requestId = requestId;
  // Pasamos el objeto req para que el logger pueda leer req.user de forma dinámica en cada log
  req.log = makeReqLogger({ requestId, req, route });

  req.log.info('REQ', {
    ip: req.ip,
    ua: req.get('user-agent'),
    params: req.params,
    query: req.query,
    // OJO: no logueo body binario, y redacto campos sensibles
    body: req.is('multipart/*') ? '[multipart]' : sanitizeBody(req.body),
    headers: { 'content-type': req.get('content-type'), 'content-length': req.get('content-length') }
  });

  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    req.log.info('RES', { status: res.statusCode, ms: Math.round(ms) });
  });

  next();
}
