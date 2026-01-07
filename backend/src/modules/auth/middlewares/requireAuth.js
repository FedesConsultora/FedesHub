// src/modules/auth/middlewares/requireAuth.js
import { COOKIE } from '../constants.js';
import { verifyAccess } from '../token.js';
import { isRevoked } from '../repositories/jwtRevocation.repo.js';
import { getPermisosByUserId, getUserRoles } from '../repositories/user.repo.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

const isUnsafeMethod = (m) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m);

export const requireAuth = async (req, res, next) => {
  try {
    // token desde cookie (preferido) o header Bearer
    const token = req.cookies[COOKIE.ACCESS] ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token) throw Object.assign(new Error('No autorizado'), { status: 401 });

    const payload = verifyAccess(token);
    if (await isRevoked(payload.jti)) throw Object.assign(new Error('Token revocado'), { status: 401 });

    // CSRF para métodos no idempotentes (doble cookie)
    if (isUnsafeMethod(req.method)) {
      const csrfCookie = req.cookies[COOKIE.CSRF];
      const csrfHeader = req.headers['x-csrf-token'];
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        throw Object.assign(new Error('CSRF token inválido'), { status: 403 });
      }
    }

    // Base auth (de token)
    const auth = {
      userId: Number(payload.sub),
      email: payload.email,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      perms: Array.isArray(payload.perms) ? payload.perms : [],
    };

    // Refrescar permisos/roles si no vinieron en el token
    if (!auth.perms.length) {
      auth.perms = await getPermisosByUserId(auth.userId);
    }
    if (!auth.roles.length) {
      const rr = await getUserRoles(auth.userId);
      auth.roles = rr.map(r => r.nombre);
    }

    // Enriquecer con Feder (para controllers que usan req.user.feder_id, etc.)
    let feder = null;
    try {
      feder = await models.Feder.findOne({
        where: { user_id: auth.userId },
        attributes: ['id', 'avatar_url', 'nombre', 'apellido']
      });
    } catch { }

    // Exponer en req.auth (API “nueva”)
    req.auth = auth;

    // Compat: exponer también en req.user y res.locals.user (API “vieja”)
    const baseUser = {
      id: auth.userId,
      email: auth.email,
      roles: auth.roles,
      permisos: auth.perms,
      feder_id: feder?.id ?? null,
      avatar_url: feder?.avatar_url ?? null,
      nombre: feder?.nombre ?? null,
      apellido: feder?.apellido ?? null,
    };
    req.user = { ...(req.user || {}), ...baseUser };
    res.locals.user = baseUser;

    next();
  } catch (e) {
    next(Object.assign(e, { status: e.status || 401 }));
  }
};
