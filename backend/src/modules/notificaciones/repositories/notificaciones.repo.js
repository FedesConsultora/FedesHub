import { Op } from 'sequelize';
import { initModels } from '../../../models/registry.js';

const m = await initModels();

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

// ----------- Catálogos -----------
export const listCatalogos = async () => {
  const [tipos, canales, importancias, estadosEnvio, proveedores, buzones] = await Promise.all([
    m.NotificacionTipo.findAll({ attributes: ['id','codigo','nombre','buzon_id','canales_default_json'], order: [['codigo','ASC']] }),
    m.CanalTipo.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] }),
    m.ImportanciaTipo.findAll({ attributes: ['id','codigo','nombre','orden'], order: [['orden','ASC']] }),
    m.EstadoEnvio.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] }),
    m.ProveedorTipo.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] }),
    m.BuzonTipo.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] })
  ]);
  return { tipos, canales, importancias, estadosEnvio, proveedores, buzones };
};

// ----------- Inbox / ventanas -----------
const _baseInboxQuery = ({ user_id, q, only_unread, include_archived, buzon_id, chat_canal_id, tarea_id, evento_id, importancia_id, tipo_codigo, hilo_key }) => {
  const whereNotif = {};
  if (buzon_id) whereNotif.buzon_id = buzon_id;
  if (chat_canal_id) whereNotif.chat_canal_id = chat_canal_id;
  if (tarea_id) whereNotif.tarea_id = tarea_id;
  if (evento_id) whereNotif.evento_id = evento_id;
  if (importancia_id) whereNotif.importancia_id = importancia_id;
  if (hilo_key) whereNotif.hilo_key = hilo_key;

  const whereDest = { user_id };
  if (only_unread) whereDest.read_at = null;
  if (!include_archived) whereDest.archived_at = null;

  const whereQ = q ? {
    [Op.or]: [
      { '$notificacion.titulo$':  { [Op.iLike]: `%${q}%` } },
      { '$notificacion.mensaje$': { [Op.iLike]: `%${q}%` } }
    ]
  } : {};

  return { whereNotif, whereDest, whereQ };
};

export const countByVentana = async (user_id, t) => {
  const [chatId, tareasId, calId] = await Promise.all([
    _buzonIdByCodigo('chat', t),
    _buzonIdByCodigo('tareas', t),
    _buzonIdByCodigo('calendario', t)
  ]);

  const base = { user_id, archived_at: null };
  const [chat, tareas, calendario, notificaciones, unread_total] = await Promise.all([
    m.NotificacionDestino.count({ where: { ...base }, include: [{ model: m.Notificacion, as: 'notificacion', required: true, where: { buzon_id: chatId } }] }),
    m.NotificacionDestino.count({ where: { ...base }, include: [{ model: m.Notificacion, as: 'notificacion', required: true, where: { buzon_id: tareasId } }] }),
    m.NotificacionDestino.count({ where: { ...base }, include: [{ model: m.Notificacion, as: 'notificacion', required: true, where: { buzon_id: calId } }] }),
    m.NotificacionDestino.count({ where: { ...base } }),
    m.NotificacionDestino.count({ where: { ...base, read_at: null } })
  ]);

  return { chat, tareas, calendario, notificaciones, unread_total };
};

export const listInbox = async (params, user, t) => {
  const buzon_id = params.buzon ? await _buzonIdByCodigo(params.buzon, t) : null;
  const { whereNotif, whereDest, whereQ } = _baseInboxQuery({ ...params, buzon_id, user_id: user.id });

  const order =
    params.sort === 'oldest'
      ? [[{ model: m.Notificacion, as: 'notificacion' }, 'created_at', 'ASC']]
      : params.sort === 'importance'
      ? [
          [{ model: m.Notificacion, as: 'notificacion' }, { model: m.ImportanciaTipo, as: 'importancia' }, 'orden', 'ASC'],
          [{ model: m.Notificacion, as: 'notificacion' }, 'created_at', 'DESC']
        ]
      : [[{ model: m.Notificacion, as: 'notificacion' }, 'created_at', 'DESC']];

  const rows = await m.NotificacionDestino.findAll({
    where: { ...whereDest, ...whereQ },
    include: [
      { model: m.Notificacion, as: 'notificacion', required: true, where: whereNotif,
        include: [
          { model: m.NotificacionTipo, as: 'tipo', attributes: ['id','codigo','nombre','buzon_id'] },
          { model: m.ImportanciaTipo, as: 'importancia', attributes: ['id','codigo','nombre','orden'] },
          { model: m.Tarea, as: 'tarea', attributes: ['id','titulo','cliente_id'] },
          { model: m.Evento, as: 'evento', attributes: ['id','titulo','starts_at','ends_at'] },
          { model: m.ChatCanal, as: 'chatCanal', attributes: ['id','tipo','nombre','slug'] }
        ]
      }
    ],
    order,
    limit: params.limit,
    offset: params.offset
  });

  const total = await m.NotificacionDestino.count({
    where: { ...whereDest, ...whereQ },
    include: [{ model: m.Notificacion, as: 'notificacion', required: true, where: whereNotif }]
  });

  return { total, rows };
};

export const listChatCanalesForUser = async (user_id) => {
  const rows = await m.ChatCanal.findAll({
    attributes: ['id','tipo','nombre','slug','is_archivado','created_at'],
    include: [{
      model: m.Notificacion, as: 'notificaciones', required: false,
      where: { chat_canal_id: { [Op.ne]: null } },
      include: [{ model: m.NotificacionDestino, as: 'destinos', where: { user_id }, required: true }]
    }],
    order: [['updated_at','DESC']]
  });
  return rows;
};

// ----------- Preferencias -----------
export const getPreferences = async (user_id) => {
  const rows = await m.NotificacionPreferencia.findAll({
    where: { user_id },
    include: [
      { model: m.NotificacionTipo, as: 'tipo', attributes: ['id','codigo','nombre'] },
      { model: m.CanalTipo, as: 'canal', attributes: ['id','codigo','nombre'] }
    ],
    order: [['tipo_id','ASC'], ['canal_id','ASC']]
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

// ----------- Crear notificación -----------
export const createNotificacion = async (payload, destinos, created_by_user_id, t) => {
  let tipo_id = payload.tipo_id;
  if (!tipo_id && payload.tipo_codigo) {
    const tipo = await _tipoByCodigo(payload.tipo_codigo, t);
    if (!tipo) throw Object.assign(new Error('tipo_codigo inválido'), { status: 400 });
    tipo_id = tipo.id;
  }

  const importancia_id = payload.importancia_id ?? await _importanciaByCodigo('media', t);

  // Determinar buzon por tipo
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

  const ds = destinos.map(d => ({
    notificacion_id: n.id, user_id: d.user_id, feder_id: d.feder_id ?? null
  }));
  await m.NotificacionDestino.bulkCreate(ds, { transaction: t, ignoreDuplicates: true });

  return n;
};

// ----------- Marcas -----------
export const setSeen = async (id, user_id) => {
  const row = await m.NotificacionDestino.findOne({ where: { notificacion_id: id, user_id } });
  if (!row) throw Object.assign(new Error('Destino no encontrado'), { status: 404 });
  if (!row.in_app_seen_at) await row.update({ in_app_seen_at: new Date() });
  return row;
};

export const setRead = async (id, user_id, on) => {
  const row = await m.NotificacionDestino.findOne({ where: { notificacion_id: id, user_id } });
  if (!row) throw Object.assign(new Error('Destino no encontrado'), { status: 404 });
  await row.update({ read_at: on ? new Date() : null });
  return row;
};

export const setDismiss = async (id, user_id, on) => {
  const row = await m.NotificacionDestino.findOne({ where: { notificacion_id: id, user_id } });
  if (!row) throw Object.assign(new Error('Destino no encontrado'), { status: 404 });
  await row.update({ dismissed_at: on ? new Date() : null });
  return row;
};

export const setArchive = async (id, user_id, on) => {
  const row = await m.NotificacionDestino.findOne({ where: { notificacion_id: id, user_id } });
  if (!row) throw Object.assign(new Error('Destino no encontrado'), { status: 404 });
  await row.update({ archived_at: on ? new Date() : null });
  return row;
};

export const setPin = async (id, user_id, orden) => {
  const row = await m.NotificacionDestino.findOne({ where: { notificacion_id: id, user_id } });
  if (!row) throw Object.assign(new Error('Destino no encontrado'), { status: 404 });
  await row.update({ pin_orden: orden ?? null });
  return row;
};

// ----------- Email: envíos y tracking -----------
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

function cryptoRandomToken(len = 32) {
  const buf = Buffer.alloc(len);
  for (let i=0; i<len; i++) buf[i] = Math.floor(Math.random()*256);
  return buf.toString('hex');
}
