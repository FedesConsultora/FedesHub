// backend/src/modules/comercial/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';
import * as leadCtrl from './controllers/lead.controller.js';
import * as adminCtrl from './controllers/admin_comercial.controller.js';
import * as statsController from './controllers/stats.controller.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Catalogs
router.get('/catalogs', requireAuth, requirePermission('comercial', 'read'), leadCtrl.getCatalogs);
router.get('/stats', requireAuth, statsController.getDashboardStats);
router.get('/stats/eecc/:id', requireAuth, statsController.getEeccStats);

// Leads CRUD
router.get('/leads', requireAuth, requirePermission('comercial', 'read'), leadCtrl.listLeads);
router.get('/leads/trash', requireAuth, requirePermission('comercial', 'admin'), leadCtrl.listTrash);
router.get('/leads/onboarding', requireAuth, requirePermission('comercial', 'read'), leadCtrl.listOnboarding);
router.get('/leads/:id', requireAuth, requirePermission('comercial', 'read'), leadCtrl.getLead);
router.post('/leads', requireAuth, requirePermission('comercial', 'create'), leadCtrl.createLead);
router.patch('/leads/:id', requireAuth, requirePermission('comercial', 'update'), leadCtrl.updateLead);
router.delete('/leads/:id', requireAuth, requirePermission('comercial', 'admin'), leadCtrl.deleteLead);
router.post('/leads/:id/restore', requireAuth, requirePermission('comercial', 'admin'), leadCtrl.restoreLead);

// Interactions
router.post('/leads/:id/notes', requireAuth, requirePermission('comercial', 'update'), upload.array('files'), leadCtrl.addNota);

// Negotiation
router.post('/leads/:id/win', requireAuth, requirePermission('comercial', 'update'), leadCtrl.winNegotiation);
router.post('/leads/:id/lose', requireAuth, requirePermission('comercial', 'update'), leadCtrl.loseNegotiation);

// Onboarding
router.post('/leads/:id/resolve-onboarding', requireAuth, requirePermission('comercial', 'update'), leadCtrl.resolveOnboarding);

// Import
router.post('/import', requireAuth, requirePermission('comercial', 'create'), upload.single('file'), leadCtrl.importLeads);

// --- Admin Comercial ---

// EECC
router.get('/admin/eecc', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.listEECC);
router.post('/admin/eecc', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.createEECC);
router.patch('/admin/eecc/:id', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.updateEECC);
router.delete('/admin/eecc/:id', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.deleteEECC);

// Products
router.get('/admin/products', requireAuth, requirePermission('comercial', 'read'), adminCtrl.listProductos);
router.post('/admin/products', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.createProducto);
router.patch('/admin/products/:id', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.updateProducto);
router.delete('/admin/products/:id', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.deleteProducto);

// Discounts
router.get('/admin/discounts', requireAuth, requirePermission('comercial', 'read'), adminCtrl.listDescuentos);
router.post('/admin/discounts', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.createDescuento);
router.patch('/admin/discounts/:id', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.updateDescuento);
router.delete('/admin/discounts/:id', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.deleteDescuento);

// Objectives
router.get('/admin/objectives/:eecc_id', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.listObjetivos);
router.post('/admin/objectives/q', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.upsertObjetivoQ);
router.post('/admin/objectives/mes', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.upsertObjetivoMes);
router.post('/admin/objectives/cap', requireAuth, requirePermission('comercial', 'admin'), adminCtrl.upsertDescuentoCap);

export default router;
