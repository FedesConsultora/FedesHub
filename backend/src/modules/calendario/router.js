import { Router } from 'express';

// Middlewares (soporte default y named exports)
import * as authMw from '../auth/middlewares/requireAuth.js';
import * as permMw from '../auth/middlewares/requirePermission.js';
const requireAuth = (authMw?.default ?? authMw?.requireAuth ?? authMw);
const requirePermissionFactory = (permMw?.default ?? permMw?.requirePermission ?? permMw);
const requirePermission = (mod, act) => requirePermissionFactory(mod, act);

// Controllers
import * as cal from './controllers/calendario.controller.js';
import * as gcal from './controllers/google.controller.js';
import { ping } from './controllers/health.controller.js';

const router = Router();

// Health
router.get('/health', ping);

// Catálogos
router.get('/catalog', requireAuth, requirePermission('calendario', 'read'), cal.getCatalog);

// Calendarios
router.get('/calendars', requireAuth, requirePermission('calendario', 'read'), cal.getCalendars);
router.post('/calendars', requireAuth, requirePermission('calendario', 'create'), cal.postCalendar);
router.put('/calendars/:id', requireAuth, requirePermission('calendario', 'update'), cal.putCalendar);

// Eventos
router.get('/events', requireAuth, requirePermission('calendario', 'read'), cal.getEvents);
router.post('/events', requireAuth, requirePermission('calendario', 'create'), cal.postEvent);
router.put('/events/:id', requireAuth, requirePermission('calendario', 'update'), cal.putEvent);
router.delete('/events/:id', requireAuth, requirePermission('calendario', 'delete'), cal.deleteEvent);

// RSVP (asistente autenticado)
router.post('/events/:id/rsvp', requireAuth, requirePermission('calendario', 'update'), cal.postMyRsvp);

// Google: listado remoto, link, sync, watch, webhook
router.get('/google/calendars', requireAuth, requirePermission('calendario', 'read'), gcal.listRemoteCalendars);
router.post('/google/link', requireAuth, requirePermission('calendario', 'update'), gcal.linkCalendar);
router.post('/google/sync', requireAuth, requirePermission('calendario', 'update'), gcal.syncOne);
router.post('/google/watch/:id/start', requireAuth, requirePermission('calendario', 'update'), gcal.startWatch);
router.post('/google/watch/stop', requireAuth, requirePermission('calendario', 'update'), gcal.stopWatch);
router.get('/google/connect', requireAuth, requirePermission('calendario', 'update'), gcal.connectStart);
router.get('/google/callback', requireAuth, gcal.connectCallback);

// Webhook público de Google (sin auth)
router.post('/google/webhook', gcal.webhook);

// Feriados (vía ArgentinaDatos)
router.get('/feriados/:year', requireAuth, cal.getFeriados);

export default router;
