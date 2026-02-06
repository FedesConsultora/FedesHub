// backend/src/modules/notificaciones/repositories/notificaciones.repo.js
import { Op, fn, col } from 'sequelize';
import { initModels } from '../../../models/registry.js';
import crypto from 'crypto';

const m = await initModels();

/* ========== Helpers ========== */
const _buzonIdByCodigo = async (codigo, t) => {
  const row = await m.BuzonTipo.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
};
const _estadoEnvioByCodigo = async (codigo, t) => {
  const row = await m.EstadoEnvio.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
};
const _tipoByCodigo = async (codigo, t) => {
  const row = await m.NotificacionTipo.findOne({ where: { codigo }, transaction: t });
  return row;
};
const _importanciaByCodigo = async (codigo, t) => {
  const row = await m.ImportanciaTipo.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
};

/* ========== Catálogos ========== */
export const listCatalogos = async () => {
  const [tipos, canales, importancias, estadosEnvio, proveedores, buzones] = await Promise.all([
    m.NotificacionTipo.findAll({
      attributes: ['id', 'codigo', 'nombre', 'buzon_id', 'canales_default_json'],
      order: [['codigo', 'ASC']]
    }),
    m.CanalTipo.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['id', 'ASC']] }),
    m.ImportanciaTipo.findAll({ attributes: ['id', 'codigo', 'nombre', 'orden'], order: [['orden', 'ASC']] }),
    m.EstadoEnvio.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['id', 'ASC']] }),
    m.ProveedorTipo.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['id', 'ASC']] }),
    m.BuzonTipo.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['id', 'ASC']] })
  ]);
  return { tipos, canales, importancias, estadosEnvio, proveedores, buzones };
};

/* ========== Inbox / Ventanas ========== */
function _buildInboxFilters(params, { buzon_id, user_id }) {
  const only_unread = !!params.only_unread;
  const include_archived = !!params.include_archived;
  const include_dismissed = !!params.include_dismissed;
  const q = params.q?.trim();

  const whereNotif = {};
  if (buzon_id) whereNotif.buzon_id = buzon_id;
  if (params.chat_canal_id) whereNotif.chat_canal_id = params.chat_canal_id;
  if (params.tarea_id) whereNotif.tarea_id = params.tarea_id;
  if (params.evento_id) whereNotif.evento_id = params.evento_id;
  if (params.importancia_id) whereNotif.importancia_id = params.importancia_id;
  if (params.hilo_key) whereNotif.hilo_key = params.hilo_key;

  const whereDest = { user_id };
  if (only_unread) whereDest.read_at = { [Op.is]: null };
  if (!include_archived) whereDest.archived_at = { [Op.is]: null };
  if (!include_dismissed) whereDest.dismissed_at = { [Op.is]: null };

  const whereQ = q ? {
    [Op.or]: [
      { '$notificacion.titulo$': { [Op.iLike]: `%${q}%` } },
      { '$notificacion.mensaje$': { [Op.iLike]: `%${q}%` } }
    ]
  } : {};

  return { whereNotif, whereDest, whereQ };
}

export const listInbox = async (params, user, t) => {
  const limit = Math.min(Number(params.limit ?? 25), 100);
  const offset = Math.max(Number(params.offset ?? 0), 0);
  const buzon_id = params.buzon ? await _buzonIdByCodigo(params.buzon, t) : null;

  const { whereNotif, whereDest, whereQ } =
    _buildInboxFilters(params, { buzon_id, user_id: user.id });

  const order =
    params.sort === 'oldest'
      ? [[{ model: m.Notificacion, as: 'notificacion' }, 'created_at', 'ASC']]
      : params.sort === 'importance'
        ? [
          [{ model: m.Notificacion, as: 'notificacion' }, { model: m.ImportanciaTipo, as: 'importancia' }, 'orden', 'ASC'],
          [{ model: m.Notificacion, as: 'notificacion' }, 'created_at', 'DESC']
        ]
        : [[{ model: m.Notificacion, as: 'notificacion' }, 'created_at', 'DESC']];

  const includeNotif = {
    model: m.Notificacion, as: 'notificacion', required: true, where: whereNotif,
    include: [
      { model: m.NotificacionTipo, as: 'tipo', attributes: ['id', 'codigo', 'nombre', 'buzon_id'] },
      { model: m.ImportanciaTipo, as: 'importancia', attributes: ['id', 'codigo', 'nombre', 'orden'] },
      {
        model: m.Tarea, as: 'tarea', attributes: ['id', 'titulo', 'cliente_id'],
        include: [{ model: m.Cliente, as: 'cliente', attributes: ['id', 'nombre'] }]
      },
      { model: m.Evento, as: 'evento', attributes: ['id', 'titulo', 'starts_at', 'ends_at'] },
      {
        model: m.ChatCanal, as: 'chatCanal', attributes: ['id', 'nombre', 'slug'],
        include: [{ model: m.ChatCanalTipo, as: 'tipo', attributes: ['codigo', 'nombre'] }]
      }
    ]
  };

  const [rows, total] = await Promise.all([
    m.NotificacionDestino.findAll({
      where: { ...whereDest, ...whereQ },
      include: [includeNotif],
      order, limit, offset
    }),
    m.NotificacionDestino.count({
      where: { ...whereDest, ...whereQ },
      include: [includeNotif]
    })
  ]);

  return { total, rows };
};

export const countByVentana = async (user_id, t) => {
  // Contamos **no leídas y visibles** por buzón
  const [chatId, tareasId, calId] = await Promise.all([
    _buzonIdByCodigo('chat', t),
    _buzonIdByCodigo('tareas', t),
    _buzonIdByCodigo('calendario', t)
  ]);

  const baseUnreadVisible = {
    user_id,
    read_at: { [Op.is]: null },
    archived_at: { [Op.is]: null },
    dismissed_at: { [Op.is]: null },
  };

  const countFor = (buzId) => m.NotificacionDestino.count({
    where: baseUnreadVisible,
    include: [{
      model: m.Notificacion, as: 'notificacion', required: true, where: { buzon_id: buzId }
    }]
  });

  const [chat, tareas, calendario, unread_total] = await Promise.all([
    countFor(chatId),
    countFor(tareasId),
    countFor(calId),
    m.NotificacionDestino.count({ where: baseUnreadVisible })
  ]);

  return { chat, tareas, calendario, unread_total };
};

export const listChatCanalesForUser = async (user_id) => {
  const rows = await m.ChatCanal.findAll({
    attributes: ['id', 'nombre', 'slug', 'is_archivado', 'created_at'],
    include: [
      { model: m.ChatCanalTipo, as: 'tipo', attributes: ['codigo', 'nombre'] },
      {
        model: m.Notificacion, as: 'notificaciones', required: false,
        where: { chat_canal_id: { [Op.ne]: null } },
        include: [{ model: m.NotificacionDestino, as: 'destinos', where: { user_id }, required: true }]
      }
    ],
    order: [['updated_at', 'DESC']]
  });
  return rows;
};

/* ========== Preferencias ========== */
export const getPreferences = async (user_id) => {
  const rows = await m.NotificacionPreferencia.findAll({
    where: { user_id },
    include: [
      { model: m.NotificacionTipo, as: 'tipo', attributes: ['id', 'codigo', 'nombre'] },
      { model: m.CanalTipo, as: 'canal', attributes: ['id', 'codigo', 'nombre'] }
    ],
    order: [['tipo_id', 'ASC'], ['canal_id', 'ASC']]
  });
  return rows;
};

export const setPreferences = async (user_id, items, t) => {
  for (const it of items) {
    const [row, created] = await m.NotificacionPreferencia.findOrCreate({
      where: { user_id, tipo_id: it.tipo_id, canal_id: it.canal_id },
      defaults: { is_habilitado: it.is_habilitado },
      transaction: t
    });
    if (!created) await row.update({ is_habilitado: it.is_habilitado }, { transaction: t });
  }
  return getPreferences(user_id);
};

/* ========== Crear notificación ========== */
export const createNotificacion = async (payload, destinos, created_by_user_id, t) => {
  let tipo_id = payload.tipo_id;
  if (!tipo_id && payload.tipo_codigo) {
    const tipo = await _tipoByCodigo(payload.tipo_codigo, t);
    if (!tipo) throw Object.assign(new Error('tipo_codigo inválido'), { status: 400 });
    tipo_id = tipo.id;
  }

  const importancia_id = payload.importancia_id ?? await _importanciaByCodigo('media', t);
  const tipo = await m.NotificacionTipo.findByPk(tipo_id, { transaction: t });
  const buzon_id = tipo.buzon_id;

  const n = await m.Notificacion.create({
    tipo_id,
    importancia_id,
    titulo: payload.titulo ?? null,
    mensaje: payload.mensaje ?? null,
    data_json: payload.data ? JSON.stringify(payload.data) : null,
    link_url: payload.link_url ?? null,
    tarea_id: payload.tarea_id ?? null,
    ausencia_id: payload.ausencia_id ?? null,
    asistencia_registro_id: payload.asistencia_registro_id ?? null,
    evento_id: payload.evento_id ?? null,
    chat_canal_id: payload.chat_canal_id ?? null,
    hilo_key: payload.hilo_key ?? null,
    programada_at: payload.programada_at ?? null,
    created_by_user_id: created_by_user_id ?? null,
    buzon_id
  }, { transaction: t });

  const ds = destinos.map(d => {
    if (typeof d === 'number' || typeof d === 'string') {
      return { notificacion_id: n.id, user_id: +d, feder_id: null };
    }
    return {
      notificacion_id: n.id,
      user_id: d.user_id,
      feder_id: d.feder_id ?? null
    };
  });
  await m.NotificacionDestino.bulkCreate(ds, { transaction: t, ignoreDuplicates: true });

  return n;
};

/* ========== Marcas (por destino de usuario) ========== */
async function _destForUpdate(notificacion_id, user_id) {
  const row = await m.NotificacionDestino.findOne({ where: { notificacion_id, user_id } });
  if (!row) throw Object.assign(new Error('Destino no encontrado'), { status: 404 });
  return row;
}

export const setSeen = async (id, user_id) => {
  const row = await _destForUpdate(id, user_id);
  if (!row.in_app_seen_at) await row.update({ in_app_seen_at: new Date() });
  return row;
};

export const setRead = async (id, user_id, on) => {
  const row = await _destForUpdate(id, user_id);
  await row.update({ read_at: on ? new Date() : null });
  return row;
};

export const setDismiss = async (id, user_id, on) => {
  const row = await _destForUpdate(id, user_id);
  await row.update({ dismissed_at: on ? new Date() : null });
  return row;
};

export const setArchive = async (id, user_id, on) => {
  const row = await _destForUpdate(id, user_id);
  await row.update({ archived_at: on ? new Date() : null });
  return row;
};

export const setPin = async (id, user_id, orden) => {
  const row = await _destForUpdate(id, user_id);
  await row.update({ pin_orden: orden ?? null });
  return row;
};

/* ========== Email queue & tracking ========== */
export const queueEmailEnvio = async ({ destino_id, canal_id, proveedor_id, asunto, cuerpo_html, data_render_json }, t) => {
  const estadoQueued = await _estadoEnvioByCodigo('queued', t);
  const tracking_token = cryptoRandomToken();
  const envio = await m.NotificacionEnvio.create({
    destino_id, canal_id, proveedor_id,
    estado_id: estadoQueued,
    asunto_render: asunto,
    cuerpo_render: cuerpo_html,
    data_render_json: data_render_json ? JSON.stringify(data_render_json) : null,
    tracking_token,
    queued_at: new Date()
  }, { transaction: t });
  return envio;
};

export const markEnvioSent = async (envio_id, provider_msg_id, t) => {
  const estadoSent = await _estadoEnvioByCodigo('sent', t);
  const row = await m.NotificacionEnvio.findByPk(envio_id, { transaction: t });
  if (!row) return null;
  await row.update({ estado_id: estadoSent, provider_msg_id, enviado_at: new Date(), ultimo_error: null }, { transaction: t });
  return row;
};

export const markEnvioOpenedByToken = async (token) => {
  const row = await m.NotificacionEnvio.findOne({ where: { tracking_token: token } });
  if (!row) return null;
  const estadoOpened = await m.EstadoEnvio.findOne({ where: { codigo: 'opened' } });
  await row.update({ estado_id: estadoOpened?.id ?? row.estado_id, abierto_at: new Date() });
  const destino = await m.NotificacionDestino.findByPk(row.destino_id);
  if (destino && !destino.read_at) await destino.update({ read_at: new Date() });
  return row;
};

function cryptoRandomToken(len = 16) {
  return crypto.randomBytes(len).toString('hex'); // 32 hex chars
}