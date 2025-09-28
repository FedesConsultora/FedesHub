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
// /backend/src/modules/chat/validators.js
import { z } from 'zod';

export const scopeEnum = z.enum(['mine','canal','celula','cliente','dm','all']);

const asArrayOfInts = (v) => {
  if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
  if (typeof v === 'string') return v.split(',').map(n => parseInt(n,10)).filter(Number.isFinite);
  return undefined;
};

export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const midParam = z.object({ id: z.coerce.number().int().positive() });
export const intId = z.coerce.number().int().positive();

export const listCatalogQuery = z.object({});

export const listCanalesQuery = z.object({
  scope: scopeEnum.default('mine'),
  canal_id: z.coerce.number().int().positive().optional(),
  celula_id: z.coerce.number().int().positive().optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  include_archivados: z.coerce.boolean().optional().default(false),
  q: z.string().trim().max(160).optional()
}).refine(v => {
  if (v.scope === 'canal')  return !!v.canal_id;
  if (v.scope === 'celula') return !!v.celula_id;
  if (v.scope === 'cliente')return !!v.cliente_id;
  return true;
}, { message: 'falta canal_id/celula_id/cliente_id según scope' });

export const upsertCanalSchema = z.object({
  id: z.number().int().optional(),
  tipo_codigo: z.enum(['dm','grupo','canal','celula','cliente']),
  nombre: z.string().max(120).optional(),
  slug: z.string().max(120).optional(),
  topic: z.string().max(240).optional(),
  descripcion: z.string().optional(),
  is_privado: z.boolean().optional(),
  only_mods_can_post: z.boolean().optional(),
  slowmode_seconds: z.number().int().min(0).max(86400).optional(),
  celula_id: z.number().int().optional(),
  cliente_id: z.number().int().optional(),
  invited_user_ids: z.array(z.number().int().positive()).optional().default([]) // miembros iniciales
}).refine(v => {
  if (v.tipo_codigo === 'celula')  return !!v.celula_id;
  if (v.tipo_codigo === 'cliente') return !!v.cliente_id;
  if (v.tipo_codigo === 'dm')      return (v.invited_user_ids?.length ?? 0) === 1;
  return true;
}, { message: 'Para tipo celula/cliente se requiere id; para DM un (1) invitado' });

export const updateCanalSettingsSchema = z.object({
  only_mods_can_post: z.boolean().optional(),
  slowmode_seconds: z.number().int().min(0).max(86400).optional(),
  topic: z.string().max(240).optional(),
  is_privado: z.boolean().optional()
}).refine(v => Object.keys(v).length > 0, { message: 'Nada para actualizar' });

export const memberUpsertSchema = z.object({
  user_id: z.number().int().positive(),
  rol_codigo: z.enum(['owner','admin','mod','member','guest']).default('member'),
  is_mute: z.boolean().optional(),
  notif_level: z.enum(['all','mentions','none']).optional()
});

export const memberPatchSchema = z.object({
  rol_codigo: z.enum(['owner','admin','mod','member','guest']).optional(),
  is_mute: z.boolean().optional(),
  notif_level: z.enum(['all','mentions','none']).optional()
}).refine(v => Object.keys(v).length > 0, { message: 'Nada para actualizar' });

export const listMessagesQuery = z.object({
  before_id: z.coerce.number().int().positive().optional(),
  after_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  thread_root_id: z.coerce.number().int().positive().optional()
});

export const postMessageSchema = z.object({
  body_text: z.string().optional(),
  body_json: z.record(z.any()).optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  attachments: z.array(z.object({
    file_url: z.string().url(),
    file_name: z.string().max(255).optional(),
    mime_type: z.string().max(160).optional(),
    size_bytes: z.coerce.number().int().optional(),
    width: z.coerce.number().int().optional(),
    height: z.coerce.number().int().optional(),
    duration_sec: z.coerce.number().int().optional()
  })).optional().default([])
}).refine(v => (v.body_text?.trim()?.length ?? 0) > 0 || !!v.body_json || (v.attachments?.length ?? 0) > 0,
  { message: 'mensaje vacío' });

export const editMessageSchema = z.object({
  body_text: z.string().optional(),
  body_json: z.record(z.any()).optional()
}).refine(v => Object.keys(v).length > 0, { message: 'Nada para editar' });

export const reactionSchema = z.object({ emoji: z.string().min(1).max(80) });

export const readChannelSchema = z.object({
  last_read_msg_id: z.number().int().positive()
});

export const saveSchema = z.object({ on: z.boolean() });
export const pinSchema = z.object({ on: z.boolean(), orden: z.number().int().nullable().optional() });

export const typingSchema = z.object({ on: z.boolean(), ttl_seconds: z.number().int().min(1).max(15).default(5) });

export const presenceSchema = z.object({
  status: z.enum(['online','away','dnd','offline']).default('online'),
  device: z.string().max(60).optional()
});

export const createInvitationSchema = z.object({
  invited_user_id: z.number().int().optional(),
  invited_email: z.string().email().optional()
}).refine(v => !!v.invited_user_id || !!v.invited_email, { message: 'invited_user_id o invited_email requerido' });

export const invitationTokenParam = z.object({ token: z.string().min(10) });

export const meetingSchema = z.object({
  provider_codigo: z.string().max(30).default('internal'),
  titulo: z.string().min(1).max(200).default('Reunión de canal'),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date()
}).refine(v => v.ends_at > v.starts_at, { message: 'ends_at debe ser mayor que starts_at' });
// /backend/src/modules/chat/controllers/chat.controller.js
import { initModels } from '../../../models/registry.js';
import {
  listCatalogQuery, listCanalesQuery, upsertCanalSchema, updateCanalSettingsSchema,
  memberUpsertSchema, memberPatchSchema,
  listMessagesQuery, postMessageSchema, editMessageSchema, reactionSchema,
  readChannelSchema, saveSchema, pinSchema, typingSchema, presenceSchema,
  createInvitationSchema, invitationTokenParam, meetingSchema,
  idParam, midParam
} from '../validators.js';

import {
  svcCatalogos, svcListCanales, svcUpsertCanal, svcArchiveCanal, svcUpdateCanalSettings,
  svcListMiembros, svcAddOrUpdateMiembro, svcRemoveMiembro, svcJoin, svcLeave,
  svcListMessages, svcPostMessage, svcEditMessage, svcDeleteMessage,
  svcReact, svcPin, svcSave, svcFollowThread, svcSetRead,
  svcSetPresence, svcTyping,
  svcInvite, svcAcceptInvitation, svcDeclineInvitation,
  svcScheduleMeeting
} from '../services/chat.service.js';

await initModels();

export const health = (_req, res) => res.json({ module: 'chat', ok: true });

// ------ Catálogo
export const getCatalog = async (_req, res, next) => {
  try { res.json(await svcCatalogos()); } catch (e) { next(e); }
};

// ------ Canales
export const getCanales = async (req, res, next) => {
  try {
    const q = listCanalesQuery.parse(req.query);
    res.json(await svcListCanales(q, req.user));
  } catch (e) { next(e); }
};

export const postCanal = async (req, res, next) => {
  try {
    const body = upsertCanalSchema.parse(req.body);
    const row = await svcUpsertCanal(body, req.user);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

export const putCanal = async (req, res, next) => {
  try {
    const body = upsertCanalSchema.parse({ ...req.body, id: Number(req.params.id) });
    res.json(await svcUpsertCanal(body, req.user));
  } catch (e) { next(e); }
};

export const patchArchiveCanal = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { on } = { on: !!req.body?.on };
    res.json(await svcArchiveCanal(id, on));
  } catch (e) { next(e); }
};

export const patchCanalSettings = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = updateCanalSettingsSchema.parse(req.body);
    res.json(await svcUpdateCanalSettings(id, body));
  } catch (e) { next(e); }
};

// ------ Miembros
export const getMiembros = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await svcListMiembros(id));
  } catch (e) { next(e); }
};

export const postMiembro = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = memberUpsertSchema.parse(req.body);
    res.status(201).json(await svcAddOrUpdateMiembro(id, body, req.user));
  } catch (e) { next(e); }
};

export const patchMiembro = async (req, res, next) => {
  try {
    const { id, user_id } = { ...req.params, user_id: Number(req.params.user_id) };
    const body = memberPatchSchema.parse(req.body);
    res.json(await svcAddOrUpdateMiembro(Number(id), { user_id, ...body }, req.user));
  } catch (e) { next(e); }
};

export const deleteMiembro = async (req, res, next) => {
  try {
    const { id, user_id } = { ...req.params, user_id: Number(req.params.user_id) };
    res.json(await svcRemoveMiembro(Number(id), Number(user_id)));
  } catch (e) { next(e); }
};

export const postJoin = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await svcJoin(id, req.user));
  } catch (e) { next(e); }
};

export const postLeave = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await svcLeave(id, req.user));
  } catch (e) { next(e); }
};

// ------ Mensajes
export const getMessages = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const q = listMessagesQuery.parse(req.query);
    res.json(await svcListMessages(id, q, req.user));
  } catch (e) { next(e); }
};

export const postMessage = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = postMessageSchema.parse(req.body);
    const row = await svcPostMessage(id, body, req.user);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

export const putMessage = async (req, res, next) => {
  try {
    const { id } = midParam.parse(req.params);
    const body = editMessageSchema.parse(req.body);
    res.json(await svcEditMessage(id, body, req.user));
  } catch (e) { next(e); }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { id } = midParam.parse(req.params);
    res.json(await svcDeleteMessage(id, req.user));
  } catch (e) { next(e); }
};

export const postReact = async (req, res, next) => {
  try {
    const { id } = midParam.parse(req.params);
    const { emoji, on } = { ...reactionSchema.parse(req.body), on: req.body?.on !== false };
    res.json(await svcReact(id, emoji, on, req.user));
  } catch (e) { next(e); }
};

export const postPin = async (req, res, next) => {
  try {
    const { id } = midParam.parse(req.params); // mensaje_id
    const { on, orden } = pinSchema.parse(req.body);
    // ✅ permitimos que canal_id no venga; el servicio resuelve por mensaje
    const canal_id = req.body?.canal_id ? Number(req.body.canal_id) : null;
    res.json(await svcPin(canal_id, id, on, orden, req.user));
  } catch (e) { next(e); }
};

export const postSave = async (req, res, next) => {
  try {
    const { id } = midParam.parse(req.params); // mensaje_id
    const { on } = saveSchema.parse(req.body);
    res.json(await svcSave(id, on, req.user));
  } catch (e) { next(e); }
};

export const postFollowThread = async (req, res, next) => {
  try {
    const { root_id } = { root_id: Number(req.params.root_id) };
    const { on } = saveSchema.parse(req.body);
    res.json(await svcFollowThread(root_id, on, req.user));
  } catch (e) { next(e); }
};

export const postRead = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { last_read_msg_id } = readChannelSchema.parse(req.body);
    res.json(await svcSetRead(id, last_read_msg_id, req.user));
  } catch (e) { next(e); }
};

// ------ Presencia / Typing
export const postPresence = async (req, res, next) => {
  try {
    const body = presenceSchema.parse(req.body);
    res.json(await svcSetPresence(body, req.user));
  } catch (e) { next(e); }
};

export const postTyping = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { on, ttl_seconds } = typingSchema.parse(req.body);
    res.json(await svcTyping(id, on, ttl_seconds, req.user));
  } catch (e) { next(e); }
};

// ------ Invitaciones
export const postInvitation = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = createInvitationSchema.parse(req.body);
    const row = await svcInvite(id, body, req.user);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

export const postAcceptInvitation = async (req, res, next) => {
  try {
    const { token } = invitationTokenParam.parse(req.params);
    res.json(await svcAcceptInvitation(token, req.user));
  } catch (e) { next(e); }
};

export const postDeclineInvitation = async (req, res, next) => {
  try {
    const { token } = invitationTokenParam.parse(req.params);
    res.json(await svcDeclineInvitation(token, req.user));
  } catch (e) { next(e); }
};

// ------ Meetings
export const postMeeting = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = meetingSchema.parse(req.body);
    const r = await svcScheduleMeeting(id, body, req.user);
    res.status(201).json(r);
  } catch (e) { next(e); }
};
// /backend/src/modules/chat/services/chat.service.js
import { initModels } from '../../../models/registry.js';
import {
  catalogos as repoCatalogos, listCanales, createOrUpdateCanal,
  archiveCanal, updateCanalSettings, listMiembros, addOrUpdateMiembro,
  removeMiembro, joinCanal, leaveCanal, getCanalWithMiembro
} from '../repositories/channels.repo.js';

import {
  listMessages, createMessage, editMessage, deleteMessage,
  toggleReaction, togglePin, toggleSaved, followThread, setRead
} from '../repositories/messages.repo.js';

import { setPresence, setTyping } from '../repositories/presence.repo.js';
import { createInvitation, acceptInvitation, declineInvitation } from '../repositories/invitations.repo.js';
import { scheduleMeeting } from '../repositories/meetings.repo.js';

import { svcCreate as createNotif } from '../../notificaciones/services/notificaciones.service.js';

// 🔊 Publishers SSE (tiempo real)
import {
  publishMessageCreated, publishMessageEdited, publishMessageDeleted,
  publishReactionUpdated, publishPinUpdated, publishSavedUpdated,
  publishRead, publishTyping, publishChannelUpdated, publishChannelArchived,
  publishMemberChanged, publishInvitation, publishMeetingScheduled,
  // (opcional) publishPresence
} from '../realtime/publisher.js';

const mReg = await initModels();
const sequelize = mReg.sequelize;

// -------- Catálogos
export const svcCatalogos = () => repoCatalogos();

// -------- Canales
export const svcListCanales = (q, user) => listCanales(q, user);

export const svcUpsertCanal = async (payload, user) => {
  const t = await sequelize.transaction();
  let row;
  try {
    row = await createOrUpdateCanal(payload, user, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: canal creado/actualizado
  try { await publishChannelUpdated(row); } catch (err) { console.error('sse channel updated', err); }

  return row;
};

export const svcArchiveCanal = async (id, on) => {
  const t = await sequelize.transaction();
  let row;
  try {
    row = await archiveCanal(id, on, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: canal archivado/desarchivado
  try { await publishChannelArchived(id, on); } catch (err) { console.error('sse channel archived', err); }

  return row;
};

export const svcUpdateCanalSettings = async (id, body) => {
  const t = await sequelize.transaction();
  let row;
  try {
    row = await updateCanalSettings(id, body, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: canal settings
  try { await publishChannelUpdated(row); } catch (err) { console.error('sse channel settings', err); }

  return row;
};

export const svcListMiembros = (canal_id) => listMiembros(canal_id);

export const svcAddOrUpdateMiembro = async (canal_id, payload, currentUser) => {
  const t = await sequelize.transaction();
  let row;
  try {
    // TODO (recomendado): validar rol del currentUser (owner/admin/mod) antes de invitar/editar
    row = await addOrUpdateMiembro(canal_id, payload, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: miembro agregado/actualizado
  try { await publishMemberChanged(canal_id, payload.user_id, 'upsert'); } catch (err) { console.error('sse member upsert', err); }

  return row;
};

export const svcRemoveMiembro = async (canal_id, user_id) => {
  const t = await sequelize.transaction();
  let r;
  try {
    r = await removeMiembro(canal_id, user_id, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: miembro removido
  try { await publishMemberChanged(canal_id, user_id, 'remove'); } catch (err) { console.error('sse member remove', err); }

  return r;
};

export const svcJoin = async (canal_id, user) => {
  const t = await sequelize.transaction();
  let row;
  try {
    row = await joinCanal(canal_id, user.id, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: ingresó
  try { await publishMemberChanged(canal_id, user.id, 'join'); } catch (err) { console.error('sse member join', err); }

  return row;
};

export const svcLeave = async (canal_id, user) => {
  const t = await sequelize.transaction();
  let r;
  try {
    r = await leaveCanal(canal_id, user.id, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: salió
  try { await publishMemberChanged(canal_id, user.id, 'leave'); } catch (err) { console.error('sse member leave', err); }

  return r;
};

// -------- Mensajes
// ✅ Verifica membresía antes de listar mensajes
export const svcListMessages = async (canal_id, q, user) => {
  const canal = await getCanalWithMiembro(canal_id, user.id);
  if (!canal || !(canal.miembros?.length > 0)) {
    const err = new Error('No sos miembro del canal');
    err.status = 403;
    throw err;
  }
  return listMessages(canal_id, q, user);
};

export const svcPostMessage = async (canal_id, payload, user) => {
  const t = await sequelize.transaction();
  let msg, canal;
  try {
    canal = await getCanalWithMiembro(canal_id, user.id, t);
    if (!canal) throw Object.assign(new Error('Canal no encontrado'), { status: 404 });
    msg = await createMessage(canal, payload, user, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: nuevo mensaje
  try { await publishMessageCreated(canal_id, msg, { except_user_id: user.id }); } catch (err) { console.error('sse post message', err); }

  // 🔔 Notificaciones (menciones vs. resto)
  try {
    await _notifyNewMessage(canal_id, msg, user);
  } catch (e) { console.error('notif chat post', e); }

  return msg;
};

export const svcEditMessage = async (id, payload, user) => {
  const t = await sequelize.transaction();
  let row;
  try {
    row = await editMessage(id, payload, user, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // Buscar canal_id si no viene
  const canal_id = row.canal_id ?? (await mReg.ChatMensaje.findByPk(id))?.canal_id;
  if (canal_id) {
    // 🔊 Real-time: mensaje editado
    try { await publishMessageEdited(canal_id, row, { except_user_id: user.id }); } catch (err) { console.error('sse edit msg', err); }
  }

  return row;
};

export const svcDeleteMessage = async (id, user) => {
  const t = await sequelize.transaction();
  let r, msg;
  try {
    r = await deleteMessage(id, user, t);
    await t.commit();
    msg = await mReg.ChatMensaje.findByPk(id);
  } catch (e) { await t.rollback(); throw e; }

  if (msg?.canal_id) {
    // 🔊 Real-time: mensaje eliminado
    try { await publishMessageDeleted(msg.canal_id, id, { except_user_id: user.id }); } catch (err) { console.error('sse delete msg', err); }
  }

  return r;
};

export const svcReact = async (mensaje_id, emoji, on, user) => {
  const t = await sequelize.transaction();
  let r, msg;
  try {
    r = await toggleReaction(mensaje_id, user.id, emoji, on, t);
    await t.commit();
    msg = await mReg.ChatMensaje.findByPk(mensaje_id);
  } catch (e) { await t.rollback(); throw e; }

  if (msg?.canal_id) {
    // 🔊 Real-time: reacción
    try { await publishReactionUpdated(msg.canal_id, mensaje_id, emoji, on, user.id); } catch (err) { console.error('sse react', err); }
  }

  return r;
};

// ✅ Fallback de canal_id si no viene (lo obtenemos por mensaje)
export const svcPin = async (canal_id, mensaje_id, on, orden, user) => {
  if (!canal_id) {
    const msg = await mReg.ChatMensaje.findByPk(mensaje_id, { attributes: ['canal_id'] });
    canal_id = msg?.canal_id || null;
    if (!canal_id) {
      const e = new Error('canal_id requerido');
      e.status = 400;
      throw e;
    }
  }

  const t = await sequelize.transaction();
  let r;
  try {
    r = await togglePin(canal_id, mensaje_id, user.id, on, orden, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: pin
  try { await publishPinUpdated(canal_id, mensaje_id, on, r?.pin_orden ?? orden ?? null); } catch (err) { console.error('sse pin', err); }

  return r;
};

export const svcSave = async (mensaje_id, on, user) => {
  const t = await sequelize.transaction();
  let r, msg;
  try {
    r = await toggleSaved(mensaje_id, user.id, on, t);
    await t.commit();
    msg = await mReg.ChatMensaje.findByPk(mensaje_id);
  } catch (e) { await t.rollback(); throw e; }

  if (msg?.canal_id) {
    // 🔊 Real-time: saved/unsaved (para UI que muestra "guardado")
    try { await publishSavedUpdated(msg.canal_id, mensaje_id, on, user.id); } catch (err) { console.error('sse saved', err); }
  }

  return r;
};

export const svcFollowThread = async (root_msg_id, on, user) => {
  const t = await sequelize.transaction();
  try {
    const r = await followThread(root_msg_id, user.id, on, t);
    await t.commit();
    return r;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcSetRead = async (canal_id, last_read_msg_id, user) => {
  const t = await sequelize.transaction();
  let r;
  try {
    r = await setRead(canal_id, user.id, last_read_msg_id, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: lectura de canal
  try { await publishRead(canal_id, user.id, last_read_msg_id); } catch (err) { console.error('sse read', err); }

  return r;
};

// -------- Presencia / Typing
export const svcSetPresence = async (body, user) => {
  const t = await sequelize.transaction();
  let r;
  try {
    r = await setPresence(user.id, body.status, body.device, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // (Opcional) Si querés broadcast de presencia global, podés publicar a interesados.
  // try { await publishPresence(user.id, body.status, body.device); } catch {}

  return r;
};

export const svcTyping = async (canal_id, on, ttl_seconds, user) => {
  const t = await sequelize.transaction();
  let r;
  try {
    r = await setTyping(canal_id, user.id, ttl_seconds, on, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: typing ON/OFF (no se envía al que tipeó)
  try { await publishTyping(canal_id, user.id, on, r?.until ?? null); } catch (err) { console.error('sse typing', err); }

  return r;
};

// -------- Invitaciones
export const svcInvite = async (canal_id, body, user) => {
  const t = await sequelize.transaction();
  let inv;
  try {
    inv = await createInvitation(canal_id, body, user.id, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: invitación creada
  try { await publishInvitation(canal_id, inv); } catch (err) { console.error('sse invite', err); }

  // 🔔 Notificación al invitado (si es usuario interno)
  if (inv.invited_user_id) {
    try {
      await createNotif({
        tipo_codigo: 'chat_mensaje',
        titulo: 'Invitación a canal',
        mensaje: `Te invitaron a un canal`,
        chat_canal_id: canal_id,
        destinos: [{ user_id: inv.invited_user_id }]
      }, user);
    } catch (e) { console.error('notif invitacion', e); }
  }
  return inv;
};

export const svcAcceptInvitation = async (token, user) => {
  const t = await sequelize.transaction();
  try {
    const inv = await acceptInvitation(token, user.id, t);
    await t.commit();
    return inv;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcDeclineInvitation = async (token, user) => {
  const t = await sequelize.transaction();
  try {
    const inv = await declineInvitation(token, user.id, t);
    await t.commit();
    return inv;
  } catch (e) { await t.rollback(); throw e; }
};

// -------- Meetings
export const svcScheduleMeeting = async (canal_id, body, user) => {
  const t = await sequelize.transaction();
  let evento, meet;
  try {
    ({ evento, meet } = await scheduleMeeting(canal_id, body, user.id, t));
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: meeting agendado
  try { await publishMeetingScheduled(canal_id, evento, meet); } catch (err) { console.error('sse meeting', err); }

  // 🔔 Notificar asistentes (todos los miembros con user_id)
  try {
    const miembros = await mReg.ChatCanalMiembro.findAll({ where: { canal_id } });
    const destinos = miembros.map(mm => ({ user_id: mm.user_id, feder_id: mm.feder_id ?? null }));
    if (destinos.length) {
      await createNotif({
        tipo_codigo: 'evento_invitacion',
        titulo: `Invitación: ${evento.titulo}`,
        mensaje: null,
        evento_id: evento.id,
        chat_canal_id: canal_id,
        destinos
      }, user);
    }
  } catch (e) { console.error('notif meeting', e); }

  return { evento, meet };
};

// -------- Helpers de notificación de mensajes (emails/push)
async function _notifyNewMessage(canal_id, msg, user) {
  const miembros = await mReg.ChatCanalMiembro.findAll({ where: { canal_id } });

  const destinosAll = miembros
    .filter(m => m.user_id !== user.id && !m.is_mute && m.notif_level === 'all')
    .map(m => ({ user_id: m.user_id, feder_id: m.feder_id ?? null }));

  const mentionedUserIds = _extractMentions(msg);
  const destinosMention = miembros
    .filter(m => mentionedUserIds.includes(m.user_id) && m.user_id !== user.id && !m.is_mute)
    .map(m => ({ user_id: m.user_id, feder_id: m.feder_id ?? null }));

  if (destinosMention.length) {
    await createNotif({
      tipo_codigo: 'chat_mencion',
      titulo: 'Te mencionaron en un chat',
      mensaje: msg.body_text ?? '',
      chat_canal_id: canal_id,
      data: { mensaje_id: msg.id },
      destinos: destinosMention
    }, user);
  }

  const restantes = destinosAll.filter(d => !mentionedUserIds.includes(d.user_id));
  if (restantes.length) {
    await createNotif({
      tipo_codigo: 'chat_mensaje',
      titulo: 'Nuevo mensaje',
      mensaje: msg.body_text ?? '',
      chat_canal_id: canal_id,
      data: { mensaje_id: msg.id },
      destinos: restantes
    }, user);
  }
}

function _extractMentions(msg) {
  const set = new Set();
  const j = msg?.body_json;
  if (j?.mentions && Array.isArray(j.mentions)) {
    for (const u of j.mentions) if (Number.isInteger(u)) set.add(u);
  }
  const t = msg?.body_text || '';
  const re = /\B@user:(\d+)\b/g; // patrón @user:123
  for (const m of t.matchAll(re)) set.add(parseInt(m[1],10));
  return [...set];
}
// /backend/src/modules/chat/repositories/channels.repo.js
import { Op, literal } from 'sequelize';
import { initModels } from '../../../models/registry.js';
const m = await initModels();

async function idByCodigo(model, codigo, t) {
  const row = await model.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
}

export async function catalogos() {
  const [canalTipos, rolTipos] = await Promise.all([
    m.ChatCanalTipo.findAll({ order: [['codigo','ASC']] }),
    m.ChatRolTipo.findAll({ order: [['codigo','ASC']] })
  ]);
  return { canalTipos, rolTipos };
}

export async function listCanales(params, user, t) {
  const where = {};
  if (!params.include_archivados) where.is_archivado = false;

  switch (params.scope) {
    case 'mine':
      return m.ChatCanal.findAll({
        where,
        include: [{
          model: m.ChatCanalMiembro, as: 'miembros', required: true,
          where: { user_id: user.id }
        }, { model: m.ChatCanalTipo, as: 'tipo', attributes: ['codigo','nombre'] }],
        order: [['updated_at','DESC']],
        transaction: t
      });
    case 'canal':
      where.id = params.canal_id;
      break;
    case 'celula':
      where.celula_id = params.celula_id;
      break;
    case 'cliente':
      where.cliente_id = params.cliente_id;
      break;
    case 'dm': {
      where.tipo_id = await idByCodigo(m.ChatCanalTipo,'dm',t);
      if (params.q) where.nombre = { [Op.iLike]: `%${params.q}%` };
      return m.ChatCanal.findAll({
        where,
        include: [
          {
            model: m.ChatCanalMiembro, as: 'miembros',
            required: true, where: { user_id: user.id }, attributes: []
          },
          { model: m.ChatCanalTipo, as: 'tipo', attributes: ['codigo','nombre'] }
        ],
        order: [['updated_at','DESC']],
        transaction: t
      });
    }
    case 'all':
    default:
      // without extra filters
      break;
  }
  if (params.q) where.nombre = { [Op.iLike]: `%${params.q}%` };

  return m.ChatCanal.findAll({
    where,
    include: [{ model: m.ChatCanalTipo, as: 'tipo', attributes: ['codigo','nombre'] }],
    order: [['updated_at','DESC']],
    transaction: t
  });
}

export async function createOrUpdateCanal(payload, user, t) {
  const tipo_id = await idByCodigo(m.ChatCanalTipo, payload.tipo_codigo, t);
  if (!tipo_id) throw Object.assign(new Error('tipo_codigo inválido'), { status: 400 });

  const base = {
    tipo_id,
    nombre: payload.nombre ?? null,
    slug: payload.slug ?? null,
    topic: payload.topic ?? null,
    descripcion: payload.descripcion ?? null,
    is_privado: payload.is_privado ?? true,
    is_archivado: false,
    only_mods_can_post: payload.only_mods_can_post ?? false,
    slowmode_seconds: payload.slowmode_seconds ?? 0,
    celula_id: payload.celula_id ?? null,
    cliente_id: payload.cliente_id ?? null,
    created_by_user_id: user.id
  };

  let canal;
  if (payload.id) {
    canal = await m.ChatCanal.findByPk(payload.id, { transaction: t });
    if (!canal) throw Object.assign(new Error('Canal no encontrado'), { status: 404 });
    await canal.update(base, { transaction: t });
  } else {
    // ¿Existe DM previo entre creador e invitado?
    if (payload.tipo_codigo === 'dm') {
      const invitee = payload.invited_user_ids?.[0];
      if (!invitee) throw Object.assign(new Error('Falta invitado para DM'), { status: 400 });
      const dmTipo = await idByCodigo(m.ChatCanalTipo, 'dm', t);

      // ✅ requiere ambos usuarios (creador e invitado) en la membresía (COUNT DISTINCT = 2)
      const prev = await m.ChatCanal.findOne({
        where: { tipo_id: dmTipo, is_archivado: false },
        include: [{
          model: m.ChatCanalMiembro, as: 'miembros',
          required: true, attributes: [],
          where: { user_id: { [Op.in]: [user.id, invitee] } }
        }],
        attributes: ['id'],
        group: ['ChatCanal.id'],
        having: literal('COUNT(DISTINCT "miembros"."user_id") = 2'),
        transaction: t,
        subQuery: false
      });

      if (prev) {
        canal = await m.ChatCanal.findByPk(prev.id, { transaction: t });
      }
    }

    if (!canal) canal = await m.ChatCanal.create(base, { transaction: t });

    // Membresía inicial (owner para creador, member para invitados)
    const rolOwner = await idByCodigo(m.ChatRolTipo,'owner', t);
    const rolMember = await idByCodigo(m.ChatRolTipo,'member', t);

    await m.ChatCanalMiembro.findOrCreate({
      where: { canal_id: canal.id, user_id: user.id },
      defaults: { rol_id: rolOwner, is_mute: false, notif_level: 'all', joined_at: new Date() },
      transaction: t
    });

    for (const uid of (payload.invited_user_ids || [])) {
      if (uid === user.id) continue;
      await m.ChatCanalMiembro.findOrCreate({
        where: { canal_id: canal.id, user_id: uid },
        defaults: { rol_id: rolMember, is_mute: false, notif_level: 'all', joined_at: new Date() },
        transaction: t
      });
    }
  }
  return canal;
}

export async function archiveCanal(canal_id, on, t) {
  const row = await m.ChatCanal.findByPk(canal_id, { transaction: t });
  if (!row) throw Object.assign(new Error('Canal no encontrado'), { status: 404 });
  await row.update({ is_archivado: !!on }, { transaction: t });
  return row;
}

export async function updateCanalSettings(canal_id, settings, t) {
  const row = await m.ChatCanal.findByPk(canal_id, { transaction: t });
  if (!row) throw Object.assign(new Error('Canal no encontrado'), { status: 404 });
  await row.update({
    only_mods_can_post: settings.only_mods_can_post ?? row.only_mods_can_post,
    slowmode_seconds: settings.slowmode_seconds ?? row.slowmode_seconds,
    topic: settings.topic ?? row.topic,
    is_privado: settings.is_privado ?? row.is_privado
  }, { transaction: t });
  return row;
}

export async function listMiembros(canal_id, t) {
  return m.ChatCanalMiembro.findAll({
    where: { canal_id },
    include: [
      { model: m.ChatRolTipo, as: 'rol', attributes: ['codigo','nombre'] },
      { model: m.User, as: 'user', attributes: ['id','email'] },
      { model: m.Feder, as: 'feder', attributes: ['id','nombre'] }
    ],
    order: [['id','ASC']],
    transaction: t
  });
}

export async function addOrUpdateMiembro(canal_id, payload, t) {
  const rol_id = payload.rol_codigo
    ? await idByCodigo(m.ChatRolTipo, payload.rol_codigo, t)
    : null;

  const [row, created] = await m.ChatCanalMiembro.findOrCreate({
    where: { canal_id, user_id: payload.user_id },
    defaults: {
      rol_id: rol_id ?? await idByCodigo(m.ChatRolTipo,'member', t),
      is_mute: payload.is_mute ?? false,
      notif_level: payload.notif_level ?? 'all',
      joined_at: new Date()
    },
    transaction: t
  });

  if (!created) {
    await row.update({
      rol_id: rol_id ?? row.rol_id,
      is_mute: payload.is_mute ?? row.is_mute,
      notif_level: payload.notif_level ?? row.notif_level
    }, { transaction: t });
  }
  return row;
}

export async function removeMiembro(canal_id, user_id, t) {
  const row = await m.ChatCanalMiembro.findOne({ where: { canal_id, user_id }, transaction: t });
  if (!row) throw Object.assign(new Error('Miembro no encontrado'), { status: 404 });
  await row.destroy({ transaction: t });
  return { removed: true };
}

export async function joinCanal(canal_id, user_id, t) {
  const rolMember = await idByCodigo(m.ChatRolTipo,'member', t);
  const [row] = await m.ChatCanalMiembro.findOrCreate({
    where: { canal_id, user_id },
    defaults: { rol_id: rolMember, is_mute: false, notif_level: 'all', joined_at: new Date() },
    transaction: t
  });
  return row;
}

export async function leaveCanal(canal_id, user_id, t) {
  const row = await m.ChatCanalMiembro.findOne({ where: { canal_id, user_id }, transaction: t });
  if (!row) return { left: false };
  await row.destroy({ transaction: t });
  return { left: true };
}

export async function getCanalWithMiembro(canal_id, user_id, t) {
  const canal = await m.ChatCanal.findByPk(canal_id, {
    include: [{ model: m.ChatCanalMiembro, as: 'miembros', where: { user_id }, required: false }],
    transaction: t
  });
  return canal;
}
// /backend/src/modules/chat/repositories/invitations.repo.js
import crypto from 'crypto';
import { initModels } from '../../../models/registry.js';
const m = await initModels();

export async function createInvitation(canal_id, body, invited_by_user_id, t) {
  const token = crypto.randomBytes(24).toString('hex');
  const row = await m.ChatInvitacion.create({
    canal_id,
    invited_user_id: body.invited_user_id ?? null,
    invited_email: body.invited_email ?? null,
    invited_by_user_id,
    status: 'pending',
    token,
    expires_at: new Date(Date.now() + 7*24*3600*1000)
  }, { transaction: t });
  return row;
}

export async function acceptInvitation(token, user_id, t) {
  const inv = await m.ChatInvitacion.findOne({ where: { token, status: 'pending' }, transaction: t });
  if (!inv) throw Object.assign(new Error('Invitación no válida'), { status: 404 });

  // Si la invitación era por email y no coincide con el usuario autenticado, igual permitimos si es miembro del dominio
  if (inv.invited_user_id && inv.invited_user_id !== user_id) {
    throw Object.assign(new Error('Esta invitación no es para vos'), { status: 403 });
  }

  // Agregar como member
  const rol = await m.ChatRolTipo.findOne({ where: { codigo: 'member' }, transaction: t });
  await m.ChatCanalMiembro.findOrCreate({
    where: { canal_id: inv.canal_id, user_id },
    defaults: { rol_id: rol?.id, joined_at: new Date(), is_mute: false, notif_level: 'all' },
    transaction: t
  });

  await inv.update({ status: 'accepted', responded_at: new Date(), invited_user_id: user_id }, { transaction: t });
  return inv;
}

export async function declineInvitation(token, user_id, t) {
  const inv = await m.ChatInvitacion.findOne({ where: { token, status: 'pending' }, transaction: t });
  if (!inv) throw Object.assign(new Error('Invitación no válida'), { status: 404 });
  await inv.update({ status: 'declined', responded_at: new Date(), invited_user_id: user_id }, { transaction: t });
  return inv;
}
// /backend/src/modules/chat/repositories/meetings.repo.js
import { initModels } from '../../../models/registry.js';
const m = await initModels();

async function idByCodigo(model, codigo, t) {
  const row = await model.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
}

async function resolveCalendarioForCanal(canal, t) {
  // Busca un calendario local apropiado según cliente/célula, si no Global
  if (canal.celula_id) {
    const tipo_id = await idByCodigo(m.CalendarioTipo, 'celula', t);
    const cal = await m.CalendarioLocal.findOne({
      where: { tipo_id, celula_id: canal.celula_id, is_activo: true },
      transaction: t
    });
    if (cal) return cal;
  }
  if (canal.cliente_id) {
    const tipo_id = await idByCodigo(m.CalendarioTipo, 'cliente', t);
    const cal = await m.CalendarioLocal.findOne({
      where: { tipo_id, cliente_id: canal.cliente_id, is_activo: true },
      transaction: t
    });
    if (cal) return cal;
  }
  const tipo_id = await idByCodigo(m.CalendarioTipo, 'global', t);
  return m.CalendarioLocal.findOne({ where: { tipo_id, is_activo: true }, transaction: t });
}

export async function scheduleMeeting(canal_id, payload, creator_user_id, t) {
  const canal = await m.ChatCanal.findByPk(canal_id, { transaction: t });
  if (!canal) throw Object.assign(new Error('Canal no encontrado'), { status: 404 });

  const cal = await resolveCalendarioForCanal(canal, t);
  if (!cal) throw Object.assign(new Error('No hay calendario disponible'), { status: 400 });

  // Tipo evento: preferir 'reunion', fallback 'interno'
  let tipo_id = await idByCodigo(m.EventoTipo, 'reunion', t);
  if (!tipo_id) tipo_id = await idByCodigo(m.EventoTipo, 'interno', t);
  const vis_id = await idByCodigo(m.VisibilidadTipo, 'equipo', t);

  const evento = await m.Evento.create({
    calendario_local_id: cal.id,
    tipo_id,
    titulo: payload.titulo,
    descripcion: `Reunión creada desde canal #${canal.slug || canal.nombre || canal.id}`,
    lugar: null,
    all_day: false,
    starts_at: payload.starts_at,
    ends_at: payload.ends_at,
    rrule: null,
    visibilidad_id: vis_id,
    color: null,
    asistencia_registro_id: null,
    ausencia_id: null,
    tarea_id: null,
    created_by_user_id: creator_user_id,
    updated_by_user_id: creator_user_id
  }, { transaction: t });

  const asisTipo = await idByCodigo(m.AsistenteTipo, 'feder', t);

  // Asistentes: todos los miembros con feder_id
  const miembros = await m.ChatCanalMiembro.findAll({ where: { canal_id }, transaction: t });
  for (const mm of miembros) {
    if (!mm.feder_id) continue;
    await m.EventoAsistente.create({
      evento_id: evento.id, tipo_id: asisTipo, feder_id: mm.feder_id, nombre: null, respuesta: 'needsAction'
    }, { transaction: t });
  }

  const meet = await m.ChatMeeting.create({
    canal_id, provider_codigo: payload.provider_codigo,
    external_meeting_id: null, join_url: null,
    created_by_user_id: creator_user_id,
    starts_at: payload.starts_at, ends_at: payload.ends_at,
    evento_id: evento.id, mensaje_id: null
  }, { transaction: t });

  return { evento, meet };
}
// /backend/src/modules/chat/repositories/messages.repo.js
import { Op } from 'sequelize';
import { initModels } from '../../../models/registry.js';
const m = await initModels();

async function _canalMember(canal_id, user_id, t) {
  return m.ChatCanalMiembro.findOne({ where: { canal_id, user_id }, transaction: t });
}

async function _rolCodigoById(rol_id, t) {
  const row = await m.ChatRolTipo.findByPk(rol_id, { transaction: t });
  return row?.codigo ?? null;
}

export async function listMessages(canal_id, params, user, t) {
  const where = { canal_id };
  if (params.before_id) where.id = { [Op.lt]: params.before_id };
  if (params.after_id) where.id = { [Op.gt]: params.after_id };
  if (params.thread_root_id) where.parent_id = params.thread_root_id ?? null;

  const rows = await m.ChatMensaje.findAll({
    where,
    include: [
      { model: m.User, as: 'autor', attributes: ['id','email'] },
      { model: m.Feder, as: 'feder', attributes: ['id','nombre'] },
      { model: m.ChatAdjunto, as: 'adjuntos' },
      { model: m.ChatReaccion, as: 'reacciones' },
      { model: m.ChatLinkPreview, as: 'linkPreviews' },
      { model: m.ChatMensaje, as: 'parent', attributes: ['id'] }
    ],
    order: [['id','DESC']],
    limit: params.limit,
    transaction: t
  });

  // Marcar "delivered" para este usuario (no debe romper el GET)
  try {
    await markDelivered(rows.map(r => r.id), user.id, t);
  } catch (e) {
    console.error('markDelivered error:', e?.message || e);
  }

  return rows;
}

export async function createMessage(canal, payload, user, t) {
  // Reglas: only_mods_can_post / slowmode
  const me = await _canalMember(canal.id, user.id, t);
  if (!me) throw Object.assign(new Error('No sos miembro del canal'), { status: 403 });

  if (canal.only_mods_can_post) {
    const rol = await _rolCodigoById(me.rol_id, t);
    if (!['owner','admin','mod'].includes(rol)) {
      throw Object.assign(new Error('Sólo moderadores pueden postear en este canal'), { status: 403 });
    }
  }

  if ((canal.slowmode_seconds ?? 0) > 0) {
    const last = await m.ChatMensaje.findOne({
      where: { canal_id: canal.id, user_id: user.id },
      order: [['id','DESC']],
      transaction: t
    });
    if (last) {
      const secs = Math.floor((Date.now() - new Date(last.created_at).getTime())/1000);
      if (secs < canal.slowmode_seconds) {
        throw Object.assign(new Error(`Slowmode activo: esperá ${canal.slowmode_seconds - secs}s`), { status: 429 });
      }
    }
  }

  const row = await m.ChatMensaje.create({
    canal_id: canal.id,
    user_id: user.id,
    feder_id: me.feder_id ?? null,
    parent_id: payload.parent_id ?? null,
    client_msg_id: payload.client_msg_id ?? null,
    body_text: payload.body_text ?? null,
    body_json: payload.body_json ?? null,
    created_at: new Date(),
    updated_at: new Date()
  }, { transaction: t });

  if (Array.isArray(payload.attachments) && payload.attachments.length) {
    const items = payload.attachments.map(a => ({ ...a, mensaje_id: row.id }));
    await m.ChatAdjunto.bulkCreate(items, { transaction: t });
  }

  // Si es reply, actualizar contadores del parent
  if (row.parent_id) {
    const parent = await m.ChatMensaje.findByPk(row.parent_id, { transaction: t });
    if (parent) {
      await parent.update({
        reply_count: (parent.reply_count ?? 0) + 1,
        last_reply_at: new Date()
      }, { transaction: t });
    }
  }

  // Pre-crear registros de link preview (resolución posterior/worker)
  const urls = extractUrls(payload.body_text || '');
  if (urls.length) {
    await m.ChatLinkPreview.bulkCreate(urls.map(u => ({ mensaje_id: row.id, url: u })), { transaction: t });
  }

  return m.ChatMensaje.findByPk(row.id, {
    include: [
      { model: m.User, as: 'autor', attributes: ['id','email'] },
      { model: m.Feder, as: 'feder', attributes: ['id','nombre'] },
      { model: m.ChatAdjunto, as: 'adjuntos' }
    ],
    transaction: t
  });
}

export async function editMessage(id, payload, user, t) {
  const row = await m.ChatMensaje.findByPk(id, { include: [{ model: m.ChatCanal, as: 'canal' }], transaction: t });
  if (!row) throw Object.assign(new Error('Mensaje no encontrado'), { status: 404 });

  // Sólo autor o mod+
  const me = await _canalMember(row.canal_id, user.id, t);
  const myRole = me ? await _rolCodigoById(me.rol_id, t) : null;
  const canMod = ['owner','admin','mod'].includes(myRole);
  if (row.user_id !== user.id && !canMod) {
    throw Object.assign(new Error('No podés editar este mensaje'), { status: 403 });
  }

  // version
  const lastVer = await m.ChatMensajeEditHist.max('version_num', { where: { mensaje_id: row.id }, transaction: t }) || 0;
  await m.ChatMensajeEditHist.create({
    mensaje_id: row.id, version_num: lastVer + 1,
    body_text: row.body_text, body_json: row.body_json,
    edited_by_user_id: user.id
  }, { transaction: t });

  await row.update({
    body_text: payload.body_text ?? row.body_text,
    body_json: payload.body_json ?? row.body_json,
    is_edited: true, edited_at: new Date(), updated_at: new Date()
  }, { transaction: t });

  return row;
}

export async function deleteMessage(id, user, t) {
  const row = await m.ChatMensaje.findByPk(id, { include: [{ model: m.ChatCanal, as: 'canal' }], transaction: t });
  if (!row) throw Object.assign(new Error('Mensaje no encontrado'), { status: 404 });

  const me = await _canalMember(row.canal_id, user.id, t);
  const myRole = me ? await _rolCodigoById(me.rol_id, t) : null;
  const canMod = ['owner','admin','mod'].includes(myRole);
  if (row.user_id !== user.id && !canMod) {
    throw Object.assign(new Error('No podés borrar este mensaje'), { status: 403 });
  }

  await row.update({ deleted_at: new Date(), deleted_by_user_id: user.id }, { transaction: t });
  return { deleted: 1 };
}

export async function toggleReaction(mensaje_id, user_id, emoji, on, t) {
  const where = { mensaje_id, user_id, emoji };
  const exists = await m.ChatReaccion.findOne({ where, transaction: t });
  if (on) {
    if (!exists) await m.ChatReaccion.create({ ...where }, { transaction: t });
    return { on: true };
  } else {
    if (exists) await exists.destroy({ transaction: t });
    return { on: false };
  }
}

export async function togglePin(canal_id, mensaje_id, user_id, on, orden, t) {
  const where = { canal_id, mensaje_id };
  const prev = await m.ChatPin.findOne({ where, transaction: t });
  if (on) {
    if (prev) return prev;
    const maxOrden = (await m.ChatPin.max('pin_orden', { where: { canal_id }, transaction: t })) || 0;
    return m.ChatPin.create({
      canal_id, mensaje_id, pinned_by_user_id: user_id, pin_orden: orden ?? (maxOrden + 1)
    }, { transaction: t });
  } else {
    if (prev) await prev.destroy({ transaction: t });
    return { on: false };
  }
}

export async function toggleSaved(mensaje_id, user_id, on, t) {
  const where = { mensaje_id, user_id };
  const prev = await m.ChatSavedMessage.findOne({ where, transaction: t });
  if (on) {
    if (!prev) await m.ChatSavedMessage.create({ ...where }, { transaction: t });
    return { on: true };
  } else {
    if (prev) await prev.destroy({ transaction: t });
    return { on: false };
  }
}

export async function followThread(root_msg_id, user_id, on, t) {
  const where = { root_msg_id, user_id };
  const prev = await m.ChatThreadFollow.findOne({ where, transaction: t });
  if (on) {
    if (!prev) await m.ChatThreadFollow.create({ ...where }, { transaction: t });
    return { on: true };
  } else {
    if (prev) await prev.destroy({ transaction: t });
    return { on: false };
  }
}

export async function setRead(canal_id, user_id, last_read_msg_id, t) {
  const row = await m.ChatCanalMiembro.findOne({ where: { canal_id, user_id }, transaction: t });
  if (!row) throw Object.assign(new Error('No sos miembro del canal'), { status: 404 });

  await row.update({ last_read_msg_id, last_read_at: new Date() }, { transaction: t });

  // Read receipt del último
  await m.ChatReadReceipt.findOrCreate({
    where: { mensaje_id: last_read_msg_id, user_id },
    defaults: { read_at: new Date() },
    transaction: t
  });
  return row;
}

// ✅ Inserción robusta de delivered_at (sin string hacks) y protegida por try/catch
export async function markDelivered(mensaje_ids, user_id, t) {
  if (!Array.isArray(mensaje_ids) || mensaje_ids.length === 0) return 0;

  const values = mensaje_ids
    .filter((id) => Number.isFinite(Number(id)))
    .map((id) => `(${Number(id)}, ${Number(user_id)}, now())`)
    .join(',');

  if (!values) return 0;

  try {
    await m.sequelize.query(`
      INSERT INTO "ChatDelivery"(mensaje_id, user_id, delivered_at)
      VALUES ${values}
      ON CONFLICT (mensaje_id, user_id) DO NOTHING;
    `, { transaction: t });
  } catch (e) {
    console.error('markDelivered error:', e?.message || e);
  }
  return mensaje_ids.length;
}

export function extractUrls(text) {
  if (!text) return [];
  const re = /\bhttps?:\/\/[^\s<>"']+/gi;
  return [...text.matchAll(re)].map(m => m[0]).slice(0, 10);
}
// /backend/src/modules/chat/repositories/presence.repo.js
import { initModels } from '../../../models/registry.js';
const m = await initModels();

export async function setPresence(user_id, status, device, t) {
  const [row, created] = await m.ChatPresence.findOrCreate({
    where: { user_id },
    defaults: { status, device: device ?? null, last_seen_at: new Date(), updated_at: new Date() },
    transaction: t
  });
  if (!created) await row.update({ status, device: device ?? row.device, last_seen_at: new Date(), updated_at: new Date() }, { transaction: t });
  return row;
}

export async function setTyping(canal_id, user_id, ttl_seconds, on, t) {
  if (on) {
    const expires = new Date(Date.now() + ttl_seconds * 1000);
    const [row, created] = await m.ChatTyping.findOrCreate({
      where: { canal_id, user_id },
      defaults: { started_at: new Date(), expires_at: expires },
      transaction: t
    });
    if (!created) await row.update({ started_at: new Date(), expires_at: expires }, { transaction: t });
    return { on: true, until: expires };
  } else {
    await m.ChatTyping.destroy({ where: { canal_id, user_id }, transaction: t });
    return { on: false };
  }
}
// /backend/src/modules/chat/realtime/publisher.js
import { publishMany } from '../../realtime/bus.js';
import { initModels } from '../../../models/registry.js';
const m = await initModels();

// Devuelve user_ids miembros del canal (opcionalmente filtrando autor)
export async function getChannelMemberUserIds(canal_id, { except_user_id = null } = {}, t) {
  const rows = await m.ChatCanalMiembro.findAll({
    where: { canal_id },
    attributes: ['user_id'],
    transaction: t
  });
  const ids = rows.map(r => r.user_id);
  return except_user_id ? ids.filter(id => id !== except_user_id) : ids;
}

// Publicadores (convención: type + payload)
export async function publishMessageCreated(canal_id, message, { except_user_id } = {}) {
  const userIds = await getChannelMemberUserIds(canal_id, { except_user_id });
  return publishMany(userIds, { type: 'chat.message.created', canal_id, message });
}

export async function publishMessageEdited(canal_id, message, { except_user_id } = {}) {
  const userIds = await getChannelMemberUserIds(canal_id, { except_user_id });
  return publishMany(userIds, { type: 'chat.message.edited', canal_id, message });
}

export async function publishMessageDeleted(canal_id, mensaje_id, { except_user_id } = {}) {
  const userIds = await getChannelMemberUserIds(canal_id, { except_user_id });
  return publishMany(userIds, { type: 'chat.message.deleted', canal_id, mensaje_id });
}

export async function publishReactionUpdated(canal_id, mensaje_id, emoji, on, user_id) {
  const userIds = await getChannelMemberUserIds(canal_id);
  return publishMany(userIds, { type: 'chat.message.reaction', canal_id, mensaje_id, emoji, on, user_id });
}

export async function publishPinUpdated(canal_id, mensaje_id, on, orden) {
  const userIds = await getChannelMemberUserIds(canal_id);
  return publishMany(userIds, { type: 'chat.message.pin', canal_id, mensaje_id, on, orden });
}

export async function publishSavedUpdated(canal_id, mensaje_id, on, user_id) {
  const userIds = await getChannelMemberUserIds(canal_id);
  return publishMany(userIds, { type: 'chat.message.saved', canal_id, mensaje_id, on, user_id });
}

export async function publishRead(canal_id, user_id, last_read_msg_id) {
  const userIds = await getChannelMemberUserIds(canal_id);
  return publishMany(userIds, { type: 'chat.channel.read', canal_id, user_id, last_read_msg_id });
}

export async function publishTyping(canal_id, user_id, on, until) {
  const userIds = await getChannelMemberUserIds(canal_id, { except_user_id: user_id });
  return publishMany(userIds, { type: 'chat.channel.typing', canal_id, user_id, on, until });
}

// (Opcional) presencia global
export async function publishPresence(user_id, status, device) {
  // Podrías mapear canales por usuario para enviar sólo a interesados
  return publishMany([], { type: 'chat.presence', user_id, status, device });
}

export async function publishChannelUpdated(canal) {
  const userIds = await getChannelMemberUserIds(canal.id);
  return publishMany(userIds, { type: 'chat.channel.updated', canal });
}

export async function publishChannelArchived(canal_id, on) {
  const userIds = await getChannelMemberUserIds(canal_id);
  return publishMany(userIds, { type: 'chat.channel.archived', canal_id, on });
}

export async function publishMemberChanged(canal_id, member_user_id, action) {
  const userIds = await getChannelMemberUserIds(canal_id);
  return publishMany(userIds, { type: 'chat.channel.member', canal_id, member_user_id, action });
}

export async function publishInvitation(canal_id, invitation) {
  const userIds = await getChannelMemberUserIds(canal_id);
  return publishMany(userIds, { type: 'chat.channel.invitation', canal_id, invitation });
}

export async function publishMeetingScheduled(canal_id, evento, meet) {
  const userIds = await getChannelMemberUserIds(canal_id);
  return publishMany(userIds, { type: 'chat.channel.meeting', canal_id, evento, meet });
}
