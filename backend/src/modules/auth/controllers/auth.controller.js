// backend/src/modules/auth/controllers/auth.controller.js
import { loginSchema, createUserSchema, changePasswordSchema,
  listUsersQuerySchema, assignUserRolesSchema, setUserActiveSchema, listPermsQuerySchema, roleIdParamSchema,
  createRoleBodySchema, updateRoleBodySchema, setRolePermsBodySchema, forgotPasswordSchema, resetPasswordSchema } from '../validators.js';
import {
  loginWithPassword, refreshSession, logoutAll, createUserWithRoles, changePassword,
  adminListRoles, adminListUsers, adminAssignUserRoles, adminSetUserActive,  adminListPermissions, adminListModules, adminListActions, adminListRoleTypes,
  adminGetRole, adminCreateRole, adminUpdateRole, adminDeleteRole,
  adminSetRolePermissions, adminAddRolePermissions, adminRemoveRolePermissions,
  forgotPassword, resetPasswordByToken
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