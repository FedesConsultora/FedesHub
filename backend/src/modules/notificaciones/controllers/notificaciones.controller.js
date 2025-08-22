import { initModels } from '../../../models/registry.js';
import {
  inboxQuerySchema, notifIdParam, toggleBoolSchema, setPinSchema,
  setPreferencesSchema, createNotificationSchema
} from '../validators.js';
import {
  svcCatalogos, svcVentanasCount, svcInbox, svcChatCanales,
  svcPreferences, svcSetPreferences, svcCreate,
  svcMarkSeen, svcMarkRead, svcDismiss, svcArchive, svcPin
} from '../services/notificaciones.service.js';
import { markEnvioOpenedByToken } from '../repositories/notificaciones.repo.js';

await initModels(); // asegura modelos cargados

export const health = (_req, res) => res.json({ module: 'notificaciones', ok: true });

// Catálogos
export const getCatalog = async (_req, res, next) => {
  try { res.json(await svcCatalogos()); } catch (e) { next(e); }
};

// Contadores por ventana
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

// Canales de chat (proxy de membresía por actividad)
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

// Crear notificación (manual o desde otro módulo)
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
    res.setHeader('Content-Type','image/gif');
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Expires','0');
    res.send(gif1x1);
  } catch {
    res.status(200).end(); // no filtrar tokens inexistentes
  }
};