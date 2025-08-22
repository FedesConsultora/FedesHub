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