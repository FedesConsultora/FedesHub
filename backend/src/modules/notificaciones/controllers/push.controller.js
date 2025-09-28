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
