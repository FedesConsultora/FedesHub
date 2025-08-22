// backend/src/modules/asistencia/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health,
  // catálogos
  getOrigenes, getCierreMotivos,
  // list/detail
  list, detail, getOpen, meList,
  // acciones
  postCheckIn, patchCheckOut, patchAdjust, postForceClose, postToggle,
  // me
  meOpen, meToggle, meCheckIn, meCheckOut,
  // reportes
  resumenPeriodo
} from './controllers/asistencia.controller.js';

const router = Router();

// Health
router.get('/health', health);

// Catálogos
router.get('/catalog/origenes',        requireAuth, requirePermission('asistencia','read'),    getOrigenes);
router.get('/catalog/cierre-motivos',  requireAuth, requirePermission('asistencia','read'),    getCierreMotivos);

// Histórico global (requiere permiso de reportes)
router.get('/registros',               requireAuth, requirePermission('asistencia','report'),  list);
// Histórico propio
router.get('/me/registros',            requireAuth, requirePermission('asistencia','read'),    meList);

// Detalle
router.get('/registros/:id',           requireAuth, requirePermission('asistencia','read'),    detail);

// Abierto por feder
router.get('/open',                    requireAuth, requirePermission('asistencia','read'),    getOpen);

// Acciones estándar
router.post('/check-in',               requireAuth, requirePermission('asistencia','checkin'), postCheckIn);
router.patch('/registros/:id/check-out', requireAuth, requirePermission('asistencia','checkout'), patchCheckOut);
router.patch('/registros/:id',         requireAuth, requirePermission('asistencia','adjust'),  patchAdjust);
router.post('/feder/:federId/force-close', requireAuth, requirePermission('asistencia','close'), postForceClose);

// Toggle (check-in/out con un botón)
router.post('/toggle',                 requireAuth, requirePermission('asistencia','checkin'), postToggle);

// Flujos “me”
router.get('/me/open',                 requireAuth, requirePermission('asistencia','read'),    meOpen);
router.post('/me/toggle',              requireAuth, requirePermission('asistencia','checkin'), meToggle);
router.post('/me/check-in',            requireAuth, requirePermission('asistencia','checkin'), meCheckIn);
router.post('/me/check-out',           requireAuth, requirePermission('asistencia','checkout'), meCheckOut);

// Reportes (requiere report)
router.get('/resumen/periodo',         requireAuth, requirePermission('asistencia','report'),  resumenPeriodo);

export default router;
