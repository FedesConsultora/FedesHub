// backend/src/modules/auth/router.js
import { Router } from 'express';
import {
  health, login, refresh, logout, me,
  adminCreateUser, postChangePassword,
  listRoles, listUsers, patchUserRoles, patchUserActive, listPermissionsCtrl, listModulesCtrl, listActionsCtrl, listRoleTypesCtrl,
  getRoleCtrl, createRoleCtrl, updateRoleCtrl, deleteRoleCtrl,
  setRolePermissionsCtrl, addRolePermissionsCtrl, removeRolePermissionsCtrl,
  postForgotPassword,
  postResetPassword
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
