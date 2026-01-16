// /backend/src/modules/chat/repositories/messages.repo.js
import { Op } from 'sequelize';
import { initModels } from '../../../models/registry.js';
import { sequelize } from '../../../core/db.js'; // 👈 usar este
const m = await initModels();

async function _canalMember(canal_id, user_id, t) {
  return m.ChatCanalMiembro.findOne({ where: { canal_id, user_id }, transaction: t });
}

async function _rolCodigoById(rol_id, t) {
  const row = await m.ChatRolTipo.findByPk(rol_id, { transaction: t });
  return row?.codigo ?? null;
}

/**
 * Lista mensajes de un canal.
 * - Paginación por before_id / after_id.
 * - Modo hilo: si viene thread_root_id, por defecto incluye el root (id === thread_root_id) + replies (parent_id === thread_root_id),
 *   ordenados ASC para facilitar append en el frontend. Si NO querés el root, pasá include_root=false en params.
 */
export async function listMessages(canal_id, params, user, t) {
  const where = { canal_id };

  // --- Filtros de timeline
  if (params.before_id) where.id = { [Op.lt]: params.before_id };
  if (params.after_id) where.id = { ...(where.id || {}), [Op.gt]: params.after_id };

  let orderDir = 'DESC';

  // --- Modo hilo
  if (params.thread_root_id) {
    const includeRoot = params.include_root !== false; // default: true
    orderDir = 'ASC'; // en hilos devolvemos en orden cronológico

    if (includeRoot) {
      // Traer root + replies
      // NOTA: si también viene before_id / after_id, la condición de id se respeta arriba.
      where[Op.or] = [
        { id: params.thread_root_id },
        { parent_id: params.thread_root_id }
      ];
    } else {
      // Sólo replies
      where.parent_id = params.thread_root_id ?? null;
    }
  } else if (params.thread_root_id === null) {
    // explícito: sólo mensajes "de raíz" (no replies)
    where.parent_id = null;
  }

  const rows = await m.ChatMensaje.findAll({
    where,
    include: [
      { model: m.User, as: 'autor', attributes: ['id', 'email'] },
      { model: m.Feder, as: 'feder', attributes: ['id', 'nombre', 'apellido', 'avatar_url'] },
      { model: m.ChatAdjunto, as: 'adjuntos' },
      { model: m.ChatReaccion, as: 'reacciones' },
      { model: m.ChatLinkPreview, as: 'linkPreviews' },
      { model: m.ChatPin, as: 'pins' },
      // ✅ preview del parent para UI (texto y autor)
      { model: m.ChatMensaje, as: 'parent', attributes: ['id', 'body_text'], include: [{ model: m.User, as: 'autor', attributes: ['id', 'email'] }] }
    ],
    order: [['id', orderDir]],
    limit: params.limit,
    transaction: t
  });

  // delivered (sin romper el GET)
  try {
    await markDelivered(rows.map(r => r.id), user.id, t);
  } catch (e) { console.error('markDelivered error:', e?.message || e); }

  return rows;
}

export async function createMessage(canal, payload, user, t) {
  // Reglas: only_mods_can_post / slowmode
  const me = await _canalMember(canal.id, user.id, t);
  if (!me) throw Object.assign(new Error('No sos miembro del canal'), { status: 403 });

  if (canal.only_mods_can_post) {
    const rol = await _rolCodigoById(me.rol_id, t);
    if (!['owner', 'admin', 'mod'].includes(rol)) {
      throw Object.assign(new Error('Sólo moderadores pueden postear en este canal'), { status: 403 });
    }
  }

  if ((canal.slowmode_seconds ?? 0) > 0) {
    const last = await m.ChatMensaje.findOne({
      where: { canal_id: canal.id, user_id: user.id },
      order: [['id', 'DESC']],
      transaction: t
    });
    if (last) {
      const secs = Math.floor((Date.now() - new Date(last.created_at).getTime()) / 1000);
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
    // Frontend manda cada item con { file_url, file_name, mime_type, size_bytes, width?, height?, duration_sec? }
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
      { model: m.User, as: 'autor', attributes: ['id', 'email'] },
      { model: m.Feder, as: 'feder', attributes: ['id', 'nombre', 'apellido', 'avatar_url'] },
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
  const canMod = ['owner', 'admin', 'mod'].includes(myRole);
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

  // Estrictamente sólo el autor (por pedido del usuario)
  if (row.user_id !== user.id) {
    throw Object.assign(new Error('No podés borrar este mensaje'), { status: 403 });
  }

  // Ventana de 30 minutos (por pedido del usuario)
  const diffMs = Date.now() - new Date(row.created_at).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins > 30) {
    throw Object.assign(new Error('Sólo podés borrar mensajes dentro de los primeros 30 minutos'), { status: 403 });
  }

  // Eliminar pins asociados si existen
  await m.ChatPin.destroy({ where: { mensaje_id: id }, transaction: t });

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

export async function listPins(canal_id, t) {
  return m.ChatPin.findAll({
    where: { canal_id },
    include: [
      {
        model: m.ChatMensaje,
        as: 'mensaje',
        include: [
          { model: m.User, as: 'autor', attributes: ['id', 'email'] },
          { model: m.Feder, as: 'feder', attributes: ['id', 'nombre', 'apellido', 'avatar_url'] },
          { model: m.ChatAdjunto, as: 'adjuntos' }
        ]
      }
    ],
    order: [['pin_orden', 'ASC'], ['id', 'DESC']],
    transaction: t
  });
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

export async function markDelivered(mensaje_ids, user_id, t) {
  if (!Array.isArray(mensaje_ids) || mensaje_ids.length === 0) return 0;
  const values = mensaje_ids
    .filter((id) => Number.isFinite(Number(id)))
    .map((id) => `(${Number(id)}, ${Number(user_id)}, now())`)
    .join(',');

  if (!values) return 0;

  try {
    await sequelize.query(`
      INSERT INTO "ChatDelivery"(mensaje_id, user_id, delivered_at)
      VALUES ${values}
      ON CONFLICT (mensaje_id, user_id) DO NOTHING;
    `, { transaction: t });
  } catch (e) { console.error('markDelivered error:', e?.message || e); }
  return mensaje_ids.length;
}

export function extractUrls(text) {
  if (!text) return [];
  const re = /\bhttps?:\/\/[^\s<>"']+/gi;
  return [...text.matchAll(re)].map(m => m[0]).slice(0, 10);
}
