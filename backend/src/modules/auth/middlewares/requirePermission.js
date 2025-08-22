// src/modules/auth/middlewares/requirePermission.js
export const requirePermission = (modulo, accion) => {
  const needed = `${modulo}.${accion}`;
  return (req, _res, next) => {
    const perms = req.auth?.perms || [];
    if (!perms.includes(needed) && !perms.includes('*.*')) {
      const err = Object.assign(new Error('Permiso insuficiente'), { status: 403 });
      return next(err);
    }
    next();
  };
};
