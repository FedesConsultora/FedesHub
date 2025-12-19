// /backend/src/modules/celulas/router.js
// router.js — Rutas y permisos del módulo Células
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health, getEstados, getRolTipos,
  list, detail, create, patch, postState,
  listAsign, postAsign, closeAsign,
  listClientes, coverage, uploadAvatar
} from './controllers/celulas.controller.js';
import { uploadSingle } from '../../infra/uploads/multer.js';

const router = Router();
router.post('/:id/avatar', requireAuth, requirePermission('celulas', 'update'), uploadSingle, uploadAvatar);

router.get('/health', health);

// Catálogos
router.get('/catalog/estados', requireAuth, requirePermission('celulas', 'read'), getEstados);
router.get('/catalog/roles', requireAuth, requirePermission('celulas', 'read'), getRolTipos);

// CRUD
router.get('/', requireAuth, requirePermission('celulas', 'read'), list);
router.get('/:id', requireAuth, requirePermission('celulas', 'read'), detail);
router.post('/', requireAuth, requirePermission('celulas', 'create'), create);
router.patch('/:id', requireAuth, requirePermission('celulas', 'update'), patch);
router.post('/:id/state', requireAuth, requirePermission('celulas', 'update'), postState);

// Asignaciones
router.get('/:id/asignaciones', requireAuth, requirePermission('celulas', 'read'), listAsign);
router.post('/:id/asignaciones', requireAuth, requirePermission('celulas', 'assign'), postAsign);
router.patch('/asignaciones/:asignacionId', requireAuth, requirePermission('celulas', 'update'), closeAsign);

// Clientes de la célula
router.get('/:id/clientes', requireAuth, requirePermission('celulas', 'read'), listClientes);

// Cobertura del tridente
router.get('/:id/coverage', requireAuth, requirePermission('celulas', 'read'), coverage);

export default router;
