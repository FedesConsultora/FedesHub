import { Router } from 'express';
import {
    getGastos,
    getGastoById,
    createGasto,
    updateGasto,
    deleteGasto,
    updateStatus,
    getSummary
} from './controllers/GastosController.js';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { uploadFiles, multerErrorHandler } from '../../infra/uploads/multer.js';

const router = Router();

router.use(requireAuth);

router.get('/', getGastos);
router.get('/summary', getSummary);
router.get('/:id', getGastoById);
router.post('/', uploadFiles, createGasto, multerErrorHandler);
router.put('/:id', updateGasto);
router.delete('/:id', deleteGasto);
router.patch('/:id/status', updateStatus);

export default router;
