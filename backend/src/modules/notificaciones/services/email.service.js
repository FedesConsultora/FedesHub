// /backend/src/modules/notificaciones/services/email.service.js
import { initModels } from '../../../models/registry.js';
import { sendMail } from './mailer.js';
import { templates } from './emailTemplates.js';
import {
  queueEmailEnvio, markEnvioSent
} from '../repositories/notificaciones.repo.js';

const m = await initModels();

const getCanalId = async (codigo, t) => {
  const row = await m.CanalTipo.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
};
const getProveedorId = async (codigo, t) => {
  const row = await m.ProveedorTipo.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
};

export const renderEmail = async ({ tipo_id, idioma='es', payload={}, link_url }, t) => {
  // 1) Plantilla en DB
  const canal = await getCanalId('email', t);
  const row = await m.NotificacionPlantilla.findOne({
    where: { tipo_id, canal_id: canal, idioma },
    transaction: t
  });
  if (row?.cuerpo_tpl) {
    const asunto = row.asunto_tpl || 'Notificación';
    const render = (tpl, data) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(data?.[k] ?? ''));
    const html = render(row.cuerpo_tpl, { ...payload, link: link_url });
    return { subject: asunto, html };
  }

  // 2) Fallback por código
  const tipo = await m.NotificacionTipo.findByPk(tipo_id, { transaction: t });
  const code = tipo?.codigo;
  let subject = tipo?.nombre || 'Notificación';
  let html;

  switch (code) {
    /* Cuenta */
    case 'reset_password':
      subject = 'Recuperación de contraseña';
      html = templates.resetPassword({ link: link_url, ...(payload || {}) });
      break;

    /* Tareas */
    case 'tarea_asignada':
      subject = 'Nueva tarea asignada';
      html = templates.tarea_asignada(payload);
      break;
    case 'tarea_comentario':
      subject = 'Nuevo comentario en tu tarea';
      html = templates.tarea_comentario(payload);
      break;
    case 'tarea_vencimiento':
      subject = 'Tu tarea está por vencer';
      html = templates.tarea_vencimiento(payload);
      break;

    /* Chat */
    case 'chat_mencion':
      subject = 'Te mencionaron en un chat';
      html = templates.chat_mencion(payload);
      break;

    /* Calendario */
    case 'evento_invitacion':
      subject = `Invitación: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_invitacion(payload);
      break;
    case 'evento_actualizado':
      subject = `Actualizado: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_actualizado(payload);
      break;
    case 'evento_cancelado':
      subject = `Cancelado: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_cancelado(payload);
      break;
    case 'evento_removido':
      subject = `Actualización de participación: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_removido(payload);
      break;
    case 'evento_nuevo':
      subject = `Nuevo evento: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_nuevo(payload);
      break;
    case 'evento_recordatorio':
    case 'recordatorio':
      subject = `Recordatorio: ${payload?.evento?.titulo || ''}`;
      html = templates.evento_recordatorio(payload);
      break;
    case 'evento_rsvp':
      subject = `RSVP: ${payload?.evento?.titulo || ''} → ${payload?.rsvp || ''}`;
      html = templates.evento_rsvp(payload);
      break;

    default:
      subject = subject || 'FedesHub';
      html = templates.confirmEmail({ name: payload?.name || 'Fede', link: link_url || '#' });
  }
  return { subject, html };
};

export const sendNotificationEmails = async (notificacion_id, t) => {
  const notif = await m.Notificacion.findByPk(notificacion_id, {
    include: [
      { model: m.NotificacionTipo, as: 'tipo' },
      { model: m.ImportanciaTipo, as: 'importancia' },
      { model: m.Tarea, as: 'tarea', include: [{ model: m.Cliente, as: 'cliente' }] },
      { model: m.Evento, as: 'evento' },
      { model: m.ChatCanal, as: 'chatCanal', attributes: ['id','nombre','slug'] },
      { model: m.NotificacionDestino, as: 'destinos', include: [{ model: m.User, as: 'user' }] }
    ],
    transaction: t
  });
  if (!notif) return 0;

  const canalId = await getCanalId('email', t);
  const proveedorId = await getProveedorId('gmail_smtp', t);

  const defaults = Array.isArray(notif.tipo?.canales_default_json) ? notif.tipo.canales_default_json : [];
  const emailDefaultOn = defaults.includes('email');

  let sent = 0;
  for (const d of notif.destinos) {
    const pref = await m.NotificacionPreferencia.findOne({
      where: { user_id: d.user_id, tipo_id: notif.tipo_id, canal_id: canalId }, transaction: t
    });
    const canEmail = pref ? !!pref.is_habilitado : emailDefaultOn;
    if (!canEmail) continue;

    const to = d.user?.email;
    if (!to) continue;

    const link_url = notif.link_url || '#';
    const payload = {
      // payload estándar que esperan los templates
      tarea: notif.tarea ? { ...(notif.tarea.get?.() ?? notif.tarea) } : undefined,
      evento: notif.evento ? { ...(notif.evento.get?.() ?? notif.evento) } : undefined,
      canal: notif.chatCanal ? { ...(notif.chatCanal.get?.() ?? notif.chatCanal) } : undefined,
      comentario: notif.data_json ? JSON.parse(notif.data_json)?.comentario : undefined,
      rsvp: notif.data_json ? JSON.parse(notif.data_json)?.rsvp : undefined,
      link: link_url
    };

    const { subject, html } = await renderEmail({ tipo_id: notif.tipo_id, payload, link_url }, t);

    // 1) Guardar envío (tracking)
    const envio = await queueEmailEnvio({
      destino_id: d.id, canal_id: canalId, proveedor_id: proveedorId,
      asunto: subject, cuerpo_html: html, data_render_json: payload
    }, t);

    // 2) Pixel de apertura
    const baseUrlEnv = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const baseUrl = baseUrlEnv || 'https://tu-app.com';
    const pixelUrl = `${baseUrl}/api/notificaciones/email/open/${envio.tracking_token}.gif`;
    const htmlWithPixel = `${html}<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`;

    // 3) Enviar
    const provider_msg_id = await sendMail({ to, subject, html: htmlWithPixel });
    await markEnvioSent(envio.id, provider_msg_id, t);
    sent++;
  }
  return sent;
};