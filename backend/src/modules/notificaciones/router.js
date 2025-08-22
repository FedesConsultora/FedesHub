import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

// Controllers
import * as push from './controllers/push.controller.js';
import {
  getCatalog, getVentanasCount, getInbox, getChatCanales,
  getPrefs, putPrefs,
  postNotification,
  patchSeen, patchRead, patchDismiss, patchArchive, patchPin,
  getTrackOpen
} from './controllers/notificaciones.controller.js';
import { smtp, push as pushHealth } from './controllers/health.controller.js';

const router = Router();

/**
 * IMPORTANTE:
 * Este router se monta en /api/notificaciones (por tu agregador).
 * Por eso, las rutas internas NO deben empezar con /notificaciones/...
 * Ej: GET /api/notificaciones/health/push
 */

// Health
router.get('/health/smtp', smtp);
router.get('/health/push', pushHealth);

// Catálogos
router.get('/catalog', requireAuth, requirePermission('notificaciones','read'), getCatalog);

// Ventanas (Chats / Tareas / Notificaciones / Calendario)
router.get('/windows/counts', requireAuth, requirePermission('notificaciones','read'), getVentanasCount);
router.get('/inbox',          requireAuth, requirePermission('notificaciones','read'), getInbox);
router.get('/chat/canales',   requireAuth, requirePermission('notificaciones','read'), getChatCanales);

// Preferencias de usuario
router.get('/preferences',    requireAuth, requirePermission('notificaciones','read'),   getPrefs);
router.put('/preferences',    requireAuth, requirePermission('notificaciones','update'), putPrefs);

// Crear notificación manual / desde otro módulo
router.post('/',              requireAuth, requirePermission('notificaciones','create'), postNotification);

// Marcas por usuario-destino
router.patch('/:id/seen',     requireAuth, requirePermission('notificaciones','update'), patchSeen);
router.patch('/:id/read',     requireAuth, requirePermission('notificaciones','update'), patchRead);
router.patch('/:id/dismiss',  requireAuth, requirePermission('notificaciones','update'), patchDismiss);
router.patch('/:id/archive',  requireAuth, requirePermission('notificaciones','update'), patchArchive);
router.patch('/:id/pin',      requireAuth, requirePermission('notificaciones','update'), patchPin);

// Tracking pixel (público, no requiere auth)
router.get('/email/open/:token.gif', getTrackOpen);

// Push tokens (sólo requiere estar logueado)
router.post('/push/tokens',   requireAuth, push.registerToken);
router.delete('/push/tokens', requireAuth, push.unregisterToken);


export default router;
