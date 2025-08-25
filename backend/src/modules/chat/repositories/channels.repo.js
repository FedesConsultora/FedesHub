// /backend/src/modules/chat/repositories/channels.repo.js
import { Op } from 'sequelize';
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
    case 'dm':
      where.tipo_id = await idByCodigo(m.ChatCanalTipo,'dm',t);
      break;
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
      const prev = await m.ChatCanal.findOne({
        where: { tipo_id: dmTipo, is_archivado: false },
        include: [{
          model: m.ChatCanalMiembro, as: 'miembros', required: true,
          where: { user_id: [user.id, invitee] }
        }],
        transaction: t
      });
      if (prev) canal = prev;
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