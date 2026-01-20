// backend/src/modules/comercial/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';
import * as leadCtrl from './controllers/lead.controller.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Catalogs
router.get('/catalogs', requireAuth, requirePermission('comercial', 'read'), leadCtrl.getCatalogs);

// Leads CRUD
router.get('/leads', requireAuth, requirePermission('comercial', 'read'), leadCtrl.listLeads);
router.get('/leads/:id', requireAuth, requirePermission('comercial', 'read'), leadCtrl.getLead);
router.post('/leads', requireAuth, requirePermission('comercial', 'create'), leadCtrl.createLead);
router.patch('/leads/:id', requireAuth, requirePermission('comercial', 'update'), leadCtrl.updateLead);

// Interactions
router.post('/leads/:id/notes', requireAuth, requirePermission('comercial', 'update'), upload.array('files'), leadCtrl.addNota);

// Negotiation
router.post('/leads/:id/win', requireAuth, requirePermission('comercial', 'update'), leadCtrl.winNegotiation);
router.post('/leads/:id/lose', requireAuth, requirePermission('comercial', 'update'), leadCtrl.loseNegotiation);

// Onboarding
router.post('/leads/:id/resolve-onboarding', requireAuth, requirePermission('comercial', 'update'), leadCtrl.resolveOnboarding);

// Import
router.post('/import', requireAuth, requirePermission('comercial', 'create'), upload.single('file'), leadCtrl.importLeads);

export default router;
