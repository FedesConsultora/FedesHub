// /backend/src/modules/chat/services/chat.service.js
import { initModels } from '../../../models/registry.js';
import {
  catalogos as repoCatalogos, listCanales, createOrUpdateCanal,
  archiveCanal, updateCanalSettings, listMiembros, addOrUpdateMiembro,
  removeMiembro, joinCanal, leaveCanal, getCanalWithMiembro
} from '../repositories/channels.repo.js';

import {
  listMessages, createMessage, editMessage, deleteMessage,
  toggleReaction, togglePin, toggleSaved, followThread, setRead, extractUrls
} from '../repositories/messages.repo.js';

import { setPresence, setTyping } from '../repositories/presence.repo.js';
import { createInvitation, acceptInvitation, declineInvitation } from '../repositories/invitations.repo.js';
import { scheduleMeeting } from '../repositories/meetings.repo.js';

import { svcCreate as createNotif } from '../../notificaciones/services/notificaciones.service.js';

const mReg = await initModels();
const sequelize = mReg.sequelize;

// -------- Catálogos
export const svcCatalogos = () => repoCatalogos();

// -------- Canales
export const svcListCanales = (q, user) => listCanales(q, user);

export const svcUpsertCanal = async (payload, user) => {
  const t = await sequelize.transaction();
  try {
    const row = await createOrUpdateCanal(payload, user, t);
    await t.commit();
    return row;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcArchiveCanal = async (id, on) => {
  const t = await sequelize.transaction();
  try {
    const row = await archiveCanal(id, on, t);
    await t.commit();
    return row;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcUpdateCanalSettings = async (id, body) => {
  const t = await sequelize.transaction();
  try {
    const row = await updateCanalSettings(id, body, t);
    await t.commit();
    return row;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcListMiembros = (canal_id) => listMiembros(canal_id);

export const svcAddOrUpdateMiembro = async (canal_id, payload, currentUser) => {
  const t = await sequelize.transaction();
  try {
    // (Opcional) Podrías validar que el currentUser sea admin/mod del canal
    const row = await addOrUpdateMiembro(canal_id, payload, t);
    await t.commit();
    return row;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcRemoveMiembro = async (canal_id, user_id) => {
  const t = await sequelize.transaction();
  try {
    const r = await removeMiembro(canal_id, user_id, t);
    await t.commit();
    return r;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcJoin = async (canal_id, user) => {
  const t = await sequelize.transaction();
  try {
    const row = await joinCanal(canal_id, user.id, t);
    await t.commit();
    return row;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcLeave = async (canal_id, user) => {
  const t = await sequelize.transaction();
  try {
    const r = await leaveCanal(canal_id, user.id, t);
    await t.commit();
    return r;
  } catch (e) { await t.rollback(); throw e; }
};

// -------- Mensajes
export const svcListMessages = (canal_id, q, user) => listMessages(canal_id, q, user);

export const svcPostMessage = async (canal_id, payload, user) => {
  const t = await sequelize.transaction();
  try {
    const canal = await getCanalWithMiembro(canal_id, user.id, t);
    if (!canal) throw Object.assign(new Error('Canal no encontrado'), { status: 404 });
    const msg = await createMessage(canal, payload, user, t);
    await t.commit();

    // Notificaciones después de commit
    try {
      await _notifyNewMessage(canal_id, msg, user);
    } catch (e) { console.error('notif chat post', e); }

    return msg;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcEditMessage = async (id, payload, user) => {
  const t = await sequelize.transaction();
  try {
    const row = await editMessage(id, payload, user, t);
    await t.commit();
    return row;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcDeleteMessage = async (id, user) => {
  const t = await sequelize.transaction();
  try {
    const r = await deleteMessage(id, user, t);
    await t.commit();
    return r;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcReact = async (mensaje_id, emoji, on, user) => {
  const t = await sequelize.transaction();
  try {
    const r = await toggleReaction(mensaje_id, user.id, emoji, on, t);
    await t.commit();
    return r;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcPin = async (canal_id, mensaje_id, on, orden, user) => {
  const t = await sequelize.transaction();
  try {
    const r = await togglePin(canal_id, mensaje_id, user.id, on, orden, t);
    await t.commit();
    return r;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcSave = async (mensaje_id, on, user) => {
  const t = await sequelize.transaction();
  try {
    const r = await toggleSaved(mensaje_id, user.id, on, t);
    await t.commit();
    return r;
  } catch (e) { await t.rollback(); throw e; }
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
  try {
    const r = await setRead(canal_id, user.id, last_read_msg_id, t);
    await t.commit();
    return r;
  } catch (e) { await t.rollback(); throw e; }
};

// -------- Presencia / Typing
export const svcSetPresence = async (body, user) => {
  const t = await sequelize.transaction();
  try {
    const r = await setPresence(user.id, body.status, body.device, t);
    await t.commit();
    return r;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcTyping = async (canal_id, on, ttl_seconds, user) => {
  const t = await sequelize.transaction();
  try {
    const r = await setTyping(canal_id, user.id, ttl_seconds, on, t);
    await t.commit();
    return r;
  } catch (e) { await t.rollback(); throw e; }
};

// -------- Invitaciones
export const svcInvite = async (canal_id, body, user) => {
  const t = await sequelize.transaction();
  try {
    const inv = await createInvitation(canal_id, body, user.id, t);
    await t.commit();

    // Notificación al invitado (si tiene user_id)
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
  } catch (e) { await t.rollback(); throw e; }
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
  try {
    const { evento, meet } = await scheduleMeeting(canal_id, body, user.id, t);
    await t.commit();

    // Notificar asistentes (todos los miembros con user_id)
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
  } catch (e) { await t.rollback(); throw e; }
};

// -------- Helpers de notificación de mensajes
async function _notifyNewMessage(canal_id, msg, user) {
  // 1) Destinos base: miembros del canal (excepto autor), respetando mute y notif_level
  const miembros = await mReg.ChatCanalMiembro.findAll({ where: { canal_id } });
  const byUser = new Map(miembros.map(m => [m.user_id, m]));
  const destinosAll = miembros
    .filter(m => m.user_id !== user.id && !m.is_mute && m.notif_level === 'all')
    .map(m => ({ user_id: m.user_id, feder_id: m.feder_id ?? null }));

  // 2) Menciones (si body_json.mentions = [user_id,...] o si body_text contiene @user:<id>)
  const mentionedUserIds = _extractMentions(msg);
  const destinosMention = miembros
    .filter(m => mentionedUserIds.includes(m.user_id) && m.user_id !== user.id && !m.is_mute)
    .map(m => ({ user_id: m.user_id, feder_id: m.feder_id ?? null }));

  // 3) Enviar notifs diferenciadas
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
  // patrón @user:123
  const re = /\B@user:(\d+)\b/g;
  for (const m of t.matchAll(re)) set.add(parseInt(m[1],10));
  return [...set];
}
