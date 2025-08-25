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
