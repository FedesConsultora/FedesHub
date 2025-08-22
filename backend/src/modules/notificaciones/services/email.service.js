// Servicio de rendering+envío por email, con fallback a plantillas en código
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
  // 1) Si hay plantilla en DB (NotificacionPlantilla), usarla
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

  // 2) Fallback por código según NotificacionTipo.codigo
  const tipo = await m.NotificacionTipo.findByPk(tipo_id, { transaction: t });
  const code = tipo?.codigo;
  let subject = tipo?.nombre || 'Notificación';
  let html;

  switch (code) {
    case 'tarea_asignada':
      subject = 'Nueva tarea asignada';
      html = templates.tarea_asignada(payload);
      break;
    case 'tarea_comentario':
      subject = 'Nuevo comentario en tu tarea';
      html = templates.tarea_comentario(payload);
      break;
    case 'chat_mencion':
      subject = 'Te mencionaron en un chat';
      html = templates.chat_mencion(payload);
      break;

    // Calendario: soportar ambos códigos
    case 'evento_recordatorio':
    case 'recordatorio':
      subject = 'Recordatorio de evento';
      html = templates.evento_recordatorio(payload);
      break;
    case 'evento_invitacion':
      subject = 'Invitación a evento';
      html = templates.evento_recordatorio(payload); // mismo layout por ahora
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
      { model: m.ChatCanal, as: 'chatCanal' },
      { model: m.NotificacionDestino, as: 'destinos', include: [{ model: m.User, as: 'user' }] }
    ],
    transaction: t
  });
  if (!notif) return 0;

  const canalId = await getCanalId('email', t);
  const proveedorId = await getProveedorId('gmail_smtp', t); // alias asegurado por seeder

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
      tarea: notif.tarea ? { ...notif.tarea.get?.() ?? notif.tarea } : undefined,
      evento: notif.evento ? { ...notif.evento.get?.() ?? notif.evento } : undefined,
      canal: notif.chatCanal ? { ...notif.chatCanal.get?.() ?? notif.chatCanal } : undefined,
      comentario: notif.data_json ? JSON.parse(notif.data_json)?.comentario : undefined,
      link: link_url
    };
    const { subject, html } = await renderEmail({ tipo_id: notif.tipo_id, payload, link_url }, t);

    const envio = await queueEmailEnvio({
      destino_id: d.id, canal_id: canalId, proveedor_id: proveedorId,
      asunto: subject, cuerpo_html: html, data_render_json: payload
    }, t);

    const provider_msg_id = await sendMail({ to, subject, html });
    await markEnvioSent(envio.id, provider_msg_id, t);
    sent++;
  }
  return sent;
};
