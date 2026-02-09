// /backend/src/modules/chat/services/chat.service.js
import { Op } from 'sequelize';
import { initModels } from '../../../models/registry.js';
import {
  catalogos as repoCatalogos, listCanales, createOrUpdateCanal,
  archiveCanal, updateCanalSettings, deleteCanal, listMiembros, addOrUpdateMiembro,
  removeMiembro, joinCanal, leaveCanal, getCanalWithMiembro, listDmCandidates,
} from '../repositories/channels.repo.js';

import {
  listMessages, createMessage, editMessage, deleteMessage,
  toggleReaction, togglePin, toggleSaved, followThread, setRead, setReadAll, listPins
} from '../repositories/messages.repo.js';

import { setPresence, setTyping } from '../repositories/presence.repo.js';
import { createInvitation, acceptInvitation, declineInvitation } from '../repositories/invitations.repo.js';
import { scheduleMeeting } from '../repositories/meetings.repo.js';

import { svcCreate as createNotif } from '../../notificaciones/services/notificaciones.service.js';
import { saveMessageFiles, removeMessageFiles } from '../chat.storage.js';

// 🔊 Publishers SSE (tiempo real)
import {
  publishMessageCreated, publishMessageEdited, publishMessageDeleted,
  publishReactionUpdated, publishPinUpdated, publishSavedUpdated,
  publishRead, publishTyping, publishChannelUpdated, publishChannelArchived,
  publishMemberChanged, publishInvitation, publishMeetingScheduled, publishChannelDeleted,
  // (opcional) publishPresence
} from '../realtime/publisher.js';

import { sequelize } from '../../../core/db.js';
import { logger } from '../../../core/logger.js';
const mReg = await initModels();

// -------- Catálogos
export const svcCatalogos = () => repoCatalogos();

export const svcListDmCandidates = (user) => listDmCandidates(user.id);

// -------- Canales
export const svcListCanales = (q, user) => listCanales(q, user);

export const svcUpsertCanal = async (payload, user) => {
  const start = Date.now();
  const t = await sequelize.transaction();
  let out;
  try {
    out = await createOrUpdateCanal(payload, user, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }
  const afterDb = Date.now();

  const row = out.canal;

  // 🔊 realtime (siempre)
  try { await publishChannelUpdated(row); } catch (err) { console.error('sse channel updated', err); }
  const afterSse = Date.now();

  // 🔔 notificar SOLO si:
  //  - fue creado OR
  //  - hubo nuevos miembros agregados en este upsert
  try {
    if (out.created || (out.addedUserIds?.length)) {
      const miembros = await mReg.ChatCanalMiembro.findAll({ where: { canal_id: row.id } });
      const destinos = miembros
        .filter(mm =>
          mm.user_id !== user.id &&
          (out.created || out.addedUserIds.includes(mm.user_id))
        )
        .map(mm => ({ user_id: mm.user_id, feder_id: mm.feder_id ?? null }));

      if (destinos.length) {
        await createNotif({
          tipo_codigo: 'chat_mensaje', // o 'chat_canal'
          titulo: `Te agregaron a ${row.tipo_id ? 'un canal' : 'un chat'}`,
          mensaje: row.nombre || '',
          chat_canal_id: row.id,
          destinos
        }, user);
      }
    }
  } catch (e) { console.error('notif upsert canal', e); }
  const end = Date.now();

  logger.info({
    msg: 'svcUpsertCanal timing',
    total_ms: end - start,
    db_ms: afterDb - start,
    sse_ms: afterSse - afterDb,
    notif_ms: end - afterSse,
    canal_id: row.id,
    added_members: out.addedUserIds?.length || 0
  });

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

export const svcDeleteCanal = async (id, user) => {
  // 1. Recolectar miembros antes de borrar para el realtime
  const miembros = await listMiembros(id);
  const memberUserIds = miembros.map(m => m.user_id);

  const t = await sequelize.transaction();
  let r;
  try {
    // TODO: Validar que sea Owner o NivelA/Admin
    r = await deleteCanal(id, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // 🔊 Real-time: canal eliminado
  try { await publishChannelDeleted(id, memberUserIds); } catch (err) { console.error('sse channel deleted', err); }

  return r;
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
export const svcListMessages = async (canal_id, q, user) => {
  const canal = await getCanalWithMiembro(canal_id, user.id);
  if (!canal || !(canal.miembros?.length > 0)) {
    const err = new Error('No sos miembro del canal');
    err.status = 403;
    throw err;
  }
  const list = await listMessages(canal_id, q, user);
  // cada item ya tendrá adjuntos si el repo los incluye; si no, los pegamos nosotros (ver repo)
  return list;
};

export const svcSearchMessages = async (canal_id, query, user) => {
  // Verificar que sea miembro del canal
  const canal = await getCanalWithMiembro(canal_id, user.id);
  if (!canal || !(canal.miembros?.length > 0)) {
    const err = new Error('No sos miembro del canal');
    err.status = 403;
    throw err;
  }

  // Búsqueda simple usando ILIKE en PostgreSQL
  const cid = Number(canal_id);
  const qStr = String(query || '').trim();

  const results = await mReg.ChatMensaje.findAll({
    where: {
      canal_id: cid,
      deleted_at: { [Op.is]: null },
      body_text: {
        [Op.iLike]: `%${qStr}%`
      }
    },
    include: [
      {
        model: mReg.User,
        as: 'autor',
        attributes: ['id', 'email'],
        include: [
          {
            model: mReg.Feder,
            as: 'feder',
            attributes: ['id', 'nombre', 'apellido', 'avatar_url']
          }
        ]
      }
    ],
    order: [['created_at', 'DESC']],
    limit: 50
  });

  return { results: results.map(r => r.toJSON()), total: results.length };
};

// --- crear mensaje + adjuntos embebidos
export const svcPostMessage = async (canal_id, payload, user, files = []) => {
  const t = await sequelize.transaction();
  let msg, canal;
  try {
    canal = await getCanalWithMiembro(canal_id, user.id, t);
    if (!canal) throw Object.assign(new Error('Canal no encontrado'), { status: 404 });

    msg = await createMessage(canal, payload, user, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // Adjuntos fuera de la TX
  if (files?.length) {
    try {
      const adjuntos = await saveMessageFiles(canal_id, msg.id, files);
      msg = { ...msg.toJSON?.() ?? msg, adjuntos };
    } catch (err) {
      console.error('[svcPostMessage] adjuntos', err);
    }
  }

  try { await publishMessageCreated(canal_id, msg, { except_user_id: user.id }); } catch (err) {
    console.error('sse post message', err);
  }

  try { await _notifyNewMessage(canal_id, msg, user); } catch (e) {
    console.error('notif chat post', e);
  }

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

export const svcForwardMessage = async (msg_id, target_canal_ids, user) => {
  const originalMsg = await mReg.ChatMensaje.findByPk(msg_id, {
    include: [{ model: mReg.ChatAdjunto, as: 'adjuntos' }]
  });
  if (!originalMsg) throw Object.assign(new Error('Mensaje original no encontrado'), { status: 404 });

  const results = [];
  for (const canal_id of target_canal_ids) {
    const t = await sequelize.transaction();
    try {
      const canal = await getCanalWithMiembro(canal_id, user.id, t);
      if (!canal) throw Object.assign(new Error(`No tenés acceso al canal ${canal_id}`), { status: 403 });

      const payload = {
        body_text: originalMsg.body_text,
        body_json: {
          ...(originalMsg.body_json || {}),
          forward_data: {
            is_forwarded: true,
            original_msg_id: originalMsg.id,
            original_author_id: originalMsg.user_id,
            forwarded_by_id: user.id,
            forwarded_at: new Date()
          }
        },
        attachments: originalMsg.adjuntos?.map(a => ({
          file_url: a.file_url,
          file_name: a.file_name,
          mime_type: a.mime_type,
          size_bytes: a.size_bytes,
          width: a.width,
          height: a.height,
          duration_sec: a.duration_sec
        }))
      };

      const newMsg = await createMessage(canal, payload, user, t);
      await t.commit();
      results.push(newMsg);

      // Realtime y Notif
      try {
        await publishMessageCreated(canal_id, newMsg, { except_user_id: user.id });
        await _notifyNewMessage(canal_id, newMsg, user);
      } catch (err) { console.error('[svcForwardMessage] realtime/notif', err); }

    } catch (e) {
      await t.rollback();
      throw e;
    }
  }
  return results;
};

export const svcDeleteMessage = async (id, user) => {
  const t = await sequelize.transaction();
  let r, msg;
  try {
    msg = await mReg.ChatMensaje.findByPk(id, { attributes: ['id', 'canal_id'] });
    r = await deleteMessage(id, user, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  if (msg?.canal_id) {
    // borra adjuntos
    try { await removeMessageFiles(msg.canal_id, id); } catch (e) {
      console.warn('[svcDeleteMessage] remove files', e?.message);
    }
    // realtime
    try { await publishMessageDeleted(msg.canal_id, id, { except_user_id: user.id }); } catch (err) {
      console.error('sse delete msg', err);
    }
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

export const svcListPins = async (canal_id, user) => {
  const canal = await getCanalWithMiembro(canal_id, user.id);
  if (!canal || !(canal.miembros?.length > 0)) {
    const err = new Error('No sos miembro del canal');
    err.status = 403;
    throw err;
  }
  return listPins(canal_id);
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

export const svcSetReadAll = async (user) => {
  const t = await sequelize.transaction();
  try {
    await setReadAll(user.id, t);
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }
  return { ok: true };
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

  // nombre del remitente
  let senderName = null;
  try {
    const fed = await mReg.Feder.findOne({ where: { user_id: user.id }, attributes: ['nombre', 'apellido'] });
    senderName = [fed?.nombre, fed?.apellido].filter(Boolean).join(' ').trim();
  } catch { }
  if (!senderName) senderName = user?.email || `Usuario ${user?.id}`;

  // nombre canal/grupo (si existe)
  const canal = await mReg.ChatCanal.findByPk(canal_id, { attributes: ['nombre'], include: [{ model: mReg.ChatCanalTipo, as: 'tipo', attributes: ['codigo'] }] });
  const canalNice = canal?.nombre ? ` en ${canal.nombre}` : '';

  // body: “Enzo: Hola …” (truncado para no cortar en OS)
  const rawText = msg.body_text || (msg?.adjuntos?.length ? '📎 Archivo adjunto' : '');
  const bodyText = `${senderName}: ${rawText}`.slice(0, 120); // ~90–120 seguro en la mayoría de UIs

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
      titulo: `Mención${canalNice}`,
      mensaje: bodyText,
      chat_canal_id: canal_id,
      link_url: `/chat/c/${canal_id}`,
      data: { mensaje_id: msg.id },
      destinos: destinosMention
    }, user);
  }

  const restantes = destinosAll.filter(d => !mentionedUserIds.includes(d.user_id));
  if (restantes.length) {
    await createNotif({
      tipo_codigo: 'chat_mensaje',
      titulo: `Nuevo mensaje${canalNice}`,
      mensaje: bodyText,
      chat_canal_id: canal_id,
      link_url: `/chat/c/${canal_id}`,
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
  for (const m of t.matchAll(re)) set.add(parseInt(m[1], 10));
  return [...set];
}