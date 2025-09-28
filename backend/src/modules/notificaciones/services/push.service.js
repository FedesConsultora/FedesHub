// /backend/src/modules/notificaciones/services/push.service.js
// RUTA: /backend/src/modules/notificaciones/services/push.service.js
import { initModels } from '../../../models/registry.js';
import { sendToTokens } from '../../../lib/push/fcm.js';
import { log } from '../../../infra/logging/logger.js';

const m = await initModels();

// Errores típicos de FCM que invalidan token
const INVALID_TOKEN_ERRORS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token'
];

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

  const canal = await m.CanalTipo.findOne({ where: { codigo: 'push' }, transaction: t });
  const proveedor = await m.ProveedorTipo.findOne({ where: { codigo: process.env.PUSH_PROVIDER || 'fcm' }, transaction: t });
  const canalId = canal?.id ?? null;
  const proveedorId = proveedor?.id ?? null;

  const defaults = Array.isArray(notif.tipo?.canales_default_json) && notif.tipo.canales_default_json.length
    ? notif.tipo.canales_default_json
    : (process.env.NODE_ENV === 'production' ? ['in_app'] : ['in_app','email','push']); // ⬅️ fallback más conservador en prod

  const pushDefaultOn = defaults.includes('push');

  const estadoSent  = await m.EstadoEnvio.findOne({ where: { codigo: 'sent'  }, transaction: t });
  const estadoError = await m.EstadoEnvio.findOne({ where: { codigo: 'error' }, transaction: t });

  log.info('push:start', {
    notificacion_id, canalId, proveedorId, pushDefaultOn,
    tipo: notif.tipo?.codigo, defaults
  });

  let sent = 0;

  for (const d of notif.destinos) {
    const pref = canalId ? await m.NotificacionPreferencia.findOne({
      where: { user_id: d.user_id, tipo_id: notif.tipo_id, canal_id: canalId }, transaction: t
    }) : null;

    const canPush = pref ? !!pref.is_habilitado : pushDefaultOn;

    log.info('push:destino', {
      destino_id: d.id, user_id: d.user_id,
      canPush,
      pref: pref ? { id: pref.id, is_habilitado: pref.is_habilitado } : null
    });

    if (!canPush) continue;

    const rows = await m.PushToken.findAll({
      where: { user_id: d.user_id, is_revocado: false },
      transaction: t
    });
    const tokens = rows.map(x => x.token);
    log.info('push:tokens', { destino_id: d.id, count: tokens.length });

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

    const res = await sendToTokens(tokens, { title, body }, data);

    // Actualizo last_seen_at por health del token
    await m.PushToken.update(
      { last_seen_at: new Date() },
      { where: { token: tokens }, transaction: t }
    );

    log.info('push:resumen', {
      destino_id: d.id,
      successCount: res?.successCount,
      failureCount: res?.failureCount
    });

    for (let i = 0; i < tokens.length; i++) {
      const response = res?.responses?.[i];
      const ok = response?.success ?? (res?.successCount > 0 && tokens.length === 1);
      const token = tokens[i];

      if (!ok && response?.error?.message) {
        const msg = response.error.message;
        const matchesInvalid = INVALID_TOKEN_ERRORS.some(code => msg.includes(code));
        if (matchesInvalid) {
          // Revoco token inválido
          await m.PushToken.update({ is_revocado: true }, { where: { token }, transaction: t });
          log.info('push:token:revoked', { token });
        }
      }

      await m.NotificacionEnvio.create({
        destino_id: d.id,
        canal_id: canalId,
        proveedor_id: proveedorId,
        estado_id: ok ? estadoSent?.id : estadoError?.id,
        asunto_render: title,
        cuerpo_render: body,
        data_render_json: JSON.stringify({ ...data, token }),
        enviado_at: ok ? new Date() : null,
        ultimo_error: ok ? null : (response?.error?.message || 'send error')
      }, { transaction: t });

      if (ok) sent++;
    }
  }

  log.info('push:done', { notificacion_id, sent });
  return sent;
};
