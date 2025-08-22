// backend/src/modules/auth/middlewares/requireCsrf.js
import { COOKIE } from '../constants.js';

export const requireCsrf = (req, _res, next) => {
  const cookie = req.cookies?.[COOKIE.CSRF];
  const header = req.headers['x-csrf-token'];
  if (!cookie || !header || cookie !== header) {
    return next(Object.assign(new Error('CSRF token inválido'), { status: 403 }));
  }
  next();
};
