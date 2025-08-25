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
