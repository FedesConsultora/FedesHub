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
router.get('/catalog', requireAuth, getCatalog);

// Ventanas (Chats / Tareas / Notificaciones / Calendario)
router.get('/windows/counts', requireAuth, getVentanasCount);
router.get('/inbox',          requireAuth, getInbox);
router.get('/chat/canales',   requireAuth, getChatCanales);

// Preferencias de usuario
router.get('/preferences',    requireAuth,   getPrefs);
router.put('/preferences',    requireAuth, requirePermission('notificaciones','update'), putPrefs);

// Crear notificación manual / desde otro módulo
router.post('/',              requireAuth, requirePermission('notificaciones','create'), postNotification);

// Marcas por usuario-destino
router.patch('/:id/seen',     requireAuth,  patchSeen);
router.patch('/:id/read',     requireAuth,  patchRead);
router.patch('/:id/dismiss',  requireAuth,  patchDismiss);
router.patch('/:id/archive',  requireAuth,  patchArchive);
router.patch('/:id/pin',      requireAuth,  patchPin);

// Tracking pixel (público, no requiere auth)
router.get('/email/open/:token.gif', getTrackOpen);

// Push tokens (sólo requiere estar logueado)
router.post('/push/tokens',   requireAuth, push.registerToken);
router.delete('/push/tokens', requireAuth, push.unregisterToken);

import { z } from 'zod';

export const inboxQuerySchema = z.object({
  buzon: z.enum(['chat','tareas','calendario']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().max(200).optional(),
  only_unread: z.coerce.boolean().optional(),
  include_archived: z.coerce.boolean().optional(),
  include_dismissed: z.coerce.boolean().optional(),
  sort: z.enum(['newest','oldest','importance']).default('newest'),
  chat_canal_id: z.coerce.number().int().optional(),
  tarea_id: z.coerce.number().int().optional(),
  evento_id: z.coerce.number().int().optional(),
  importancia_id: z.coerce.number().int().optional(),
  tipo_codigo: z.string().trim().optional(),
  hilo_key: z.string().trim().optional()
});

export const notifIdParam = z.object({ id: z.coerce.number().int().positive() });

export const toggleBoolSchema = z.object({ on: z.boolean() });

export const setPinSchema = z.object({ orden: z.number().int().nullable().optional() });

export const setPreferencesSchema = z.object({
  items: z.array(z.object({
    tipo_id: z.number().int().positive(),
    canal_id: z.number().int().positive(),
    is_habilitado: z.boolean()
  })).min(1)
});

export const createNotificationSchema = z.object({
  tipo_id: z.number().int().positive().optional(),
  tipo_codigo: z.string().trim().optional(),
  importancia_id: z.number().int().optional(),
  titulo: z.string().trim().max(200).optional(),
  mensaje: z.string().trim().optional(),
  data: z.record(z.any()).optional(),
  link_url: z.string().url().optional(),
  hilo_key: z.string().trim().optional(),
  tarea_id: z.number().int().optional(),
  ausencia_id: z.number().int().optional(),
  asistencia_registro_id: z.number().int().optional(),
  evento_id: z.number().int().optional(),
  chat_canal_id: z.number().int().optional(),
  programada_at: z.coerce.date().optional(),
  destinos: z.array(z.object({
    user_id: z.number().int().positive(),
    feder_id: z.number().int().optional()
  })).min(1)
}).refine(v => v.tipo_id || v.tipo_codigo, { message: 'tipo_id o tipo_codigo requerido' });

export default router;

// /backend/src/modules/notificaciones/controllers/notificaciones.controller.js

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
// /backend/src/modules/notificaciones/controllers/push.controller.js

import { z } from 'zod';
import { initModels } from '../../../models/registry.js';
import { sequelize } from '../../../core/db.js';

const m = await initModels();

const bodySchema = z.object({
  token: z.string().min(10),
  plataforma: z.string().trim().max(30).optional(), // aceptamos libre (no rompo front)
  device_info: z.string().trim().max(255).optional()
});

async function _proveedorIdByCodigo(codigo, t) {
  const row = await m.ProveedorTipo.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
}

// POST /push/tokens
export async function registerToken(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { token, plataforma, device_info } = bodySchema.parse(req.body);

    const proveedor_id =
      (await _proveedorIdByCodigo(process.env.PUSH_PROVIDER || 'fcm', t)) ??
      (await _proveedorIdByCodigo('fcm', t));

    if (!proveedor_id) {
      const err = new Error('Proveedor push no configurado');
      err.status = 500;
      throw err;
    }

    const normPlatform = plataforma?.toLowerCase()?.slice(0, 30) ?? null;

    // Idempotente y "re-claim" del token (si existía para otro user)
    const [row, created] = await m.PushToken.findOrCreate({
      where: { token },
      defaults: {
        user_id: req.user.id,
        proveedor_id,
        plataforma: normPlatform,
        device_info: device_info || null,
        is_revocado: false,
        last_seen_at: new Date()
      },
      transaction: t
    });

    if (!created) {
      // Reasigno y refresco last_seen_at, "des-revoco"
      await row.update({
        user_id: req.user.id,
        proveedor_id,
        plataforma: normPlatform ?? row.plataforma,
        device_info: device_info ?? row.device_info,
        is_revocado: false,
        last_seen_at: new Date()
      }, { transaction: t });
    }

    await t.commit();
    return res.status(created ? 201 : 200).json({ ok: true, id: row.id, created });
  } catch (e) {
    await t.rollback();
    return next(e);
  }
}

// DELETE /push/tokens
export async function unregisterToken(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { token } = bodySchema.pick({ token: true }).parse(req.body);

    const row = await m.PushToken.findOne({
      where: { token, user_id: req.user.id },
      transaction: t
    });

    if (!row) {
      await t.commit();
      return res.status(204).end();
    }

    await row.update({ is_revocado: true, last_seen_at: new Date() }, { transaction: t });
    await t.commit();
    return res.status(200).json({ ok: true });
  } catch (e) {
    await t.rollback();
    return next(e);
  }
}
// /backend/src/modules/notificaciones/services/email.service.js
import { initModels } from '../../../models/registry.js';
import { sendMail } from './mailer.js';
import { templates } from './emailTemplates.js';
import {
  queueEmailEnvio, markEnvioSent
} from '../repositories/notificaciones.repo.js';

const m = await initModels();

const getCanalId = async (codigo, t) => {
  const row = await m.CanalTipo.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
};
const getProveedorId = async (codigo, t) => {
  const row = await m.ProveedorTipo.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
};

export const renderEmail = async ({ tipo_id, idioma='es', payload={}, link_url }, t) => {
  // 1) Plantilla en DB
  const canal = await getCanalId('email', t);
  const row = await m.NotificacionPlantilla.findOne({
    where: { tipo_id, canal_id: canal, idioma },
    transaction: t
  });
  if (row?.cuerpo_tpl) {
    const asunto = row.asunto_tpl || 'Notificación';
    const render = (tpl, data) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(data?.[k] ?? ''));
    const html = render(row.cuerpo_tpl, { ...payload, link: link_url });
    return { subject: asunto, html };
  }

  // 2) Fallback por código
  const tipo = await m.NotificacionTipo.findByPk(tipo_id, { transaction: t });
  const code = tipo?.codigo;
  let subject = tipo?.nombre || 'Notificación';
  let html;

  switch (code) {
    /* Cuenta */
    case 'reset_password':
      subject = 'Recuperación de contraseña';
      html = templates.resetPassword({ link: link_url, ...(payload || {}) });
      break;

    /* Tareas */
    case 'tarea_asignada':
      subject = 'Nueva tarea asignada';
      html = templates.tarea_asignada(payload);
      break;
    case 'tarea_comentario':
      subject = 'Nuevo comentario en tu tarea';
      html = templates.tarea_comentario(payload);
      break;
    case 'tarea_vencimiento':
      subject = 'Tu tarea está por vencer';
      html = templates.tarea_vencimiento(payload);
      break;

    /* Chat */
    case 'chat_mencion':
      subject = 'Te mencionaron en un chat';
      html = templates.chat_mencion(payload);
      break;

    /* Calendario */
    case 'evento_invitacion':
      subject = `Invitación: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_invitacion(payload);
      break;
    case 'evento_actualizado':
      subject = `Actualizado: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_actualizado(payload);
      break;
    case 'evento_cancelado':
      subject = `Cancelado: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_cancelado(payload);
      break;
    case 'evento_removido':
      subject = `Actualización de participación: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_removido(payload);
      break;
    case 'evento_nuevo':
      subject = `Nuevo evento: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_nuevo(payload);
      break;
    case 'evento_recordatorio':
    case 'recordatorio':
      subject = `Recordatorio: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_recordatorio(payload);
      break;
    case 'evento_rsvp':
      subject = `RSVP: ${payload?.evento?.titulo || ''} → ${payload?.rsvp || ''}`;
      html = templates.evento_rsvp(payload);
      break;

    default:
      subject = subject || 'FedesHub';
      html = templates.confirmEmail({ name: payload?.name || 'Fede', link: link_url || '#' });
  }
  return { subject, html };
};

export const sendNotificationEmails = async (notificacion_id, t) => {
  const notif = await m.Notificacion.findByPk(notificacion_id, {
    include: [
      { model: m.NotificacionTipo, as: 'tipo' },
      { model: m.ImportanciaTipo, as: 'importancia' },
      { model: m.Tarea, as: 'tarea', include: [{ model: m.Cliente, as: 'cliente' }] },
      { model: m.Evento, as: 'evento' },
      { model: m.ChatCanal, as: 'chatCanal', attributes: ['id','nombre','slug'] },
      { model: m.NotificacionDestino, as: 'destinos', include: [{ model: m.User, as: 'user' }] }
    ],
    transaction: t
  });
  if (!notif) return 0;

  const canalId = await getCanalId('email', t);
  const proveedorId = await getProveedorId('gmail_smtp', t);

  const defaults = Array.isArray(notif.tipo?.canales_default_json) ? notif.tipo.canales_default_json : [];
  const emailDefaultOn = defaults.includes('email');

  let sent = 0;
  for (const d of notif.destinos) {
    const pref = await m.NotificacionPreferencia.findOne({
      where: { user_id: d.user_id, tipo_id: notif.tipo_id, canal_id: canalId }, transaction: t
    });
    const canEmail = pref ? !!pref.is_habilitado : emailDefaultOn;
    if (!canEmail) continue;

    const to = d.user?.email;
    if (!to) continue;

    const link_url = notif.link_url || '#';
    const payload = {
      // payload estándar que esperan los templates
      tarea: notif.tarea ? { ...(notif.tarea.get?.() ?? notif.tarea) } : undefined,
      evento: notif.evento ? { ...(notif.evento.get?.() ?? notif.evento) } : undefined,
      canal: notif.chatCanal ? { ...(notif.chatCanal.get?.() ?? notif.chatCanal) } : undefined,
      comentario: notif.data_json ? JSON.parse(notif.data_json)?.comentario : undefined,
      rsvp: notif.data_json ? JSON.parse(notif.data_json)?.rsvp : undefined,
      link: link_url
    };

    const { subject, html } = await renderEmail({ tipo_id: notif.tipo_id, payload, link_url }, t);

    // 1) Guardar envío (tracking)
    const envio = await queueEmailEnvio({
      destino_id: d.id, canal_id: canalId, proveedor_id: proveedorId,
      asunto: subject, cuerpo_html: html, data_render_json: payload
    }, t);

    // 2) Pixel de apertura
    const baseUrlEnv = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const baseUrl = baseUrlEnv || 'https://tu-app.com';
    const pixelUrl = `${baseUrl}/api/notificaciones/email/open/${envio.tracking_token}.gif`;
    const htmlWithPixel = `${html}<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`;

    // 3) Enviar
    const provider_msg_id = await sendMail({ to, subject, html: htmlWithPixel });
    await markEnvioSent(envio.id, provider_msg_id, t);
    sent++;
  }
  return sent;
};
// /backend/src/modules/notificaciones/services/emailTemplates.js

// Plantillas HTML (fallback en código) estilo OdontApp, pero adaptadas a FedesHub
const colors = {
  primary: '#145C63',
  light:   '#F3F4F6',
  dark:    '#1C1C1E',
  white:   '#ffffff',
  accent:  '#C1C1C1'
};

const baseLayout = (content) => `
  <div style="background:${colors.light};padding:24px 0;font-family:Inter,Arial,sans-serif;color:${colors.dark}">
    <div style="max-width:640px;margin:0 auto;background:${colors.white};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
      <div style="padding:20px 24px;background:${colors.primary};color:${colors.white};font-weight:600;font-size:18px">
        FedesHub
      </div>
      <div style="padding:24px">${content}</div>
      <div style="padding:16px 24px;font-size:12px;color:${colors.accent};border-top:1px solid #eee">
        Recibiste este correo porque tienes notificaciones activas en FedesHub.<br/>
        © ${new Date().getFullYear()} Fedes
      </div>
    </div>
  </div>
`;

export const templates = {
  confirmEmail: ({ name, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Hola ${name || '¡Fede!'}</h2>
    <p>Confirmá tu correo para empezar a usar FedesHub.</p>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:12px 16px;border-radius:8px;text-decoration:none;display:inline-block">Confirmar</a></p>
  `),

  resetPassword: ({ name, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Recuperación de contraseña</h2>
    <p>Hola ${name || ''}, recibimos un pedido para resetear tu contraseña.</p>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:12px 16px;border-radius:8px;text-decoration:none;display:inline-block">Cambiar contraseña</a></p>
  `),

  // ---- Plantillas FedesHub (ejemplos de NotificacionTipo por email) ----
  tarea_asignada: ({ tarea, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Nueva tarea asignada</h2>
    <p><strong>${tarea?.titulo}</strong></p>
    <p>Cliente: ${tarea?.cliente?.nombre ?? ''}</p>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block">Abrir tarea</a></p>
  `),

  tarea_comentario: ({ tarea, comentario, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Nuevo comentario en tarea</h2>
    <p><strong>${tarea?.titulo}</strong></p>
    <blockquote style="border-left:3px solid ${colors.accent};padding-left:12px;color:#555">${comentario}</blockquote>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block">Ver conversación</a></p>
  `),

  chat_mencion: ({ canal, mensaje, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Te mencionaron en ${canal?.nombre || 'un canal'}</h2>
    <blockquote style="border-left:3px solid ${colors.accent};padding-left:12px;color:#555">${mensaje}</blockquote>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block">Abrir chat</a></p>
  `),

  evento_recordatorio: ({ evento, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Recordatorio de reunión</h2>
    <p><strong>${evento?.titulo}</strong><br/>
    ${new Date(evento?.starts_at || '').toLocaleString()}</p>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block">Ver evento</a></p>
  `)
};
// /backend/src/modules/notificaciones/services/mailer.js
// RUTA: /backend/src/modules/notificaciones/services/mailer.js
import nodemailer from 'nodemailer';

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  SMTP_FROM_EMAIL, SMTP_FROM_NAME
} = process.env;

// Pool para mejorar throughput si hay varias notificaciones
export const transporter = nodemailer.createTransport({
  host: SMTP_HOST || 'smtp.gmail.com',
  port: Number(SMTP_PORT) || 465,
  secure: true,
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

export const sendMail = async ({ to, subject, html }) => {
  const info = await transporter.sendMail({
    from: `"${SMTP_FROM_NAME || 'FedesHub'}" <${SMTP_FROM_EMAIL || SMTP_USER}>`,
    to, subject, html
  });
  return info.messageId || null;
};
// /backend/src/modules/notificaciones/services/notificaciones.service.js

import {
  listCatalogos, listInbox, countByVentana, listChatCanalesForUser,
  getPreferences, setPreferences,
  createNotificacion, setSeen, setRead, setDismiss, setArchive, setPin
} from '../repositories/notificaciones.repo.js';

import { sendNotificationEmails } from './email.service.js';
import { sendNotificationPush } from './push.service.js';

import { initModels } from '../../../models/registry.js';
import { sequelize } from '../../../core/db.js';
import { log } from '../../../infra/logging/logger.js';

await initModels();

// ====== Catálogos / Buzón / Preferencias ======
export const svcCatalogos     = () => listCatalogos();
export const svcVentanasCount = async (user) => countByVentana(user.id);
export const svcInbox         = async (q, user) => listInbox(q, user);
export const svcChatCanales   = (user) => listChatCanalesForUser(user.id);

export const svcPreferences = (user) => getPreferences(user.id);

export const svcSetPreferences = async (body, user) => {
  const t = await sequelize.transaction();
  try {
    log.info('notif:prefs:set:start', { user_id: user.id, items: body?.items?.length || 0 });
    const rows = await setPreferences(user.id, body.items, t);
    await t.commit();
    log.info('notif:prefs:set:ok', { user_id: user.id, updated: rows?.length || 0 });
    return rows;
  } catch (e) {
    await t.rollback();
    log.error('notif:prefs:set:err', { user_id: user.id, err: e?.message, stack: e?.stack });
    throw e;
  }
};

// ====== Crear notificación + disparos ======
export const svcCreate = async (body, user) => {
  const t = await sequelize.transaction();
  let notif;
  try {
    log.info('notif:create:start', {
      user_id: user?.id ?? null,
      tipo: body?.tipo_codigo,
      destinos: Array.isArray(body?.destinos) ? body.destinos.length : 0,
      tarea_id: body?.tarea_id || null,
      evento_id: body?.evento_id || null,
      chat_canal_id: body?.chat_canal_id || null,
      canales: body?.canales || null
    });

    notif = await createNotificacion(body, body.destinos, user.id, t);

    await t.commit();
    log.info('notif:create:ok', { notif_id: notif?.id, tipo: body?.tipo_codigo });

  } catch (e) {
    await t.rollback();
    log.error('notif:create:err', { err: e?.message, stack: e?.stack });
    throw e;
  }

  // Disparos fuera de la transacción
  (async () => {
    try {
      log.info('notif:email:dispatch', { notif_id: notif.id });
      await sendNotificationEmails(notif.id); // sin t
      log.info('notif:email:ok', { notif_id: notif.id });
    } catch (e) {
      log.error('notif:email:fail', { notif_id: notif.id, err: e?.message });
    }
  })();

  (async () => {
    try {
      log.info('notif:push:dispatch', { notif_id: notif.id });
      await sendNotificationPush(notif.id); // sin t
      log.info('notif:push:ok', { notif_id: notif.id });
    } catch (e) {
      log.error('notif:push:fail', { notif_id: notif.id, err: e?.message });
    }
  })();

  return notif;
};

// ====== Acciones de estado ======
export const svcMarkSeen = (id, user)        => setSeen(id, user.id);
export const svcMarkRead = (id, on, user)    => setRead(id, user.id, on);
export const svcDismiss  = (id, on, user)    => setDismiss(id, user.id, on);
export const svcArchive  = (id, on, user)    => setArchive(id, user.id, on);
export const svcPin      = (id, orden, user) => setPin(id, user.id, orden);
// /backend/src/modules/notificaciones/services/push.service.js
// RUTA: /backend/src/modules/notificaciones/services/push.service.js
import { initModels } from '../../../models/registry.js';
import { sendToTokens } from '../../../lib/push/fcm.js';
import { log } from '../../../infra/logging/logger.js';

const m = await initModels();

// Errores típicos de FCM que invalidan token
const INVALID_TOKEN_ERRORS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token'
];

export const sendNotificationPush = async (notificacion_id, t) => {
  const notif = await m.Notificacion.findByPk(notificacion_id, {
    include: [
      { model: m.NotificacionTipo, as: 'tipo' },
      { model: m.ImportanciaTipo, as: 'importancia' },
      { model: m.Tarea, as: 'tarea', include: [{ model: m.Cliente, as: 'cliente' }] },
      { model: m.Evento, as: 'evento' },
      { model: m.ChatCanal, as: 'chatCanal' },
      { model: m.NotificacionDestino, as: 'destinos', include: [{ model: m.User, as: 'user' }] }
    ],
    transaction: t
  });
  if (!notif) return 0;

  const canal = await m.CanalTipo.findOne({ where: { codigo: 'push' }, transaction: t });
  const proveedor = await m.ProveedorTipo.findOne({ where: { codigo: process.env.PUSH_PROVIDER || 'fcm' }, transaction: t });
  const canalId = canal?.id ?? null;
  const proveedorId = proveedor?.id ?? null;

  const defaults = Array.isArray(notif.tipo?.canales_default_json) && notif.tipo.canales_default_json.length
    ? notif.tipo.canales_default_json
    : (process.env.NODE_ENV === 'production' ? ['in_app'] : ['in_app','email','push']); // ⬅️ fallback más conservador en prod

  const pushDefaultOn = defaults.includes('push');

  const estadoSent  = await m.EstadoEnvio.findOne({ where: { codigo: 'sent'  }, transaction: t });
  const estadoError = await m.EstadoEnvio.findOne({ where: { codigo: 'error' }, transaction: t });

  log.info('push:start', {
    notificacion_id, canalId, proveedorId, pushDefaultOn,
    tipo: notif.tipo?.codigo, defaults
  });

  let sent = 0;

  for (const d of notif.destinos) {
    const pref = canalId ? await m.NotificacionPreferencia.findOne({
      where: { user_id: d.user_id, tipo_id: notif.tipo_id, canal_id: canalId }, transaction: t
    }) : null;

    const canPush = pref ? !!pref.is_habilitado : pushDefaultOn;

    log.info('push:destino', {
      destino_id: d.id, user_id: d.user_id,
      canPush,
      pref: pref ? { id: pref.id, is_habilitado: pref.is_habilitado } : null
    });

    if (!canPush) continue;

    const rows = await m.PushToken.findAll({
      where: { user_id: d.user_id, is_revocado: false },
      transaction: t
    });
    const tokens = rows.map(x => x.token);
    log.info('push:tokens', { destino_id: d.id, count: tokens.length });

    if (!tokens.length) continue;

    const title = notif.titulo || notif.tipo?.nombre || 'FedesHub';
    const body =
      notif.mensaje ||
      (notif.tarea ? notif.tarea.titulo :
       notif.evento ? notif.evento.titulo :
       notif.chatCanal ? `Mención en ${notif.chatCanal.nombre}` : '');

    const data = {
      notificacion_id: String(notif.id),
      tipo: String(notif.tipo?.codigo || ''),
      link_url: notif.link_url || '',
      tarea_id: notif.tarea_id ? String(notif.tarea_id) : '',
      evento_id: notif.evento_id ? String(notif.evento_id) : '',
      chat_canal_id: notif.chat_canal_id ? String(notif.chat_canal_id) : '',
    };

    const res = await sendToTokens(tokens, { title, body }, data);

    // Actualizo last_seen_at por health del token
    await m.PushToken.update(
      { last_seen_at: new Date() },
      { where: { token: tokens }, transaction: t }
    );

    log.info('push:resumen', {
      destino_id: d.id,
      successCount: res?.successCount,
      failureCount: res?.failureCount
    });

    for (let i = 0; i < tokens.length; i++) {
      const response = res?.responses?.[i];
      const ok = response?.success ?? (res?.successCount > 0 && tokens.length === 1);
      const token = tokens[i];

      if (!ok && response?.error?.message) {
        const msg = response.error.message;
        const matchesInvalid = INVALID_TOKEN_ERRORS.some(code => msg.includes(code));
        if (matchesInvalid) {
          // Revoco token inválido
          await m.PushToken.update({ is_revocado: true }, { where: { token }, transaction: t });
          log.info('push:token:revoked', { token });
        }
      }

      await m.NotificacionEnvio.create({
        destino_id: d.id,
        canal_id: canalId,
        proveedor_id: proveedorId,
        estado_id: ok ? estadoSent?.id : estadoError?.id,
        asunto_render: title,
        cuerpo_render: body,
        data_render_json: JSON.stringify({ ...data, token }),
        enviado_at: ok ? new Date() : null,
        ultimo_error: ok ? null : (response?.error?.message || 'send error')
      }, { transaction: t });

      if (ok) sent++;
    }
  }

  log.info('push:done', { notificacion_id, sent });
  return sent;
};
// backend/src/modules/notificaciones/repositories/notificaciones.repo.js
import { Op, fn, col } from 'sequelize';
import { initModels } from '../../../models/registry.js';
import crypto from 'crypto';

const m = await initModels();

/* ========== Helpers ========== */
const _buzonIdByCodigo = async (codigo, t) => {
  const row = await m.BuzonTipo.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
};
const _estadoEnvioByCodigo = async (codigo, t) => {
  const row = await m.EstadoEnvio.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
};
const _tipoByCodigo = async (codigo, t) => {
  const row = await m.NotificacionTipo.findOne({ where: { codigo }, transaction: t });
  return row;
};
const _importanciaByCodigo = async (codigo, t) => {
  const row = await m.ImportanciaTipo.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
};

/* ========== Catálogos ========== */
export const listCatalogos = async () => {
  const [tipos, canales, importancias, estadosEnvio, proveedores, buzones] = await Promise.all([
    m.NotificacionTipo.findAll({
      attributes: ['id','codigo','nombre','buzon_id','canales_default_json'],
      order: [['codigo','ASC']]
    }),
    m.CanalTipo.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] }),
    m.ImportanciaTipo.findAll({ attributes: ['id','codigo','nombre','orden'], order: [['orden','ASC']] }),
    m.EstadoEnvio.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] }),
    m.ProveedorTipo.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] }),
    m.BuzonTipo.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] })
  ]);
  return { tipos, canales, importancias, estadosEnvio, proveedores, buzones };
};

/* ========== Inbox / Ventanas ========== */
function _buildInboxFilters(params, { buzon_id, user_id }) {
  const only_unread       = !!params.only_unread;
  const include_archived  = !!params.include_archived;
  const include_dismissed = !!params.include_dismissed;
  const q                 = params.q?.trim();

  const whereNotif = {};
  if (buzon_id) whereNotif.buzon_id = buzon_id;
  if (params.chat_canal_id) whereNotif.chat_canal_id = params.chat_canal_id;
  if (params.tarea_id) whereNotif.tarea_id = params.tarea_id;
  if (params.evento_id) whereNotif.evento_id = params.evento_id;
  if (params.importancia_id) whereNotif.importancia_id = params.importancia_id;
  if (params.hilo_key) whereNotif.hilo_key = params.hilo_key;

  const whereDest = { user_id };
  if (only_unread) whereDest.read_at = { [Op.is]: null };
  if (!include_archived) whereDest.archived_at = { [Op.is]: null };
  if (!include_dismissed) whereDest.dismissed_at = { [Op.is]: null };

  const whereQ = q ? {
    [Op.or]: [
      { '$notificacion.titulo$':  { [Op.iLike]: `%${q}%` } },
      { '$notificacion.mensaje$': { [Op.iLike]: `%${q}%` } }
    ]
  } : {};

  return { whereNotif, whereDest, whereQ };
}

export const listInbox = async (params, user, t) => {
  const limit  = Math.min(Number(params.limit ?? 25), 100);
  const offset = Math.max(Number(params.offset ?? 0), 0);
  const buzon_id = params.buzon ? await _buzonIdByCodigo(params.buzon, t) : null;

  const { whereNotif, whereDest, whereQ } =
    _buildInboxFilters(params, { buzon_id, user_id: user.id });

  const order =
    params.sort === 'oldest'
      ? [[{ model: m.Notificacion, as: 'notificacion' }, 'created_at', 'ASC']]
      : params.sort === 'importance'
      ? [
          [{ model: m.Notificacion, as: 'notificacion' }, { model: m.ImportanciaTipo, as: 'importancia' }, 'orden', 'ASC'],
          [{ model: m.Notificacion, as: 'notificacion' }, 'created_at', 'DESC']
        ]
      : [[{ model: m.Notificacion, as: 'notificacion' }, 'created_at', 'DESC']];

  const includeNotif = {
    model: m.Notificacion, as: 'notificacion', required: true, where: whereNotif,
    include: [
      { model: m.NotificacionTipo, as: 'tipo', attributes: ['id','codigo','nombre','buzon_id'] },
      { model: m.ImportanciaTipo, as: 'importancia', attributes: ['id','codigo','nombre','orden'] },
      { model: m.Tarea, as: 'tarea', attributes: ['id','titulo','cliente_id'],
        include: [{ model: m.Cliente, as: 'cliente', attributes: ['id','nombre'] }]
      },
      { model: m.Evento, as: 'evento', attributes: ['id','titulo','starts_at','ends_at'] },
      { model: m.ChatCanal, as: 'chatCanal', attributes: ['id','nombre','slug'],
        include: [{ model: m.ChatCanalTipo, as: 'tipo', attributes: ['codigo','nombre'] }]
      }
    ]
  };

  const [rows, total] = await Promise.all([
    m.NotificacionDestino.findAll({
      where: { ...whereDest, ...whereQ },
      include: [includeNotif],
      order, limit, offset
    }),
    m.NotificacionDestino.count({
      where: { ...whereDest, ...whereQ },
      include: [includeNotif]
    })
  ]);

  return { total, rows };
};

export const countByVentana = async (user_id, t) => {
  // Contamos **no leídas y visibles** por buzón
  const [chatId, tareasId, calId] = await Promise.all([
    _buzonIdByCodigo('chat', t),
    _buzonIdByCodigo('tareas', t),
    _buzonIdByCodigo('calendario', t)
  ]);

  const baseUnreadVisible = {
    user_id,
    read_at:      { [Op.is]: null },
    archived_at:  { [Op.is]: null },
    dismissed_at: { [Op.is]: null },
  };

  const countFor = (buzId) => m.NotificacionDestino.count({
    where: baseUnreadVisible,
    include: [{
      model: m.Notificacion, as: 'notificacion', required: true, where: { buzon_id: buzId }
    }]
  });

  const [chat, tareas, calendario, unread_total] = await Promise.all([
    countFor(chatId),
    countFor(tareasId),
    countFor(calId),
    m.NotificacionDestino.count({ where: baseUnreadVisible })
  ]);

  return { chat, tareas, calendario, unread_total };
};

export const listChatCanalesForUser = async (user_id) => {
  const rows = await m.ChatCanal.findAll({
    attributes: ['id','nombre','slug','is_archivado','created_at'],
    include: [
      { model: m.ChatCanalTipo, as: 'tipo', attributes: ['codigo','nombre'] },
      {
        model: m.Notificacion, as: 'notificaciones', required: false,
        where: { chat_canal_id: { [Op.ne]: null } },
        include: [{ model: m.NotificacionDestino, as: 'destinos', where: { user_id }, required: true }]
      }
    ],
    order: [['updated_at','DESC']]
  });
  return rows;
};

/* ========== Preferencias ========== */
export const getPreferences = async (user_id) => {
  const rows = await m.NotificacionPreferencia.findAll({
    where: { user_id },
    include: [
      { model: m.NotificacionTipo, as: 'tipo', attributes: ['id','codigo','nombre'] },
      { model: m.CanalTipo, as: 'canal', attributes: ['id','codigo','nombre'] }
    ],
    order: [['tipo_id','ASC'], ['canal_id','ASC']]
  });
  return rows;
};

export const setPreferences = async (user_id, items, t) => {
  for (const it of items) {
    const [row, created] = await m.NotificacionPreferencia.findOrCreate({
      where: { user_id, tipo_id: it.tipo_id, canal_id: it.canal_id },
      defaults: { is_habilitado: it.is_habilitado },
      transaction: t
    });
    if (!created) await row.update({ is_habilitado: it.is_habilitado }, { transaction: t });
  }
  return getPreferences(user_id);
};

/* ========== Crear notificación ========== */
export const createNotificacion = async (payload, destinos, created_by_user_id, t) => {
  let tipo_id = payload.tipo_id;
  if (!tipo_id && payload.tipo_codigo) {
    const tipo = await _tipoByCodigo(payload.tipo_codigo, t);
    if (!tipo) throw Object.assign(new Error('tipo_codigo inválido'), { status: 400 });
    tipo_id = tipo.id;
  }

  const importancia_id = payload.importancia_id ?? await _importanciaByCodigo('media', t);
  const tipo = await m.NotificacionTipo.findByPk(tipo_id, { transaction: t });
  const buzon_id = tipo.buzon_id;

  const n = await m.Notificacion.create({
    tipo_id,
    importancia_id,
    titulo: payload.titulo ?? null,
    mensaje: payload.mensaje ?? null,
    data_json: payload.data ? JSON.stringify(payload.data) : null,
    link_url: payload.link_url ?? null,
    tarea_id: payload.tarea_id ?? null,
    ausencia_id: payload.ausencia_id ?? null,
    asistencia_registro_id: payload.asistencia_registro_id ?? null,
    evento_id: payload.evento_id ?? null,
    chat_canal_id: payload.chat_canal_id ?? null,
    hilo_key: payload.hilo_key ?? null,
    programada_at: payload.programada_at ?? null,
    created_by_user_id: created_by_user_id ?? null,
    buzon_id
  }, { transaction: t });

  const ds = destinos.map(d => ({
    notificacion_id: n.id,
    user_id: d.user_id,
    feder_id: d.feder_id ?? null
  }));
  await m.NotificacionDestino.bulkCreate(ds, { transaction: t, ignoreDuplicates: true });

  return n;
};

/* ========== Marcas (por destino de usuario) ========== */
async function _destForUpdate(notificacion_id, user_id) {
  const row = await m.NotificacionDestino.findOne({ where: { notificacion_id, user_id } });
  if (!row) throw Object.assign(new Error('Destino no encontrado'), { status: 404 });
  return row;
}

export const setSeen = async (id, user_id) => {
  const row = await _destForUpdate(id, user_id);
  if (!row.in_app_seen_at) await row.update({ in_app_seen_at: new Date() });
  return row;
};

export const setRead = async (id, user_id, on) => {
  const row = await _destForUpdate(id, user_id);
  await row.update({ read_at: on ? new Date() : null });
  return row;
};

export const setDismiss = async (id, user_id, on) => {
  const row = await _destForUpdate(id, user_id);
  await row.update({ dismissed_at: on ? new Date() : null });
  return row;
};

export const setArchive = async (id, user_id, on) => {
  const row = await _destForUpdate(id, user_id);
  await row.update({ archived_at: on ? new Date() : null });
  return row;
};

export const setPin = async (id, user_id, orden) => {
  const row = await _destForUpdate(id, user_id);
  await row.update({ pin_orden: orden ?? null });
  return row;
};

/* ========== Email queue & tracking ========== */
export const queueEmailEnvio = async ({ destino_id, canal_id, proveedor_id, asunto, cuerpo_html, data_render_json }, t) => {
  const estadoQueued = await _estadoEnvioByCodigo('queued', t);
  const tracking_token = cryptoRandomToken();
  const envio = await m.NotificacionEnvio.create({
    destino_id, canal_id, proveedor_id,
    estado_id: estadoQueued,
    asunto_render: asunto,
    cuerpo_render: cuerpo_html,
    data_render_json: data_render_json ? JSON.stringify(data_render_json) : null,
    tracking_token,
    queued_at: new Date()
  }, { transaction: t });
  return envio;
};

export const markEnvioSent = async (envio_id, provider_msg_id, t) => {
  const estadoSent = await _estadoEnvioByCodigo('sent', t);
  const row = await m.NotificacionEnvio.findByPk(envio_id, { transaction: t });
  if (!row) return null;
  await row.update({ estado_id: estadoSent, provider_msg_id, enviado_at: new Date(), ultimo_error: null }, { transaction: t });
  return row;
};

export const markEnvioOpenedByToken = async (token) => {
  const row = await m.NotificacionEnvio.findOne({ where: { tracking_token: token } });
  if (!row) return null;
  const estadoOpened = await m.EstadoEnvio.findOne({ where: { codigo: 'opened' } });
  await row.update({ estado_id: estadoOpened?.id ?? row.estado_id, abierto_at: new Date() });
  const destino = await m.NotificacionDestino.findByPk(row.destino_id);
  if (destino && !destino.read_at) await destino.update({ read_at: new Date() });
  return row;
};

function cryptoRandomToken(len = 16) {
  return crypto.randomBytes(len).toString('hex'); // 32 hex chars
}