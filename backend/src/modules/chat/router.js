// /backend/src/modules/chat/router.js
import { Router } from 'express';

// Middlewares
import * as authMw from '../auth/middlewares/requireAuth.js';
import * as permMw from '../auth/middlewares/requirePermission.js';
const requireAuth = (authMw?.default ?? authMw?.requireAuth ?? authMw);
const requirePermissionFactory = (permMw?.default ?? permMw?.requirePermission ?? permMw);
const requirePermission = (mod, act) => requirePermissionFactory(mod, act);

// Controllers
import * as chat from './controllers/chat.controller.js';
import { ping } from './controllers/health.controller.js';

const router = Router();

/**
 * Este router se monta en /api/chat en tu agregador.
 * No prefijes con /chat dentro de este archivo.
 */

// Health
router.get('/health', ping);

// Catálogos
router.get('/catalog', requireAuth, requirePermission('chat','read'), chat.getCatalog);

// Canales
router.get('/channels',        requireAuth, requirePermission('chat','read'),   chat.getCanales);
router.post('/channels',       requireAuth, requirePermission('chat','create'), chat.postCanal);
router.put('/channels/:id',    requireAuth, requirePermission('chat','update'), chat.putCanal);
router.patch('/channels/:id/archive',  requireAuth, requirePermission('chat','update'), chat.patchArchiveCanal);
router.patch('/channels/:id/settings', requireAuth, requirePermission('chat','update'), chat.patchCanalSettings);

// Miembros
router.get('/channels/:id/members',             requireAuth, requirePermission('chat','read'),   chat.getMiembros);
router.post('/channels/:id/members',            requireAuth, requirePermission('chat','update'), chat.postMiembro);
router.patch('/channels/:id/members/:user_id',  requireAuth, requirePermission('chat','update'), chat.patchMiembro);
router.delete('/channels/:id/members/:user_id', requireAuth, requirePermission('chat','update'), chat.deleteMiembro);
router.post('/channels/:id/join',               requireAuth, requirePermission('chat','update'), chat.postJoin);
router.post('/channels/:id/leave',              requireAuth, requirePermission('chat','update'), chat.postLeave);

// Mensajes (timeline del canal)
router.get('/channels/:id/messages', requireAuth, requirePermission('chat','read'),   chat.getMessages);
router.post('/channels/:id/messages',requireAuth, requirePermission('chat','create'), chat.postMessage);

// Mensaje by id
router.put('/messages/:id',          requireAuth, requirePermission('chat','update'), chat.putMessage);
router.delete('/messages/:id',       requireAuth, requirePermission('chat','delete'), chat.deleteMessage);

// Reacciones / Pin / Guardado / Follow hilo / Read
router.post('/messages/:id/react',   requireAuth, requirePermission('chat','update'), chat.postReact);
router.post('/messages/:id/pin',     requireAuth, requirePermission('chat','update'), chat.postPin);
router.post('/messages/:id/save',    requireAuth, requirePermission('chat','update'), chat.postSave);
router.post('/threads/:root_id/follow', requireAuth, requirePermission('chat','update'), chat.postFollowThread);
router.post('/channels/:id/read',    requireAuth, requirePermission('chat','update'), chat.postRead);

// Presencia / Typing
router.post('/presence',             requireAuth, requirePermission('chat','update'), chat.postPresence);
router.post('/channels/:id/typing',  requireAuth, requirePermission('chat','read'),   chat.postTyping);

// Invitaciones
router.post('/channels/:id/invitations', requireAuth, requirePermission('chat','update'), chat.postInvitation);
router.post('/invitations/:token/accept', requireAuth, requirePermission('chat','update'), chat.postAcceptInvitation);
router.post('/invitations/:token/decline', requireAuth, requirePermission('chat','update'), chat.postDeclineInvitation);

// Meetings desde el canal
router.post('/channels/:id/meetings', requireAuth, requirePermission('chat','create'), chat.postMeeting);

export default router;
