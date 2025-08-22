// backend/src/modules/feders/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health,
  listEstados, listModalidadesTrabajo, listDias,
  listFeders, getFeder, postFeder, patchFeder, patchFederActive, deleteFederCtrl,
  getFederModalidad, putFederModalidadBulk, patchFederModalidad, deleteFederModalidad
} from './controllers/feders.controller.js';

const router = Router();

// Health
router.get('/health', health);

// Catálogos (feders.read)
router.get('/catalog/estados',     requireAuth, requirePermission('feders','read'), listEstados);
router.get('/catalog/modalidades', requireAuth, requirePermission('feders','read'), listModalidadesTrabajo);
router.get('/catalog/dias-semana', requireAuth, requirePermission('feders','read'), listDias);

// Feders CRUD
router.get('/',            requireAuth, requirePermission('feders','read'),   listFeders);
router.get('/:id',         requireAuth, requirePermission('feders','read'),   getFeder);
router.post('/',           requireAuth, requirePermission('feders','create'), postFeder);
router.patch('/:id',       requireAuth, requirePermission('feders','update'), patchFeder);
router.patch('/:id/active',requireAuth, requirePermission('feders','update'), patchFederActive);
router.delete('/:id',      requireAuth, requirePermission('feders','delete'), deleteFederCtrl);

// Modalidad por día (feders.assign: “gestión de configuración del feder”)
router.get('/:federId/modalidad',               requireAuth, requirePermission('feders','read'),   getFederModalidad);
router.put('/:federId/modalidad',               requireAuth, requirePermission('feders','assign'), putFederModalidadBulk);
router.patch('/:federId/modalidad',             requireAuth, requirePermission('feders','assign'), patchFederModalidad);
router.delete('/:federId/modalidad/:diaId',     requireAuth, requirePermission('feders','assign'), deleteFederModalidad);

export default router;
