// /backend/src/modules/notificaciones/controllers/notificaciones.controller.js

import { initModels } from '../../../models/registry.js';
import {
  inboxQuerySchema, notifIdParam, toggleBoolSchema, setPinSchema,
  setPreferencesSchema, createNotificationSchema
} from '../validators.js';
import {
  svcCatalogos, svcVentanasCount, svcInbox, svcChatCanales,
  svcPreferences, svcSetPreferences, svcCreate,
  svcMarkSeen, svcMarkRead, svcDismiss, svcArchive, svcPin,
  svcCleanupOrphans, svcMarkAllRead
} from '../services/notificaciones.service.js';
import { markEnvioOpenedByToken } from '../repositories/notificaciones.repo.js';

await initModels();

export const health = (_req, res) => res.json({ module: 'notificaciones', ok: true });

// Catálogos
export const getCatalog = async (_req, res, next) => {
  try { res.json(await svcCatalogos()); } catch (e) { next(e); }
};

// Contadores por ventana
// ⚠️ Respeta el endpoint actual (ej: GET /notificaciones/windows/counts)
export const getVentanasCount = async (req, res, next) => {
  try { res.json(await svcVentanasCount(req.user)); } catch (e) { next(e); }
};

// Inbox por ventana
export const getInbox = async (req, res, next) => {
  try {
    const q = inboxQuerySchema.parse(req.query);
    res.json(await svcInbox(q, req.user));
  } catch (e) { next(e); }
};

// Canales de chat
export const getChatCanales = async (req, res, next) => {
  try { res.json(await svcChatCanales(req.user)); } catch (e) { next(e); }
};

// Preferencias
export const getPrefs = async (req, res, next) => {
  try { res.json(await svcPreferences(req.user)); } catch (e) { next(e); }
};

export const putPrefs = async (req, res, next) => {
  try {
    const body = setPreferencesSchema.parse(req.body);
    res.json(await svcSetPreferences(body, req.user));
  } catch (e) { next(e); }
};

// Crear notificación
export const postNotification = async (req, res, next) => {
  try {
    const body = createNotificationSchema.parse(req.body);
    const created = await svcCreate(body, req.user);
    res.status(201).json(created);
  } catch (e) { next(e); }
};

// Marcas
export const patchSeen = async (req, res, next) => {
  try {
    const { id } = notifIdParam.parse(req.params);
    res.json(await svcMarkSeen(id, req.user));
  } catch (e) { next(e); }
};

export const patchRead = async (req, res, next) => {
  try {
    const { id } = notifIdParam.parse(req.params);
    const { on } = toggleBoolSchema.parse(req.body);
    res.json(await svcMarkRead(id, on, req.user));
  } catch (e) { next(e); }
};

export const patchDismiss = async (req, res, next) => {
  try {
    const { id } = notifIdParam.parse(req.params);
    const { on } = toggleBoolSchema.parse(req.body);
    res.json(await svcDismiss(id, on, req.user));
  } catch (e) { next(e); }
};

export const patchArchive = async (req, res, next) => {
  try {
    const { id } = notifIdParam.parse(req.params);
    const { on } = toggleBoolSchema.parse(req.body);
    res.json(await svcArchive(id, on, req.user));
  } catch (e) { next(e); }
};

export const patchPin = async (req, res, next) => {
  try {
    const { id } = notifIdParam.parse(req.params);
    const { orden } = setPinSchema.parse(req.body);
    res.json(await svcPin(id, orden, req.user));
  } catch (e) { next(e); }
};

// Tracking pixel (abre imagen 1x1 y marca abierto)
export const getTrackOpen = async (req, res, _next) => {
  try {
    const { token } = req.params;
    await markEnvioOpenedByToken(token);
    const gif1x1 = Buffer.from(
      'R0lGODlhAQABAIAAAP///////yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(gif1x1);
  } catch {
    // No exponemos si el token existe o no
    res.status(200).end();
  }
};

// ========== Admin: Limpieza ==========

/**
 * POST /admin/cleanup-orphans
 * Body: { user_id?: number } - si no se pasa, limpia para todos
 * Limpia notificaciones huérfanas (tareas/canales/eventos eliminados)
 */
export const postCleanupOrphans = async (req, res, next) => {
  try {
    const userId = req.body?.user_id || null;
    const result = await svcCleanupOrphans(userId);
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
};

/**
 * POST /admin/mark-all-read
 * Body: { user_id: number, buzon?: 'chat'|'tareas'|'calendario' }
 * Marca todas las notificaciones de un usuario como leídas
 */
export const postMarkAllRead = async (req, res, next) => {
  try {
    const { user_id, buzon } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id es requerido' });
    }
    const result = await svcMarkAllRead(user_id, buzon || null);
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
};
/**
 * PATCH /notificaciones/mark-all-read
 * Body: { buzon?: 'chat'|'tareas'|'calendario' }
 * Marca todas las notificaciones del usuario actual como leídas
 */
export const patchMarkAllReadMe = async (req, res, next) => {
  try {
    const { buzon, action = 'read' } = req.body;
    const result = await svcMarkAllRead(req.user.id, buzon || null, action);
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
};
