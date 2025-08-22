// backend/src/modules/clientes/router.js
// ───────────────────────────────────────────────────────────────────────────────
// Rutas de Clientes (protección RBAC por módulo/acción)
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health, list, detail, create, update, del, assignCelula,
  listContactosCtrl, createContactoCtrl, updateContactoCtrl, deleteContactoCtrl,
  resumenEstado, resumenPonderacion, resumenCelula
} from './controllers/clientes.controller.js';

const router = Router();

router.get('/health', health);

// CRUD Clientes
router.get('/clientes',            requireAuth, requirePermission('clientes','read'),   list);
router.get('/clientes/:id',        requireAuth, requirePermission('clientes','read'),   detail);
router.post('/clientes',           requireAuth, requirePermission('clientes','create'), create);
router.patch('/clientes/:id',      requireAuth, requirePermission('clientes','update'), update);
router.delete('/clientes/:id',     requireAuth, requirePermission('clientes','delete'), del);

// Asignación de célula responsable
router.patch('/clientes/:id/assign-celula', requireAuth, requirePermission('clientes','update'), assignCelula);

// Contactos (subrecurso)
router.get('/clientes/:id/contactos',                      requireAuth, requirePermission('clientes','read'),   listContactosCtrl);
router.post('/clientes/:id/contactos',                     requireAuth, requirePermission('clientes','update'), createContactoCtrl);
router.patch('/clientes/:id/contactos/:contactoId',        requireAuth, requirePermission('clientes','update'), updateContactoCtrl);
router.delete('/clientes/:id/contactos/:contactoId',       requireAuth, requirePermission('clientes','update'), deleteContactoCtrl);

// Resúmenes para tablero/kanban/lista
router.get('/clientes/resumen/estado',        requireAuth, requirePermission('clientes','read'),   resumenEstado);
router.get('/clientes/resumen/ponderacion',   requireAuth, requirePermission('clientes','read'),   resumenPonderacion);
router.get('/clientes/resumen/celula',        requireAuth, requirePermission('clientes','read'),   resumenCelula);

export default router;
