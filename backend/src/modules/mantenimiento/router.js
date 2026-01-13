// backend/src/modules/mantenimiento/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';
import multer from 'multer';
import {
    exportClientes,
    importClientes,
    exportTareas,
    importTareas
} from './controllers/mantenimiento.controller.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Todas las rutas requieren autenticación y permiso de 'auth.assign' (equivalente a Admin)
// O podrías crear uno específico como 'sistema.admin'
router.get('/export/clientes', requireAuth, requirePermission('auth', 'assign'), exportClientes);
router.post('/import/clientes', requireAuth, requirePermission('auth', 'assign'), upload.single('file'), importClientes);

router.get('/export/tareas', requireAuth, requirePermission('auth', 'assign'), exportTareas);
router.post('/import/tareas', requireAuth, requirePermission('auth', 'assign'), upload.single('file'), importTareas);

export default router;
