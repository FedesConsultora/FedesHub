// /backend/src/modules/chat/repositories/channels.repo.js
import { Op, literal, QueryTypes } from 'sequelize';
import { initModels } from '../../../models/registry.js';
import { sequelize } from '../../../core/db.js';
const m = await initModels();

async function idByCodigo(model, codigo, t) {
  const row = await model.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
}

// ------------ NUEVO: devuelve TODOS los usuarios (excepto yo) como candidatos a DM,
// ------------ incluyendo:
//  - feder_id, nombre, apellido
//  - presence status
//  - dm_canal_id (si ya existe el canal DM entre ambos)
//  - last_msg_id   (para saber si hay algo/unread en UI, opcional)
export async function listDmCandidates(currentUserId, t) {
  const dmTipoId = await idByCodigo(m.ChatCanalTipo, 'dm', t);

  // Nota: calculamos canal DM entre ambos, último mensaje (id y fecha) y mi último leído
  const rows = await sequelize.query(`
    SELECT
      u.id AS user_id,
      u.email,
      f.id AS feder_id,
      COALESCE(f.nombre,'')   AS nombre,
      COALESCE(f.apellido,'') AS apellido,
      f.avatar_url AS avatar_url,
      COALESCE(p.status,'offline') AS presence_status,

      -- canal DM (si existe)
      (
        SELECT c.id
        FROM "ChatCanal" c
        JOIN "ChatCanalMiembro" m1 ON m1.canal_id = c.id AND m1.user_id = :me
        JOIN "ChatCanalMiembro" m2 ON m2.canal_id = c.id AND m2.user_id = u.id
        WHERE c.tipo_id = :dmTipo
          AND c.is_archivado = false
        LIMIT 1
      ) AS dm_canal_id,

      -- último mensaje (id) del DM
      (
        SELECT MAX(ms.id)
        FROM "ChatMensaje" ms
        WHERE ms.canal_id = (
          SELECT c2.id
          FROM "ChatCanal" c2
          JOIN "ChatCanalMiembro" mm1 ON mm1.canal_id = c2.id AND mm1.user_id = :me
          JOIN "ChatCanalMiembro" mm2 ON mm2.canal_id = c2.id AND mm2.user_id = u.id
          WHERE c2.tipo_id = :dmTipo
            AND c2.is_archivado = false
          LIMIT 1
        )
        AND ms.deleted_at IS NULL
      ) AS last_msg_id,

      -- mi último leído en ese DM
      (
        SELECT cm.last_read_msg_id
        FROM "ChatCanalMiembro" cm
        WHERE cm.canal_id = (
          SELECT c3.id
          FROM "ChatCanal" c3
          JOIN "ChatCanalMiembro" mma ON mma.canal_id = c3.id AND mma.user_id = :me
          JOIN "ChatCanalMiembro" mmb ON mmb.canal_id = c3.id AND mmb.user_id = u.id
          WHERE c3.tipo_id = :dmTipo
            AND c3.is_archivado = false
          LIMIT 1
        )
        AND cm.user_id = :me
      ) AS my_last_read_msg_id,

      -- último mensaje (fecha) del DM (útil para ordenar en el front)
      (
        SELECT MAX(ms.created_at)
        FROM "ChatMensaje" ms
        WHERE ms.canal_id = (
          SELECT c4.id
          FROM "ChatCanal" c4
          JOIN "ChatCanalMiembro" m4a ON m4a.canal_id = c4.id AND m4a.user_id = :me
          JOIN "ChatCanalMiembro" m4b ON m4b.canal_id = c4.id AND m4b.user_id = u.id
          WHERE c4.tipo_id = :dmTipo
            AND c4.is_archivado = false
          LIMIT 1
        )
      ) AS last_msg_at

    FROM "User" u
    LEFT JOIN "Feder"        f ON f.user_id = u.id
    LEFT JOIN "ChatPresence" p ON p.user_id = u.id
    WHERE
      u.is_activo = true
      AND u.id <> :me
    ORDER BY
      (CASE WHEN f.nombre IS NULL THEN 1 ELSE 0 END),
      LOWER(COALESCE(f.nombre, u.email)),
      LOWER(COALESCE(f.apellido, ''))
  `, {
    replacements: { me: currentUserId, dmTipo: dmTipoId },
    type: QueryTypes.SELECT,
    transaction: t
  });

  return rows;
}


export async function catalogos() {
  const [canalTipos, rolTipos] = await Promise.all([
    m.ChatCanalTipo.findAll({ order: [['codigo', 'ASC']] }),
    m.ChatRolTipo.findAll({ order: [['codigo', 'ASC']] })
  ]);
  return { canalTipos, rolTipos };
}

export async function listCanales(params, user, t) {
  const where = {}
  if (!params.include_archivados) where.is_archivado = false

  // helpers con literales (usar SIEMPRE sequelize.literal acá)
  const L_LAST_MSG_ID = sequelize.literal(`(
    SELECT MAX(ms.id)
    FROM "ChatMensaje" ms
    WHERE ms.canal_id = "ChatCanal".id
      AND ms.deleted_at IS NULL
  )`)

  const L_MY_LAST_READ = sequelize.literal(`(
    SELECT cm.last_read_msg_id
    FROM "ChatCanalMiembro" cm
    WHERE cm.canal_id = "ChatCanal".id
      AND cm.user_id = ${Number(user.id)}
    LIMIT 1
  )`)

  // atributos calculados que se agregan a todas las variantes
  const baseAttrs = { include: [[L_LAST_MSG_ID, 'last_msg_id'], [L_MY_LAST_READ, 'my_last_read_msg_id']] }

  if (params.scope === 'mine') {
    return m.ChatCanal.findAll({
      where,
      attributes: baseAttrs,
      include: [
        {
          model: m.ChatCanalMiembro,
          as: 'miembros',
          required: true,
          where: { user_id: user.id },
          include: [{ model: m.ChatRolTipo, as: 'rol', attributes: ['codigo', 'nombre'] }]
        },
        { model: m.ChatCanalTipo, as: 'tipo', attributes: ['codigo', 'nombre'] }
      ],
      // IMPORTANTE: usar literal completo para NULLS LAST
      order: [
        sequelize.literal(`"last_msg_id" DESC NULLS LAST`),
        ['updated_at', 'DESC']
      ],
      transaction: t
    })
  }

  switch (params.scope) {
    case 'canal':
      where.id = params.canal_id
      break
    case 'cliente':
      where.cliente_id = params.cliente_id
      break
    case 'dm': {
      where.tipo_id = await (async () => {
        const row = await m.ChatCanalTipo.findOne({ where: { codigo: 'dm' }, transaction: t })
        return row?.id ?? null
      })()
      if (params.q) where.nombre = { [Op.iLike]: `%${params.q}%` }
      return m.ChatCanal.findAll({
        where,
        attributes: baseAttrs,
        include: [
          {
            model: m.ChatCanalMiembro, as: 'miembros',
            required: true, where: { user_id: user.id }, attributes: []
          },
          { model: m.ChatCanalTipo, as: 'tipo', attributes: ['codigo', 'nombre'] }
        ],
        order: [
          sequelize.literal(`"last_msg_id" DESC NULLS LAST`),
          ['updated_at', 'DESC']
        ],
        transaction: t
      })
    }
    case 'all':
    default:
      // sin filtros extra
      break
  }

  if (params.q) where.nombre = { [Op.iLike]: `%${params.q}%` }

  return m.ChatCanal.findAll({
    where,
    attributes: baseAttrs,
    include: [{ model: m.ChatCanalTipo, as: 'tipo', attributes: ['codigo', 'nombre'] }],
    order: [
      sequelize.literal(`"last_msg_id" DESC NULLS LAST`),
      ['updated_at', 'DESC']
    ],
    transaction: t
  })
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
    cliente_id: payload.cliente_id ?? null,
    created_by_user_id: user.id
  };

  let canal, created = false;
  const addedUserIds = [];

  if (payload.id) {
    // UPDATE
    canal = await m.ChatCanal.findByPk(payload.id, { transaction: t });
    if (!canal) throw Object.assign(new Error('Canal no encontrado'), { status: 404 });
    await canal.update(base, { transaction: t });

    // si en un update me pasan invited_user_ids, agrego los nuevos (y los registro)
    if (payload.invited_user_ids?.length) {
      const rolMember = await idByCodigo(m.ChatRolTipo, 'member', t);
      const existing = await m.ChatCanalMiembro.findAll({
        where: { canal_id: canal.id, user_id: { [Op.in]: payload.invited_user_ids } },
        attributes: ['user_id'],
        transaction: t
      });
      const exists = new Set(existing.map(r => r.user_id));
      const toAdd = payload.invited_user_ids.filter(uid => !exists.has(uid));

      if (toAdd.length) {
        const ds = toAdd.map(uid => ({
          canal_id: canal.id,
          user_id: uid,
          rol_id: rolMember,
          is_mute: false,
          notif_level: 'all',
          joined_at: new Date()
        }));
        await m.ChatCanalMiembro.bulkCreate(ds, { transaction: t });
        addedUserIds.push(...toAdd);
      }
    }

  } else {
    // CREATE o reutilización de DM
    if (payload.tipo_codigo === 'dm') {
      const invitee = payload.invited_user_ids?.[0];
      if (!invitee) throw Object.assign(new Error('Falta invitado para DM'), { status: 400 });
      const dmTipo = await idByCodigo(m.ChatCanalTipo, 'dm', t);
      const prev = await m.ChatCanal.findOne({
        where: { tipo_id: dmTipo, is_archivado: false },
        include: [{
          model: m.ChatCanalMiembro, as: 'miembros', required: true, attributes: [],
          where: { user_id: { [Op.in]: [user.id, invitee] } }
        }],
        attributes: ['id'],
        group: ['ChatCanal.id'],
        having: literal('COUNT(DISTINCT "miembros"."user_id") = 2'),
        transaction: t, subQuery: false
      });
      if (prev) canal = await m.ChatCanal.findByPk(prev.id, { transaction: t });
    }

    if (!canal) { canal = await m.ChatCanal.create(base, { transaction: t }); created = true; }

    // membresías iniciales
    const rolOwner = await idByCodigo(m.ChatRolTipo, 'owner', t);
    const rolMember = await idByCodigo(m.ChatRolTipo, 'member', t);

    // yo como owner
    await m.ChatCanalMiembro.findOrCreate({
      where: { canal_id: canal.id, user_id: user.id },
      defaults: { rol_id: rolOwner, is_mute: false, notif_level: 'all', joined_at: new Date() },
      transaction: t
    });

    // el resto como members
    const others = (payload.invited_user_ids || []).filter(uid => uid !== user.id);
    if (others.length) {
      const ds = others.map(uid => ({
        canal_id: canal.id,
        user_id: uid,
        rol_id: rolMember,
        is_mute: false,
        notif_level: 'all',
        joined_at: new Date()
      }));
      // Usamos ignoreDuplicates por si acaso (aunque en CREATE es raro que ya existan, 
      // pero si es una reutilización de DM que falló parcialmente podría pasar)
      await m.ChatCanalMiembro.bulkCreate(ds, { transaction: t, ignoreDuplicates: true });
      addedUserIds.push(...others);
    }
  }

  return { canal, created, addedUserIds };
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
    is_privado: settings.is_privado ?? row.is_privado,
    imagen_url: settings.imagen_url ?? row.imagen_url
  }, { transaction: t });
  return row;
}

export async function listMiembros(canal_id, t) {
  return m.ChatCanalMiembro.findAll({
    where: { canal_id },
    include: [
      { model: m.ChatRolTipo, as: 'rol', attributes: ['codigo', 'nombre'] },

      // Siempre traigo el user y SU feder (por user_id) → garantiza nombre y apellido
      {
        model: m.User, as: 'user', attributes: ['id', 'email'],
        where: { is_activo: true },
        include: [
          { model: m.Feder, as: 'feder', attributes: ['id', 'nombre', 'apellido', 'avatar_url'], required: false }
        ]
      },

      // Si alguna vez se usa feder_id en la membresía, también lo expongo:
      { model: m.Feder, as: 'feder', attributes: ['id', 'nombre', 'apellido', 'avatar_url'], required: false }
    ],
    order: [['id', 'ASC']],
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
      rol_id: rol_id ?? await idByCodigo(m.ChatRolTipo, 'member', t),
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
  const rolMember = await idByCodigo(m.ChatRolTipo, 'member', t);
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

export async function deleteCanal(canal_id, t) {
  const row = await m.ChatCanal.findByPk(canal_id, { transaction: t });
  if (!row) throw Object.assign(new Error('Canal no encontrado'), { status: 404 });
  await row.destroy({ transaction: t });
  return { deleted: true };
}