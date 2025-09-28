// backend/src/modules/feders/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';
import { uploadSingle} from '../../infra/uploads/multer.js' 

import {
  health,
  listEstados, listModalidadesTrabajo, listDias,
  listFeders, getFeder, postFeder, patchFeder, patchFederActive, deleteFederCtrl,
  getFederModalidad, putFederModalidadBulk, patchFederModalidad, deleteFederModalidad, overview,
  getFirmaPerfil, upsertFirmaPerfil,
  listBancos, createBanco, patchBanco, deleteBanco, getFederSelf, 
  listEmergencias, createEmergencia, patchEmergencia, deleteEmergencia, uploadAvatar, getFederByUserIdCtrl, patchFederSelf
} from './controllers/feders.controller.js';

const router = Router();

// Health
router.get('/health', health);

router.get('/overview', requireAuth, requirePermission('feders','read'), overview);
router.get('/self',              requireAuth,                         getFederSelf);
router.get('/by-user/:userId',   requireAuth, requirePermission('feders','read'), getFederByUserIdCtrl);
router.patch('/self',            requireAuth,                         patchFederSelf);
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

router.post(
  '/:federId/avatar',
  requireAuth,
  requirePermission('feders','update'),
  uploadSingle,            // campo: "file"
  uploadAvatar             // maneja JSON de respuesta / errores
)
// Modalidad por día (feders.assign: “gestión de configuración del feder”)
router.get('/:federId/modalidad',               requireAuth, requirePermission('feders','read'),   getFederModalidad);
router.put('/:federId/modalidad',               requireAuth, requirePermission('feders','assign'), putFederModalidadBulk);
router.patch('/:federId/modalidad',             requireAuth, requirePermission('feders','assign'), patchFederModalidad);
router.delete('/:federId/modalidad/:diaId',     requireAuth, requirePermission('feders','assign'), deleteFederModalidad);

// ===== Firma de perfil (read/update)
router.get('/:federId/firma-perfil',  requireAuth, requirePermission('feders','read'),   getFirmaPerfil);
router.put('/:federId/firma-perfil',   requireAuth, requirePermission('feders','update'), upsertFirmaPerfil);
router.patch('/:federId/firma-perfil', requireAuth, requirePermission('feders','update'), upsertFirmaPerfil);

// ===== Bancos
router.get('/:federId/bancos',              requireAuth, requirePermission('feders','read'),   listBancos);
router.post('/:federId/bancos',             requireAuth, requirePermission('feders','update'), createBanco);
router.patch('/:federId/bancos/:bankId',    requireAuth, requirePermission('feders','update'), patchBanco);
router.delete('/:federId/bancos/:bankId',   requireAuth, requirePermission('feders','update'), deleteBanco);

// ===== Contactos de emergencia
router.get('/:federId/emergencias',                   requireAuth, requirePermission('feders','read'),   listEmergencias);
router.post('/:federId/emergencias',                  requireAuth, requirePermission('feders','update'), createEmergencia);
router.patch('/:federId/emergencias/:contactoId',     requireAuth, requirePermission('feders','update'), patchEmergencia);
router.delete('/:federId/emergencias/:contactoId',    requireAuth, requirePermission('feders','update'), deleteEmergencia);

export default router;
