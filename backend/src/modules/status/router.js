// backend/src/modules/status/router.js
import { Router } from 'express';
import * as controller from './controllers/status.controller.js';
import { requireAuth } from '../auth/middlewares/requireAuth.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

router.get('/custom', controller.getMyCustomStatuses);
router.post('/custom', controller.addCustomStatus);
router.put('/custom/:id', controller.editCustomStatus);
router.delete('/custom/:id', controller.removeCustomStatus);

router.post('/current', controller.setCurrentStatus);
router.get('/feder/:feder_id', controller.getFederStatus);

export default router;
