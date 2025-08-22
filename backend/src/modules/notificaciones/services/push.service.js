// /backend/src/modules/notificaciones/services/push.service.js
import { initModels } from '../../../models/registry.js';
import { sendToTokens } from '../../../lib/push/fcm.js';

const m = await initModels();

async function idByCodigo(table, codigo, t) {
  const row = await table.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
}

export const sendNotificationPush = async (notificacion_id, t) => {
  const notif = await m.Notificacion.findByPk(notificacion_id, {
    include: [
      { model: m.NotificacionTipo, as: 'tipo' },
      { model: m.ImportanciaTipo, as: 'importancia' },
      { model: m.Tarea, as: 'tarea', include: [{ model: m.Cliente, as: 'cliente' }] },
      { model: m.Evento, as: 'evento' },
      { model: m.ChatCanal, as: 'chatCanal' },
      { model: m.NotificacionDestino, as: 'destinos', include: [{ model: m.User, as: 'user' }] }
    ],
    transaction: t
  });
  if (!notif) return 0;

  const canalId = await idByCodigo(m.CanalTipo, 'push', t);
  const proveedorId = await idByCodigo(m.ProveedorTipo, process.env.PUSH_PROVIDER || 'fcm', t);

  const defaults = Array.isArray(notif.tipo?.canales_default_json) ? notif.tipo.canales_default_json : [];
  const pushDefaultOn = defaults.includes('push');

  const estadoSent   = await m.EstadoEnvio.findOne({ where: { codigo: 'sent' },   transaction: t });
  const estadoError  = await m.EstadoEnvio.findOne({ where: { codigo: 'error' },  transaction: t });

  let sent = 0;

  for (const d of notif.destinos) {
    // preferencia efectiva
    const pref = await m.NotificacionPreferencia.findOne({
      where: { user_id: d.user_id, tipo_id: notif.tipo_id, canal_id: canalId }, transaction: t
    });
    const canPush = pref ? !!pref.is_habilitado : pushDefaultOn;
    if (!canPush) continue;

    // tokens válidos y no revocados del usuario
    const tokens = (await m.PushToken.findAll({
      where: { user_id: d.user_id, is_revocado: false }, transaction: t
    })).map(x => x.token);

    if (!tokens.length) continue;

    const title = notif.titulo || notif.tipo?.nombre || 'FedesHub';
    const body =
      notif.mensaje ||
      (notif.tarea ? notif.tarea.titulo :
       notif.evento ? notif.evento.titulo :
       notif.chatCanal ? `Mención en ${notif.chatCanal.nombre}` : '');

    const data = {
      notificacion_id: String(notif.id),
      tipo: String(notif.tipo?.codigo || ''),
      link_url: notif.link_url || '',
      tarea_id: notif.tarea_id ? String(notif.tarea_id) : '',
      evento_id: notif.evento_id ? String(notif.evento_id) : '',
      chat_canal_id: notif.chat_canal_id ? String(notif.chat_canal_id) : '',
    };

    // Envío real a FCM
    const res = await sendToTokens(tokens, { title, body }, data);

    // Loguear resultado por token (success/error)
    for (let i = 0; i < tokens.length; i++) {
      const ok = res?.responses?.[i]?.success ?? (res?.successCount > 0 && tokens.length === 1);
      await m.NotificacionEnvio.create({
        destino_id: d.id,
        canal_id: canalId,
        proveedor_id: proveedorId,
        estado_id: ok ? estadoSent?.id : estadoError?.id,
        asunto_render: title,
        cuerpo_render: body,
        data_render_json: JSON.stringify({ ...data, token: tokens[i] }),
        enviado_at: ok ? new Date() : null,
        ultimo_error: ok ? null : (res?.responses?.[i]?.error?.message || 'send error')
      }, { transaction: t });
      if (ok) sent++;
    }
  }

  return sent;
};
