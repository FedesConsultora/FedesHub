// src/modules/auth/middlewares/requireAuth.js
import { COOKIE } from '../constants.js';
import { verifyAccess } from '../token.js';
import { isRevoked } from '../repositories/jwtRevocation.repo.js';
import { getPermisosByUserId } from '../repositories/user.repo.js';

const isUnsafeMethod = (m) => ['POST','PUT','PATCH','DELETE'].includes(m);

export const requireAuth = async (req, res, next) => {
  try {
    // token desde cookie (preferido) o header
    const token = req.cookies[COOKIE.ACCESS] ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token) throw Object.assign(new Error('No autorizado'), { status: 401 });

    const payload = verifyAccess(token);
    if (await isRevoked(payload.jti)) throw Object.assign(new Error('Token revocado'), { status: 401 });

    // CSRF (doble cookie): para métodos no idempotentes
    if (isUnsafeMethod(req.method)) {
      const csrfCookie = req.cookies[COOKIE.CSRF];
      const csrfHeader = req.headers['x-csrf-token'];
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader)
        throw Object.assign(new Error('CSRF token inválido'), { status: 403 });
    }

    req.auth = {
      userId: Number(payload.sub),
      email: payload.email,
      roles: payload.roles || [],
      perms: payload.perms || [],
    };

    // si no vino perms en el token (o querés siempre frescos) podés recargar:
    if (!req.auth.perms?.length) {
      req.auth.perms = await getPermisosByUserId(req.auth.userId);
    }
    next();
  } catch (e) {
    next(Object.assign(e, { status: e.status || 401 }));
  }
};
