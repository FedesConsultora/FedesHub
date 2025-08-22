// /backend/src/modules/notificaciones/controllers/push.controller.js
import { initModels } from '../../../models/registry.js';
const m = await initModels();

async function getProveedorId(codigo) {
  const row = await m.ProveedorTipo.findOne({ where: { codigo } });
  return row?.id ?? null;
}

export const registerToken = async (req, res, next) => {
  try {
    const { token, platform, device } = req.body; // platform: 'web'|'ios'|'android'
    if (!token) return res.status(400).json({ error: 'token requerido' });

    const proveedor_id = await getProveedorId(process.env.PUSH_PROVIDER || 'fcm');
    if (!proveedor_id) return res.status(500).json({ error: 'Proveedor FCM no configurado' });

    const [row] = await m.PushToken.findOrCreate({
      where: { user_id: req.user.id, token },
      defaults: {
        proveedor_id,
        plataforma: platform || 'web',
        device_info: device || null,
        last_seen_at: new Date(),
        is_revocado: false
      }
    });

    if (row) {
      await row.update({
        proveedor_id,
        plataforma: platform || row.plataforma || 'web',
        device_info: device || row.device_info,
        last_seen_at: new Date(),
        is_revocado: false
      });
    }

    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
};

export const unregisterToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token requerido' });
    await m.PushToken.update({ is_revocado: true }, { where: { user_id: req.user.id, token } });
    res.json({ ok: true });
  } catch (e) { next(e); }
};
