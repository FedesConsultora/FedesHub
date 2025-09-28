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
