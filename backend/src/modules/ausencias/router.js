// /backend/src/modules/ausencias/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health,
  // Catálogos
  getUnidades, getEstados, getMitadDia, getTipos, postTipo, patchTipo,
  // Cuotas y saldos
  postCuota, getCuotas, deleteCuota, getSaldoPorTipo, getSaldoMe,
  // Ausencias
  listAus, detailAus, createAus, meCreateAus, approveAus, rejectAus, cancelAus, updateAus,
  // Solicitudes de asignación
  createAsignacionSolicitud, listAsignacionSolicitud, approveAsignacionSolicitud, denyAsignacionSolicitud, cancelAsignacionSolicitud,
  postUpload, getCounts
} from './controllers/ausencias.controller.js';
import { uploadSingle, multerErrorHandler } from '../../infra/uploads/multer.js';

const router = Router();

router.get('/health', health);

// ===== Catálogos
router.get('/catalog/unidades', requireAuth, requirePermission('ausencias', 'read'), getUnidades);
router.get('/catalog/estados', requireAuth, requirePermission('ausencias', 'read'), getEstados);
router.get('/catalog/mitad-dia', requireAuth, requirePermission('ausencias', 'read'), getMitadDia);
router.get('/tipos', requireAuth, requirePermission('ausencias', 'read'), getTipos);
router.post('/tipos', requireAuth, requirePermission('ausencias', 'create'), postTipo);   // Admin/RRHH
router.patch('/tipos/:id', requireAuth, requirePermission('ausencias', 'update'), patchTipo);  // Admin/RRHH

// ===== Cuotas y saldos
router.post('/cuotas', requireAuth, requirePermission('rrhh', 'manage'), postCuota);  // RRHH / Admin
router.get('/cuotas', requireAuth, requirePermission('ausencias', 'read'), getCuotas);
router.delete('/cuotas/:id', requireAuth, requirePermission('rrhh', 'manage'), deleteCuota);
router.get('/saldos', requireAuth, requirePermission('ausencias', 'read'), getSaldoPorTipo);
router.get('/me/saldos', requireAuth, requirePermission('ausencias', 'read'), getSaldoMe);

// ===== Ausencias
router.get('/', requireAuth, requirePermission('ausencias', 'read'), listAus);
router.get('/counts', requireAuth, requirePermission('ausencias', 'read'), getCounts);

// ===== Solicitudes de Asignación (cupo extra)
router.post('/asignacion/solicitudes', requireAuth, requirePermission('ausencias', 'create'), createAsignacionSolicitud);
router.get('/asignacion/solicitudes', requireAuth, requirePermission('ausencias', 'read'), listAsignacionSolicitud);
router.post('/asignacion/solicitudes/:id/approve', requireAuth, requirePermission('ausencias', 'approve'), approveAsignacionSolicitud);
router.post('/asignacion/solicitudes/:id/deny', requireAuth, requirePermission('ausencias', 'approve'), denyAsignacionSolicitud);
router.post('/asignacion/solicitudes/:id/cancel', requireAuth, requirePermission('ausencias', 'update'), cancelAsignacionSolicitud);

router.get('/:id', requireAuth, requirePermission('ausencias', 'read'), detailAus);
router.post('/', requireAuth, requirePermission('ausencias', 'create'), createAus);      // crear de cualquiera (si tiene permiso)
router.post('/me', requireAuth, requirePermission('ausencias', 'create'), meCreateAus);    // crear propia
router.post('/:id/approve', requireAuth, requirePermission('ausencias', 'approve'), approveAus);
router.post('/:id/reject', requireAuth, requirePermission('ausencias', 'approve'), rejectAus);
router.post('/:id/cancel', requireAuth, requirePermission('ausencias', 'update'), cancelAus);
router.patch('/:id', requireAuth, requirePermission('ausencias', 'update'), updateAus);

// ===== Adjuntos
router.post('/upload', requireAuth, uploadSingle, postUpload, multerErrorHandler);

export default router;
