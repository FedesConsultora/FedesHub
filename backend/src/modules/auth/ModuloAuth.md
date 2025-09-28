// backend/src/modules/auth/router.js
import { Router } from 'express';
import {
  health, login, refresh, logout, me,
  adminCreateUser, postChangePassword,
  listRoles, listUsers, patchUserRoles, patchUserActive, listPermissionsCtrl, listModulesCtrl, listActionsCtrl, listRoleTypesCtrl,
  getRoleCtrl, createRoleCtrl, updateRoleCtrl, deleteRoleCtrl,
  setRolePermissionsCtrl, addRolePermissionsCtrl, removeRolePermissionsCtrl
} from './controllers/auth.controller.js';
import { requireAuth } from './middlewares/requireAuth.js';
import { requirePermission } from './middlewares/requirePermission.js';
import { loginLimiter, loginSlowdown, refreshLimiter } from './rateLimiters.js';
import { issueCsrf } from './middlewares/csrf.js';
import { requireCsrf } from './middlewares/requireCsrf.js';

const router = Router();

// health
router.get('/health', health);

// csrf helper (frontend hace POST /csrf al boot y guarda el valor para header X-CSRF-Token)
router.post('/csrf', issueCsrf);

router.post('/forgot-password', postForgotPassword);
router.post('/reset-password',  postResetPassword);

// auth core (con CSRF en login/refresh)
router.post('/login', loginLimiter, loginSlowdown, requireCsrf, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, postChangePassword);

// admin: gestión de usuarios/roles (permiso: auth.assign)
router.post('/users', requireAuth, requirePermission('auth','assign'), adminCreateUser);
router.get('/roles', requireAuth, requirePermission('auth','assign'), listRoles);
router.get('/users', requireAuth, requirePermission('auth','assign'), listUsers);
router.patch('/users/:id/roles', requireAuth, requirePermission('auth','assign'), patchUserRoles);
router.patch('/users/:id/active', requireAuth, requirePermission('auth','assign'), patchUserActive);


// ===== Admin: catálogos de permisos
router.get('/permissions',  requireAuth, requirePermission('auth','assign'), listPermissionsCtrl);
router.get('/modules',      requireAuth, requirePermission('auth','assign'), listModulesCtrl);
router.get('/actions',      requireAuth, requirePermission('auth','assign'), listActionsCtrl);
router.get('/role-types',   requireAuth, requirePermission('auth','assign'), listRoleTypesCtrl);

// ===== Admin: roles CRUD
router.get('/roles/:id',    requireAuth, requirePermission('auth','assign'), getRoleCtrl);
router.post('/roles',       requireAuth, requirePermission('auth','assign'), createRoleCtrl);
router.patch('/roles/:id',  requireAuth, requirePermission('auth','assign'), updateRoleCtrl);
router.delete('/roles/:id', requireAuth, requirePermission('auth','assign'), deleteRoleCtrl);

// ===== Admin: permisos por rol
// set = reemplaza todo, add/remove = incrementales
router.patch('/roles/:id/permissions',  requireAuth, requirePermission('auth','assign'), setRolePermissionsCtrl);
router.post('/roles/:id/permissions',   requireAuth, requirePermission('auth','assign'), addRolePermissionsCtrl);
router.delete('/roles/:id/permissions', requireAuth, requirePermission('auth','assign'), removeRolePermissionsCtrl);

export default router;
// backend/src/modules/auth/validators.js
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(200),
  roles: z.array(z.number().int().positive()).min(1),
  is_activo: z.boolean().optional().default(true)
});

export const changePasswordSchema = z.object({
  old_password: z.string().min(8),
  new_password: z.string()
    .min(10)
    .max(200)
    .refine(s => /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s), 'Debe tener mayúscula, minúscula y número'),
});

export const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const assignUserRolesSchema = z.object({
  userId: z.number().int().positive(),
  roles: z.array(z.number().int().positive()).min(1)
});

export const setUserActiveSchema = z.object({
  userId: z.number().int().positive(),
  is_activo: z.boolean()
});

// filtros para /permissions
export const listPermsQuerySchema = z.object({
  modulo: z.string().trim().toLowerCase().optional(),
  accion: z.string().trim().toLowerCase().optional(),
});

// roles
export const roleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createRoleBodySchema = z.object({
  nombre: z.string().min(3).max(100),
  descripcion: z.string().max(500).nullish(),
  rol_tipo: z.enum(['system','custom']).optional().default('custom') // normalmente 'custom'
});

export const updateRoleBodySchema = z.object({
  nombre: z.string().min(3).max(100).optional(),
  descripcion: z.string().max(500).nullish().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const setRolePermsBodySchema = z.object({
  permisos: z.array(z.number().int().positive()).default([]),
});
// backend/src/modules/auth/router.js
import { Router } from 'express';
import {
  health, login, refresh, logout, me,
  adminCreateUser, postChangePassword,
  listRoles, listUsers, patchUserRoles, patchUserActive, listPermissionsCtrl, listModulesCtrl, listActionsCtrl, listRoleTypesCtrl,
  getRoleCtrl, createRoleCtrl, updateRoleCtrl, deleteRoleCtrl,
  setRolePermissionsCtrl, addRolePermissionsCtrl, removeRolePermissionsCtrl
} from './controllers/auth.controller.js';
import { requireAuth } from './middlewares/requireAuth.js';
import { requirePermission } from './middlewares/requirePermission.js';
import { loginLimiter, loginSlowdown, refreshLimiter } from './rateLimiters.js';
import { issueCsrf } from './middlewares/csrf.js';
import { requireCsrf } from './middlewares/requireCsrf.js';

const router = Router();

// health
router.get('/health', health);

// csrf helper (frontend hace POST /csrf al boot y guarda el valor para header X-CSRF-Token)
router.post('/csrf', issueCsrf);

// auth core (con CSRF en login/refresh)
router.post('/login', loginLimiter, loginSlowdown, requireCsrf, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, postChangePassword);

// admin: gestión de usuarios/roles (permiso: auth.assign)
router.post('/users', requireAuth, requirePermission('auth','assign'), adminCreateUser);
router.get('/roles', requireAuth, requirePermission('auth','assign'), listRoles);
router.get('/users', requireAuth, requirePermission('auth','assign'), listUsers);
router.patch('/users/:id/roles', requireAuth, requirePermission('auth','assign'), patchUserRoles);
router.patch('/users/:id/active', requireAuth, requirePermission('auth','assign'), patchUserActive);


// ===== Admin: catálogos de permisos
router.get('/permissions',  requireAuth, requirePermission('auth','assign'), listPermissionsCtrl);
router.get('/modules',      requireAuth, requirePermission('auth','assign'), listModulesCtrl);
router.get('/actions',      requireAuth, requirePermission('auth','assign'), listActionsCtrl);
router.get('/role-types',   requireAuth, requirePermission('auth','assign'), listRoleTypesCtrl);

// ===== Admin: roles CRUD
router.get('/roles/:id',    requireAuth, requirePermission('auth','assign'), getRoleCtrl);
router.post('/roles',       requireAuth, requirePermission('auth','assign'), createRoleCtrl);
router.patch('/roles/:id',  requireAuth, requirePermission('auth','assign'), updateRoleCtrl);
router.delete('/roles/:id', requireAuth, requirePermission('auth','assign'), deleteRoleCtrl);

// ===== Admin: permisos por rol
// set = reemplaza todo, add/remove = incrementales
router.patch('/roles/:id/permissions',  requireAuth, requirePermission('auth','assign'), setRolePermissionsCtrl);
router.post('/roles/:id/permissions',   requireAuth, requirePermission('auth','assign'), addRolePermissionsCtrl);
router.delete('/roles/:id/permissions', requireAuth, requirePermission('auth','assign'), removeRolePermissionsCtrl);

export default router;
// src/modules/auth/token.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TOKEN } from './constants.js';
import { logger } from '../../core/logger.js';

const baseClaims = () => ({
  iss: TOKEN.ISSUER,
  aud: TOKEN.AUD,
});

export const newJti = () => crypto.randomUUID();

export const signAccess = ({ userId, email, roles = [], permisos = [], jti }) => jwt.sign(
  { sub: String(userId), email, roles, perms: permisos, jti, ...baseClaims() },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: TOKEN.ACCESS_TTL }
);

export const signRefresh = ({ userId, jti }) => jwt.sign(
  { sub: String(userId), type: 'refresh', jti, ...baseClaims() },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: TOKEN.REFRESH_TTL }
);

export const verifyAccess = (token, { ignoreExpiration = false } = {}) => jwt.verify(
  token, process.env.JWT_ACCESS_SECRET, { audience: TOKEN.AUD, issuer: TOKEN.ISSUER, ignoreExpiration }
);

export const verifyRefresh = (token) => jwt.verify(
  token, process.env.JWT_REFRESH_SECRET, { audience: TOKEN.AUD, issuer: TOKEN.ISSUER }
);

// extra helper para leer exp (en segundos) sin verificar firma
export const decodeUnsafe = (token) => {
  try { return jwt.decode(token, { json: true }); } catch (e) { logger.warn({ e }, 'decodeUnsafe'); return null; }
};
// backend/src/modules/auth/revocationCleanup.js
import { purgeExpiredRevocations } from './repositories/jwtRevocation.repo.js';
import { logger } from '../../core/logger.js';

export const startRevocationCleanupJob = () => {
  // corre cada 6 horas
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const run = async () => {
    try { await purgeExpiredRevocations(); }
    catch (e) { logger.warn({ e }, 'purgeExpiredRevocations failed'); }
  };
  run();
  setInterval(run, SIX_HOURS);
};
// backend/src/modules/auth/rateLimiters.js
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const loginSlowdown = slowDown({
  windowMs: 10 * 60 * 1000,
  delayAfter: 5,
  delayMs: () => 500,   
});


// nuevo: limitar /refresh
export const refreshLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
// src/modules/auth/password.js
import argon2 from 'argon2';

export const hashPassword = (plain) =>
  argon2.hash(plain, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

export const verifyPassword = (hash, plain) => argon2.verify(hash, plain);
// src/modules/auth/constants.js
export const COOKIE = {
  ACCESS: 'fh_at',
  REFRESH: 'fh_rt',
  CSRF:   'fh_csrf'
};

export const TOKEN = {
  ISSUER:  process.env.JWT_ISSUER || 'fedeshub',
  AUD:     process.env.JWT_AUDIENCE || 'fedeshub-app',
  ACCESS_TTL:  process.env.ACCESS_TTL || '15m',
  REFRESH_TTL: process.env.REFRESH_TTL || '7d'
};

export const COOKIE_OPTS = {
  base: {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.COOKIE_SECURE || 'false') === 'true',
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/api',
  },
  csrf: {
    httpOnly: false,
    sameSite: 'lax',
    secure: (process.env.COOKIE_SECURE || 'false') === 'true',
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/api',
  }
};
// backend/src/modules/auth/controllers/auth.controller.js
import { loginSchema, createUserSchema, changePasswordSchema,
  listUsersQuerySchema, assignUserRolesSchema, setUserActiveSchema, listPermsQuerySchema, roleIdParamSchema,
  createRoleBodySchema, updateRoleBodySchema, setRolePermsBodySchema } from '../validators.js';
import {
  loginWithPassword, refreshSession, logoutAll, createUserWithRoles, changePassword,
  adminListRoles, adminListUsers, adminAssignUserRoles, adminSetUserActive,  adminListPermissions, adminListModules, adminListActions, adminListRoleTypes,
  adminGetRole, adminCreateRole, adminUpdateRole, adminDeleteRole,
  adminSetRolePermissions, adminAddRolePermissions, adminRemoveRolePermissions
} from '../services/auth.service.js';


import { COOKIE, COOKIE_OPTS } from '../constants.js';

export const health = (_req, res) => res.json({ module: 'auth', ok: true });

export const login = async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await loginWithPassword(res, body);
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const refresh = async (req, res, next) => {
  try {
    await refreshSession(req, res);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

export const logout = async (req, res, next) => {
  try {
    await logoutAll(req, res);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

export const me = async (req, res) => {
  const { userId, email, roles, perms } = req.auth;
  res.json({ user: { id: userId, email }, roles, permisos: perms });
};

export const adminCreateUser = async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const created = await createUserWithRoles(body);
    res.status(201).json(created);
  } catch (e) { next(e); }
};

export const postChangePassword = async (req, res, next) => {
  try {
    const body = changePasswordSchema.parse(req.body);
    await changePassword(req.auth.userId, body);
    res.clearCookie(COOKIE.REFRESH, { ...COOKIE_OPTS.base });
    res.json({ ok: true });
  } catch (e) { next(e); }
};

// admin reads/writes
export const listRoles = async (_req, res, next) => {
  try { res.json(await adminListRoles()); } catch (e) { next(e); }
};

export const listUsers = async (req, res, next) => {
  try {
    const q = listUsersQuerySchema.parse(req.query);
    res.json(await adminListUsers(q));
  } catch (e) { next(e); }
};

export const patchUserRoles = async (req, res, next) => {
  try {
    const { userId, roles } = assignUserRolesSchema.parse({ userId: +req.params.id, ...req.body });
    const updated = await adminAssignUserRoles(userId, roles);
    res.json({ user_id: userId, roles: updated });
  } catch (e) { next(e); }
};

export const patchUserActive = async (req, res, next) => {
  try {
    const { userId, is_activo } = setUserActiveSchema.parse({ userId: +req.params.id, ...req.body });
    await adminSetUserActive(userId, is_activo);
    res.json({ user_id: userId, is_activo });
  } catch (e) { next(e); }
}

// ===== Catálogos permisos
export const listPermissionsCtrl = async (req, res, next) => {
  try { const q = listPermsQuerySchema.parse(req.query); res.json(await adminListPermissions(q)); }
  catch (e) { next(e); }
};

export const listModulesCtrl = async (_req, res, next) => {
  try { res.json(await adminListModules()); } catch (e) { next(e); }
};

export const listActionsCtrl = async (_req, res, next) => {
  try { res.json(await adminListActions()); } catch (e) { next(e); }
};

export const listRoleTypesCtrl = async (_req, res, next) => {
  try { res.json(await adminListRoleTypes()); } catch (e) { next(e); }
};

// ===== Roles
export const getRoleCtrl = async (req, res, next) => {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    res.json(await adminGetRole(id));
  } catch (e) { next(e); }
};

export const createRoleCtrl = async (req, res, next) => {
  try {
    const body = createRoleBodySchema.parse(req.body);
    const created = await adminCreateRole(body);
    res.status(201).json(created);
  } catch (e) { next(e); }
};

export const updateRoleCtrl = async (req, res, next) => {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    const body = updateRoleBodySchema.parse(req.body);
    const updated = await adminUpdateRole(id, body);
    res.json(updated);
  } catch (e) { next(e); }
};

export const deleteRoleCtrl = async (req, res, next) => {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    res.json(await adminDeleteRole(id));
  } catch (e) { next(e); }
};

// ===== Permisos de un rol
export const setRolePermissionsCtrl = async (req, res, next) => {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    const { permisos } = setRolePermsBodySchema.parse(req.body);
    res.json({ rol_id: id, permisos: await adminSetRolePermissions(id, permisos) });
  } catch (e) { next(e); }
};

export const addRolePermissionsCtrl = async (req, res, next) => {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    const { permisos } = setRolePermsBodySchema.parse(req.body);
    res.json({ rol_id: id, permisos: await adminAddRolePermissions(id, permisos) });
  } catch (e) { next(e); }
};

export const removeRolePermissionsCtrl = async (req, res, next) => {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    const { permisos } = setRolePermsBodySchema.parse(req.body);
    res.json({ rol_id: id, permisos: await adminRemoveRolePermissions(id, permisos) });
  } catch (e) { next(e); }
};
// backend/src/modules/auth/services/auth.service.js
import { hashPassword, verifyPassword } from '../password.js';
import { signAccess, signRefresh, newJti, verifyRefresh, decodeUnsafe, verifyAccess } from '../token.js';
import { COOKIE, COOKIE_OPTS } from '../constants.js';
import {
  getActiveEmailDomain, getUserByEmail, createUser, setUserPassword,
  getUserRoles, assignRoles, getPermisosByUserId, getUserById,
  setUserActive, listUsersWithRoles
} from '../repositories/user.repo.js';
import { listAllRoles } from '../repositories/role.repo.js';
import { isRevoked, revokeJti } from '../repositories/jwtRevocation.repo.js';
import {
  listPermissions, listModules, listActions,
  getRolePermissions, setRolePermissions, addRolePermissions, removeRolePermissions
} from '../repositories/permission.repo.js';
import {
  listRoleTypes, getRoleById, createRole, updateRole, deleteRole, isSystemRole
} from '../repositories/role.repo.js';

import crypto from 'crypto';


const emailDomain = (email) => String(email).split('@')[1]?.toLowerCase();

export const ensureDomainAllowed = async (email) => {
  const dom = emailDomain(email);
  const row = await getActiveEmailDomain(dom);
  if (!row) throw Object.assign(new Error('Email no permitido para este sistema'), { status: 401 });
  return row;
};

const issueSession = async (res, { user, roles, permisos }) => {
  const atJti = newJti();
  const rtJti = newJti();

  const access = signAccess({ userId: user.id, email: user.email, roles: roles.map(r => r.nombre), permisos, jti: atJti });
  const refresh = signRefresh({ userId: user.id, jti: rtJti });

  // CSRF doble cookie
  const csrf = crypto.randomBytes(24).toString('base64url');

  // Nota: podés agregar maxAge si querés persistencia entre reinicios del browser
  res.cookie(COOKIE.ACCESS, access, { ...COOKIE_OPTS.base /*, maxAge: 15*60*1000 */ });
  res.cookie(COOKIE.REFRESH, refresh, { ...COOKIE_OPTS.base /*, maxAge: 7*24*60*60*1000 */ });
  res.cookie(COOKIE.CSRF, csrf, { ...COOKIE_OPTS.csrf });

  return { access, refresh, csrf };
};

export const loginWithPassword = async (res, { email, password }) => {
  await ensureDomainAllowed(email);
  const user = await getUserByEmail(email.toLowerCase());
  if (!user || !user.is_activo) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });

  const ok = await verifyPassword(user.password_hash, password);
  if (!ok) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });

  const roles = await getUserRoles(user.id);
  const permisos = await getPermisosByUserId(user.id);

  await issueSession(res, { user, roles, permisos });
  return { user: { id: user.id, email: user.email, is_activo: user.is_activo }, roles, permisos };
};

export const refreshSession = async (req, res) => {
  const token = req.cookies[COOKIE.REFRESH];
  if (!token) throw Object.assign(new Error('No refresh token'), { status: 401 });

  let payload;
  try { payload = verifyRefresh(token); } catch { throw Object.assign(new Error('Refresh inválido'), { status: 401 }); }
  if (await isRevoked(payload.jti)) throw Object.assign(new Error('Refresh revocado'), { status: 401 });

  const decoded = decodeUnsafe(token);
  await revokeJti({ jti: payload.jti, user_id: Number(payload.sub), expires_at: new Date((decoded.exp || 0) * 1000), motivo: 'rotated' });

  const user = await getUserById(payload.sub);
  if (!user || !user.is_activo) throw Object.assign(new Error('Usuario inactivo'), { status: 401 });
  const roles = await getUserRoles(user.id);
  const permisos = await getPermisosByUserId(user.id);

  await issueSession(res, { user, roles, permisos });
  return { ok: true };
};

export const logoutAll = async (req, res) => {
  const at = req.cookies[COOKIE.ACCESS];
  const rt = req.cookies[COOKIE.REFRESH];

  try {
    if (rt) {
      const p = verifyRefresh(rt);
      const d = decodeUnsafe(rt);
      await revokeJti({ jti: p.jti, user_id: Number(p.sub), expires_at: new Date((d.exp || 0) * 1000), motivo: 'logout' });
    }
  } catch {}
  try {
    if (at) {
      const p = verifyAccess(at, { ignoreExpiration: true });
      const d = decodeUnsafe(at);
      await revokeJti({ jti: p.jti, user_id: Number(p.sub), expires_at: new Date((d.exp || 0) * 1000), motivo: 'logout' });
    }
  } catch {}

  res.clearCookie(COOKIE.ACCESS, { ...COOKIE_OPTS.base });
  res.clearCookie(COOKIE.REFRESH, { ...COOKIE_OPTS.base });
  res.clearCookie(COOKIE.CSRF, { ...COOKIE_OPTS.csrf });
  return { ok: true };
};

export const createUserWithRoles = async ({ email, password, roles, is_activo }) => {
  const domRow = await ensureDomainAllowed(email);
  const existing = await getUserByEmail(email.toLowerCase());
  if (existing) throw Object.assign(new Error('El email ya existe'), { status: 400 });

  const password_hash = await hashPassword(password);
  const user = await createUser({ email: email.toLowerCase(), password_hash, email_dominio_id: domRow.id, is_activo: !!is_activo });
  await assignRoles(user.id, roles);
  const userRoles = await getUserRoles(user.id);
  return { user: { id: user.id, email: user.email, is_activo: user.is_activo }, roles: userRoles };
};

export const changePassword = async (userId, { old_password, new_password }) => {
  const user = await getUserById(userId);
  if (!user) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  const ok = await verifyPassword(user.password_hash, old_password);
  if (!ok) throw Object.assign(new Error('Contraseña actual incorrecta'), { status: 400 });

  const password_hash = await hashPassword(new_password);
  await setUserPassword(user.id, password_hash);
  return { ok: true };
};

// admin/helpers
export const adminListRoles = () => listAllRoles();
export const adminListUsers = (q) => listUsersWithRoles(q);
export const adminAssignUserRoles = (userId, roles) => assignRoles(userId, roles);
export const adminSetUserActive = (userId, is_activo) => setUserActive(userId, is_activo);

// ===== Admin: catálogos permisos =====
export const adminListPermissions = (q) => listPermissions(q);
export const adminListModules = () => listModules();
export const adminListActions = () => listActions();
export const adminListRoleTypes = () => listRoleTypes();

// ===== Admin: roles & permisos =====
export const adminGetRole = async (id) => {
  const role = await getRoleById(id);
  if (!role) throw Object.assign(new Error('Rol no encontrado'), { status: 404 });
  const permisos = await getRolePermissions(id);
  return { ...role.get({ plain: true }), permisos };
};

export const adminCreateRole = async (body) => {
  const r = await createRole(body);
  return r.get({ plain: true });
};

export const adminUpdateRole = (id, body) => updateRole(id, body);
export const adminDeleteRole = (id) => deleteRole(id);

export const adminSetRolePermissions = async (id, permisoIds) => {
  if (await isSystemRole(id)) {
    throw Object.assign(new Error('No se pueden modificar permisos de un rol del sistema'), { status: 400 });
  }
  return setRolePermissions(id, permisoIds);
};

export const adminAddRolePermissions = async (id, permisoIds) => {
  if (await isSystemRole(id)) {
    throw Object.assign(new Error('No se pueden modificar permisos de un rol del sistema'), { status: 400 });
  }
  return addRolePermissions(id, permisoIds);
};

export const adminRemoveRolePermissions = async (id, permisoIds) => {
  if (await isSystemRole(id)) {
    throw Object.assign(new Error('No se pueden modificar permisos de un rol del sistema'), { status: 400 });
  }
  return removeRolePermissions(id, permisoIds);
};
// backend/src/modules/auth/repositories/user.repo.js
import { sequelize } from '../../../core/db.js';
import { QueryTypes } from 'sequelize';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

export const getActiveEmailDomain = async (dominio) =>
  models.AuthEmailDominio.findOne({ where: { dominio, is_activo: true } });

export const getUserByEmail = async (email) =>
  models.User.findOne({ where: { email } });

export const getUserById = async (id) => models.User.findByPk(id);

export const createUser = async ({ email, password_hash, email_dominio_id, is_activo }) =>
  models.User.create({ email, password_hash, email_dominio_id, is_activo });

export const setUserPassword = async (userId, password_hash) =>
  models.User.update({ password_hash }, { where: { id: userId } });

export const setUserActive = async (userId, is_activo) =>
  models.User.update({ is_activo }, { where: { id: userId } });

export const getUserRoles = async (userId) => {
  return sequelize.query(`
    SELECT r.id, r.nombre
    FROM "UserRol" ur
    JOIN "Rol" r ON r.id = ur.rol_id
    WHERE ur.user_id = :uid
  `, { type: QueryTypes.SELECT, replacements: { uid: userId }});
};

export const assignRoles = async (userId, rolIds) => {
  await models.UserRol.destroy({ where: { user_id: userId }});
  const rows = rolIds.map(rol_id => ({ user_id: userId, rol_id }));
  if (rows.length) await models.UserRol.bulkCreate(rows, { ignoreDuplicates: true });
  return getUserRoles(userId);
};

export const getPermisosByUserId = async (userId) => {
  const rows = await sequelize.query(`
    SELECT md.codigo AS modulo, ac.codigo AS accion
    FROM "UserRol" ur
    JOIN "RolPermiso" rp ON rp.rol_id = ur.rol_id
    JOIN "Permiso" p ON p.id = rp.permiso_id
    JOIN "Modulo" md ON md.id = p.modulo_id
    JOIN "Accion" ac ON ac.id = p.accion_id
    WHERE ur.user_id = :uid
    GROUP BY md.codigo, ac.codigo
  `, { type: QueryTypes.SELECT, replacements: { uid: userId }});
  return rows.map(r => `${r.modulo}.${r.accion}`);
};

// listado admin (con roles)
export const listUsersWithRoles = async ({ limit = 50, offset = 0 }) => {
  const rows = await sequelize.query(`
    SELECT
      u.id, u.email, u.is_activo,
      COALESCE(
        json_agg(json_build_object('id', r.id, 'nombre', r.nombre)
        ) FILTER (WHERE r.id IS NOT NULL), '[]'
      ) AS roles
    FROM "User" u
    LEFT JOIN "UserRol" ur ON ur.user_id = u.id
    LEFT JOIN "Rol" r ON r.id = ur.rol_id
    GROUP BY u.id
    ORDER BY u.id
    LIMIT :limit OFFSET :offset
  `, { type: QueryTypes.SELECT, replacements: { limit, offset }});
  return rows;
};
// backend/src/modules/auth/repositories/role.repo.js
import { sequelize } from '../../../core/db.js';
import { QueryTypes } from 'sequelize';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

// ya tenías:
export const listAllRoles = async () => {
  return sequelize.query(
    `SELECT id, nombre, descripcion FROM "Rol" ORDER BY nombre`,
    { type: QueryTypes.SELECT }
  );
};

// nuevos:
export const listRoleTypes = () =>
  models.RolTipo.findAll({ attributes: ['id','codigo','nombre','descripcion'], order: [['id','ASC']] });

export const getRoleById = (id) =>
  models.Rol.findByPk(id, { attributes: ['id','nombre','descripcion','rol_tipo_id'] });

export const isSystemRole = async (rolId) => {
  const rows = await sequelize.query(`
    SELECT rt.codigo
    FROM "Rol" r
    JOIN "RolTipo" rt ON rt.id = r.rol_tipo_id
    WHERE r.id = :id
  `, { type: QueryTypes.SELECT, replacements: { id: rolId }});
  return rows[0]?.codigo === 'system';
};

export const createRole = async ({ nombre, descripcion = null, rol_tipo = 'custom' }) => {
  const rows = await sequelize.query(`
    SELECT id FROM "RolTipo" WHERE codigo = :code LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { code: rol_tipo }});
  const rol_tipo_id = rows[0]?.id;
  if (!rol_tipo_id) throw Object.assign(new Error('RolTipo inválido'), { status: 400 });
  return models.Rol.create({ nombre, descripcion, rol_tipo_id });
};

export const updateRole = async (id, { nombre, descripcion }) => {
  if (await isSystemRole(id)) {
    throw Object.assign(new Error('No se puede editar un rol del sistema'), { status: 400 });
  }
  await models.Rol.update(
    { ...(nombre ? { nombre } : {}), ...(descripcion !== undefined ? { descripcion } : {}) },
    { where: { id } }
  );
  return getRoleById(id);
};

export const deleteRole = async (id) => {
  if (await isSystemRole(id)) {
    throw Object.assign(new Error('No se puede eliminar un rol del sistema'), { status: 400 });
  }
  const used = await models.UserRol.count({ where: { rol_id: id }});
  if (used > 0) {
    throw Object.assign(new Error('El rol tiene usuarios asignados'), { status: 400 });
  }
  await models.RolPermiso.destroy({ where: { rol_id: id }});
  await models.Rol.destroy({ where: { id }});
  return { ok: true };
};
// backend/src/modules/auth/repositories/permission.repo.js
import { sequelize } from '../../../core/db.js';
import { QueryTypes } from 'sequelize';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

export const listModules = () =>
  models.Modulo.findAll({ attributes: ['id','codigo','nombre','descripcion'], order: [['codigo','ASC']] });

export const listActions = () =>
  models.Accion.findAll({ attributes: ['id','codigo','nombre','descripcion'], order: [['codigo','ASC']] });

export const listPermissions = async ({ modulo, accion } = {}) => {
  let where = [];
  const repl = {};
  let sql = `
    SELECT p.id, m.codigo AS modulo, a.codigo AS accion, p.nombre, p.descripcion
    FROM "Permiso" p
    JOIN "Modulo" m ON m.id = p.modulo_id
    JOIN "Accion" a ON a.id = p.accion_id
  `;
  if (modulo) { where.push('m.codigo = :modulo'); repl.modulo = modulo; }
  if (accion) { where.push('a.codigo = :accion'); repl.accion = accion; }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY m.codigo, a.codigo';

  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const getRolePermissions = async (rolId) => {
  return sequelize.query(`
    SELECT p.id, m.codigo AS modulo, a.codigo AS accion
    FROM "RolPermiso" rp
    JOIN "Permiso" p ON p.id = rp.permiso_id
    JOIN "Modulo" m ON m.id = p.modulo_id
    JOIN "Accion" a ON a.id = p.accion_id
    WHERE rp.rol_id = :rid
    ORDER BY m.codigo, a.codigo
  `, { type: QueryTypes.SELECT, replacements: { rid: rolId }});
};

export const setRolePermissions = async (rolId, permisoIds) => {
  await models.RolPermiso.destroy({ where: { rol_id: rolId }});
  const rows = permisoIds.map(pid => ({ rol_id: rolId, permiso_id: pid }));
  if (rows.length) await models.RolPermiso.bulkCreate(rows, { ignoreDuplicates: true });
  return getRolePermissions(rolId);
};

export const addRolePermissions = async (rolId, permisoIds) => {
  const rows = permisoIds.map(pid => ({ rol_id: rolId, permiso_id: pid }));
  if (rows.length) await models.RolPermiso.bulkCreate(rows, { ignoreDuplicates: true });
  return getRolePermissions(rolId);
};

export const removeRolePermissions = async (rolId, permisoIds) => {
  if (permisoIds?.length) {
    await models.RolPermiso.destroy({ where: { rol_id: rolId, permiso_id: permisoIds }});
  }
  return getRolePermissions(rolId);
};
// src/modules/auth/repositories/jwtRevocation.repo.js
import { initModels } from '../../../models/registry.js';

import { Op } from 'sequelize';

const models = await initModels();
export const isRevoked = async (jti) => {
  if (!jti) return false;
  const row = await models.JwtRevocacion.findOne({ where: { jti } });
  return !!row;
};

export const revokeJti = async ({ jti, user_id = null, expires_at, motivo = null }) => {
  if (!jti) return;
  await models.JwtRevocacion.findOrCreate({
    where: { jti },
    defaults: { jti, user_id, expires_at, motivo, revoked_at: new Date() }
  });
};

// limpieza opcional (no crítico)
export const purgeExpiredRevocations = async () => {
  await models.JwtRevocacion.destroy({ where: { expires_at: { [Op.lt]: new Date() } } });
};
// src/modules/auth/middlewares/csrf.js
import crypto from 'crypto';
import { COOKIE, COOKIE_OPTS } from '../constants.js';

export const issueCsrf = (_req, res) => {
  const csrf = crypto.randomBytes(24).toString('base64url');
  res.cookie(COOKIE.CSRF, csrf, { ...COOKIE_OPTS.csrf });
  res.json({ csrf });
};
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


import crypto from 'crypto'
import { initModels } from '../../../models/registry.js'
const m = await initModels()

const ttlMinutes = Number(process.env.RESET_TTL_MIN || 30)

export const createPasswordResetToken = async (user_id) => {
  const token = crypto.randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000)
  await m.PasswordReset.create({ user_id, token, expires_at, used_at: null })
  return { token, expires_at }
}

export const usePasswordResetToken = async (token) => {
  const row = await m.PasswordReset.findOne({ where: { token } })
  if (!row) throw Object.assign(new Error('Token inválido'), { status: 400 })
  if (row.used_at) throw Object.assign(new Error('Token ya utilizado'), { status: 400 })
  if (new Date(row.expires_at).getTime() < Date.now())
    throw Object.assign(new Error('Token expirado'), { status: 400 })
  await row.update({ used_at: new Date() })
  return { user_id: row.user_id }
}


export const postForgotPassword = async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await forgotPassword(email);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

export const postResetPassword = async (req, res, next) => {
  try {
    const body = resetPasswordSchema.parse(req.body);
    await resetPasswordByToken(body);
    res.json({ ok: true });
  } catch (e) { next(e); }
};


servicio:


export const forgotPassword = async (email) => {
  // no filtramos dominio aquí; ya lo hacés al crear usuarios y al login
  const user = await getUserByEmail(email);
  if (!user || !user.is_activo) return { ok: true }; // no revelamos existencia

  const { token } = await createPasswordResetToken(user.id);
  const link_url = `${process.env.APP_PUBLIC_URL || 'http://localhost:3000'}/auth/reset?token=${encodeURIComponent(token)}`;

  // Creamos una Notificación para ese usuario con tipo 'reset_password' (asegúrate que exista en catálogo)
  // o reusamos el renderer fallback 'resetPassword'
  await sendNotificationEmails(await _queueResetEmailNotification(user.id, link_url));
  return { ok: true };
};

// src/modules/auth/services/auth.service.js
import crypto from 'crypto';

import { hashPassword, verifyPassword } from '../password.js';
import { signAccess, signRefresh, newJti, verifyRefresh, decodeUnsafe, verifyAccess } from '../token.js';
import { COOKIE, COOKIE_OPTS } from '../constants.js';

import {
  getActiveEmailDomain, getUserByEmail, createUser, setUserPassword,
  getUserRoles, assignRoles, getPermisosByUserId, getUserById,
  setUserActive, listUsersWithRoles
} from '../repositories/user.repo.js';

import { listAllRoles } from '../repositories/role.repo.js';
import { isRevoked, revokeJti } from '../repositories/jwtRevocation.repo.js';
import {
  listPermissions, listModules, listActions,
  getRolePermissions, setRolePermissions, addRolePermissions, removeRolePermissions
} from '../repositories/permission.repo.js';
import {
  listRoleTypes, getRoleById, createRole, updateRole, deleteRole, isSystemRole
} from '../repositories/role.repo.js';

// IMPORTANTE: sequelize se importa desde core/db.js (NO desde initModels)
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';
const models = await initModels();

import { createPasswordResetToken, usePasswordResetToken } from '../repositories/passwordReset.repo.js';
import { sendNotificationEmails } from '../../notificaciones/services/email.service.js';

const emailDomain = (email) => String(email).split('@')[1]?.toLowerCase();

export const ensureDomainAllowed = async (email) => {
  const dom = emailDomain(email);
  const row = await getActiveEmailDomain(dom);
  if (!row) throw Object.assign(new Error('Email no permitido para este sistema'), { status: 401 });
  return row;
};

const issueSession = async (res, { user, roles, permisos }) => {
  const atJti = newJti();
  const rtJti = newJti();

  const access = signAccess({ userId: user.id, email: user.email, roles: roles.map(r => r.nombre), permisos, jti: atJti });
  const refresh = signRefresh({ userId: user.id, jti: rtJti });

  // CSRF doble cookie
  const csrf = crypto.randomBytes(24).toString('base64url');

  res.cookie(COOKIE.ACCESS,  access,  { ...COOKIE_OPTS.base /*, maxAge: 15*60*1000 */ });
  res.cookie(COOKIE.REFRESH, refresh, { ...COOKIE_OPTS.base /*, maxAge: 7*24*60*60*1000 */ });
  res.cookie(COOKIE.CSRF,    csrf,    { ...COOKIE_OPTS.csrf });

  return { access, refresh, csrf };
};

export const loginWithPassword = async (res, { email, password }) => {
  await ensureDomainAllowed(email);
  const user = await getUserByEmail(email.toLowerCase());
  if (!user || !user.is_activo) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });

  const ok = await verifyPassword(user.password_hash, password);
  if (!ok) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });

  const roles = await getUserRoles(user.id);
  const permisos = await getPermisosByUserId(user.id);

  await issueSession(res, { user, roles, permisos });
  return { user: { id: user.id, email: user.email, is_activo: user.is_activo }, roles, permisos };
};

export const refreshSession = async (req, res) => {
  const token = req.cookies[COOKIE.REFRESH];
  if (!token) throw Object.assign(new Error('No refresh token'), { status: 401 });

  let payload;
  try { payload = verifyRefresh(token); } catch { throw Object.assign(new Error('Refresh inválido'), { status: 401 }); }
  if (await isRevoked(payload.jti)) throw Object.assign(new Error('Refresh revocado'), { status: 401 });

  const decoded = decodeUnsafe(token);
  await revokeJti({ jti: payload.jti, user_id: Number(payload.sub), expires_at: new Date((decoded.exp || 0) * 1000), motivo: 'rotated' });

  const user = await getUserById(payload.sub);
  if (!user || !user.is_activo) throw Object.assign(new Error('Usuario inactivo'), { status: 401 });
  const roles = await getUserRoles(user.id);
  const permisos = await getPermisosByUserId(user.id);

  await issueSession(res, { user, roles, permisos });
  return { ok: true };
};

export const logoutAll = async (_req, res) => {
  const at = res.req?.cookies?.[COOKIE.ACCESS];
  const rt = res.req?.cookies?.[COOKIE.REFRESH];

  try {
    if (rt) {
      const p = verifyRefresh(rt);
      const d = decodeUnsafe(rt);
      await revokeJti({ jti: p.jti, user_id: Number(p.sub), expires_at: new Date((d.exp || 0) * 1000), motivo: 'logout' });
    }
  } catch {}
  try {
    if (at) {
      const p = verifyAccess(at, { ignoreExpiration: true });
      const d = decodeUnsafe(at);
      await revokeJti({ jti: p.jti, user_id: Number(p.sub), expires_at: new Date((d.exp || 0) * 1000), motivo: 'logout' });
    }
  } catch {}

  res.clearCookie(COOKIE.ACCESS,  { ...COOKIE_OPTS.base });
  res.clearCookie(COOKIE.REFRESH, { ...COOKIE_OPTS.base });
  res.clearCookie(COOKIE.CSRF,    { ...COOKIE_OPTS.csrf });
  return { ok: true };
};

export const createUserWithRoles = async ({ email, password, roles, is_activo }) => {
  const domRow = await ensureDomainAllowed(email);
  const existing = await getUserByEmail(email.toLowerCase());
  if (existing) throw Object.assign(new Error('El email ya existe'), { status: 400 });

  const password_hash = await hashPassword(password);
  const user = await createUser({ email: email.toLowerCase(), password_hash, email_dominio_id: domRow.id, is_activo: !!is_activo });
  await assignRoles(user.id, roles);
  const userRoles = await getUserRoles(user.id);
  return { user: { id: user.id, email: user.email, is_activo: user.is_activo }, roles: userRoles };
};

export const changePassword = async (userId, { old_password, new_password }) => {
  const user = await getUserById(userId);
  if (!user) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  const ok = await verifyPassword(user.password_hash, old_password);
  if (!ok) throw Object.assign(new Error('Contraseña actual incorrecta'), { status: 400 });

  const password_hash = await hashPassword(new_password);
  await setUserPassword(user.id, password_hash);
  return { ok: true };
};

// ===== Admin: helpers & catálogos =====
export const adminListRoles = () => listAllRoles();
export const adminListUsers = (q) => listUsersWithRoles(q);
export const adminAssignUserRoles = (userId, roles) => assignRoles(userId, roles);
export const adminSetUserActive = (userId, is_activo) => setUserActive(userId, is_activo);

export const adminListPermissions = (q) => listPermissions(q);
export const adminListModules = () => listModules();
export const adminListActions = () => listActions();
export const adminListRoleTypes = () => listRoleTypes();

export const adminGetRole = async (id) => {
  const role = await getRoleById(id);
  if (!role) throw Object.assign(new Error('Rol no encontrado'), { status: 404 });
  const permisos = await getRolePermissions(id);
  return { ...role.get({ plain: true }), permisos };
};

export const adminCreateRole = async (body) => {
  const r = await createRole(body);
  return r.get({ plain: true });
};

export const adminUpdateRole = (id, body) => updateRole(id, body);
export const adminDeleteRole = (id) => deleteRole(id);

export const adminSetRolePermissions = async (id, permisoIds) => {
  if (await isSystemRole(id)) {
    throw Object.assign(new Error('No se pueden modificar permisos de un rol del sistema'), { status: 400 });
  }
  return setRolePermissions(id, permisoIds);
};

export const adminAddRolePermissions = async (id, permisoIds) => {
  if (await isSystemRole(id)) {
    throw Object.assign(new Error('No se pueden modificar permisos de un rol del sistema'), { status: 400 });
  }
  return addRolePermissions(id, permisoIds);
};

export const adminRemoveRolePermissions = async (id, permisoIds) => {
  if (await isSystemRole(id)) {
    throw Object.assign(new Error('No se pueden modificar permisos de un rol del sistema'), { status: 400 });
  }
  return removeRolePermissions(id, permisoIds);
};

// ===== Forgot / Reset password =====
export const forgotPassword = async (email) => {
  const user = await getUserByEmail(email);
  if (!user || !user.is_activo) return { ok: true }; // no revelar existencia

  const { token } = await createPasswordResetToken(user.id);
  const link_url = `${process.env.WEB_ORIGIN || 'http://localhost:3000'}/auth/reset?token=${encodeURIComponent(token)}`;

  try {
    const notifId = await _queueResetEmailNotification(user.id, link_url);
    await sendNotificationEmails(notifId); // dispara envío (fuera de transacción)
    return { ok: true, emailed: true };
  } catch (e) {
    console.error('[forgotPassword] email fail:', e?.message || e);
    return { ok: true, emailed: false };
  }
};

// helper: crea Notificación + Destino con tipo 'reset_password'
async function _queueResetEmailNotification(user_id, link_url) {
  const t = await sequelize.transaction();
  try {
    // 1) Asegurar buzón 'notificaciones'
    let buz = await models.BuzonTipo.findOne({ where: { codigo: 'notificaciones' }, transaction: t });
    if (!buz) {
      buz = await models.BuzonTipo.create(
        { codigo: 'notificaciones', nombre: 'Notificaciones del sistema' },
        { transaction: t }
      );
    }

    // 2) Asegurar NotificacionTipo 'reset_password'
    let tipo = await models.NotificacionTipo.findOne({ where: { codigo: 'reset_password' }, transaction: t });
    if (!tipo) {
      tipo = await models.NotificacionTipo.create({
        codigo: 'reset_password',
        nombre: 'Recuperar contraseña',
        buzon_id: buz.id,
        canales_default_json: ['email']
      }, { transaction: t });
    } else if (tipo.buzon_id !== buz.id) {
      await tipo.update({ buzon_id: buz.id }, { transaction: t });
    }

    // 3) Importancia (fallback a 'media')
    let imp = await models.ImportanciaTipo.findOne({ where: { codigo: 'media' }, transaction: t });
    if (!imp) {
      imp = await models.ImportanciaTipo.create({ codigo: 'media', nombre: 'Media', orden: 2 }, { transaction: t });
    }

    // 4) Crear la notificación con buzon_id obligatorio
    const notif = await models.Notificacion.create({
      tipo_id: tipo.id,
      importancia_id: imp.id,
      buzon_id: tipo.buzon_id,
      titulo: 'Recuperación de contraseña',
      mensaje: null,
      link_url,
      data_json: JSON.stringify({ link: link_url })
    }, { transaction: t });

    await models.NotificacionDestino.create({ notificacion_id: notif.id, user_id }, { transaction: t });

    await t.commit();
    return notif.id;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

export const resetPasswordByToken = async ({ token, new_password }) => {
  const { user_id } = await usePasswordResetToken(token); // valida y consume
  const password_hash = await hashPassword(new_password);
  await setUserPassword(user_id, password_hash);
  return { ok: true };
};

export const resetPasswordByToken = async ({ token, new_password }) => {
  const { user_id } = await usePasswordResetToken(token); // valida y consume
  // reaprovechamos setUserPassword
  const password_hash = await hashPassword(new_password);
  await setUserPassword(user_id, password_hash);
  return { ok: true };
};