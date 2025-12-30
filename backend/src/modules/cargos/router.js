// backend/src/modules/cargos/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health,
  // catálogos
  listAmbitos,
  // cargos
  listCargos, getCargo, postCargo, patchCargo, patchCargoActive, deleteCargoCtrl, listCargosWithPeopleCtrl,
  // asignaciones
  listFederCargoHistory, assignCargoToFeder, patchFederAssignment, deleteFederAssignment
} from './controllers/cargos.controller.js';

const router = Router();

// health
router.get('/health', health);

// catálogos (cargos.read)
router.get('/ambitos', requireAuth, requirePermission('cargos', 'read'), listAmbitos);

// cargos
router.get('/', requireAuth, requirePermission('cargos', 'read'), listCargos);
router.get('/overview', requireAuth, requirePermission('cargos', 'read'), listCargosWithPeopleCtrl);
router.get('/:id', requireAuth, requirePermission('cargos', 'read'), getCargo);
router.post('/', requireAuth, requirePermission('cargos', 'create'), postCargo);
router.patch('/:id', requireAuth, requirePermission('cargos', 'update'), patchCargo);
router.patch('/:id/active', requireAuth, requirePermission('cargos', 'update'), patchCargoActive);
router.delete('/:id', requireAuth, requirePermission('cargos', 'delete'), deleteCargoCtrl);

// asignaciones a feders (cargos.assign)
router.get('/feder/:federId', requireAuth, requirePermission('cargos', 'read'), listFederCargoHistory);
router.post('/feder/:federId/assign', requireAuth, requirePermission('cargos', 'assign'), assignCargoToFeder);
router.patch('/feder/:federId/assignments/:id', requireAuth, requirePermission('cargos', 'assign'), patchFederAssignment);
router.delete('/feder/:federId/assignments/:id', requireAuth, requirePermission('cargos', 'assign'), deleteFederAssignment);

export default router;
