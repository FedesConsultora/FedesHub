import { COOKIE } from '../constants.js';

const isUnsafe = (m) => ['POST','PUT','PATCH','DELETE'].includes(m);

export const requireCsrf = (req, _res, next) => {
  try {
    if (!isUnsafe(req.method)) return next();

    const csrfCookie = req.cookies?.[COOKIE.CSRF];
    const hdr =
      req.get('x-csrf-token') ||
      req.get('x-xsrf-token') ||
      req.get('x-csrf');

    if (!csrfCookie || !hdr || csrfCookie !== hdr) {
      const err = Object.assign(new Error('CSRF token inválido'), { status: 403 });
      throw err;
    }
    next();
  } catch (e) {
    next(e);
  }
};
