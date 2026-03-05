// /backend/src/modules/chat/repositories/meetings.repo.js
import { initModels } from '../../../models/registry.js';
const m = await initModels();

async function idByCodigo(model, codigo, t) {
  const row = await model.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
}

async function resolveCalendarioForCanal(canal, t) {
  // 1. Si el canal tiene un cliente asociado, buscar calendario de ese cliente
  if (canal.cliente_id) {
    const tipo_id = await idByCodigo(m.CalendarioTipo, 'cliente', t);
    const cal = await m.CalendarioLocal.findOne({
      where: { tipo_id, cliente_id: canal.cliente_id, is_activo: true },
      transaction: t
    });
    if (cal) return cal;
  }

  // 2. Buscar calendario 'global' (visible para todos)
  const globalTipo = await m.CalendarioTipo.findOne({ where: { codigo: 'global' }, transaction: t });
  if (globalTipo) {
    const cal = await m.CalendarioLocal.findOne({
      where: { tipo_id: globalTipo.id, is_activo: true },
      transaction: t
    });
    if (cal) return cal;
  }

  // 3. Buscar cualquier calendario que tenga visibilidad 'equipo' u 'organizacion'
  // Esto previene que caiga en 'privado' por defecto
  const visEquipo = await m.VisibilidadTipo.findOne({ where: { codigo: 'equipo' }, transaction: t });
  const visOrg = await m.VisibilidadTipo.findOne({ where: { codigo: 'organizacion' }, transaction: t });
  const visIds = [visEquipo?.id, visOrg?.id].filter(Boolean);

  if (visIds.length) {
    const sharedCal = await m.CalendarioLocal.findOne({
      where: { visibilidad_id: { [Op.in]: visIds }, is_activo: true },
      transaction: t
    });
    if (sharedCal) return sharedCal;
  }

  // 4. Fallback final: cualquier calendario activo que NO sea privado si es posible
  const nonPrivateCal = await m.CalendarioLocal.findOne({
    where: { is_activo: true, visibilidad_id: { [Op.ne]: 1 } }, // 1 es privado usualmente
    transaction: t
  });
  if (nonPrivateCal) return nonPrivateCal;

  return m.CalendarioLocal.findOne({ where: { is_activo: true }, transaction: t });
}

export async function scheduleMeeting(canal_id, payload, creator_user_id, t) {
  const canal = await m.ChatCanal.findByPk(canal_id, { transaction: t });
  if (!canal) throw Object.assign(new Error('Canal no encontrado'), { status: 404 });

  const cal = await resolveCalendarioForCanal(canal, t);
  if (!cal) throw Object.assign(new Error('No hay calendario disponible'), { status: 400 });

  // Tipo evento: preferir 'reunion', fallback 'interno'
  let tipo_id = await idByCodigo(m.EventoTipo, 'reunion', t);
  if (!tipo_id) tipo_id = await idByCodigo(m.EventoTipo, 'interno', t);
  const vis_id = await idByCodigo(m.VisibilidadTipo, 'equipo', t);

  const evento = await m.Evento.create({
    calendario_local_id: cal.id,
    tipo_id,
    titulo: payload.titulo,
    descripcion: `Reunión creada desde canal #${canal.slug || canal.nombre || canal.id}`,
    lugar: null,
    all_day: false,
    starts_at: payload.starts_at,
    ends_at: payload.ends_at,
    rrule: null,
    visibilidad_id: vis_id,
    color: null,
    asistencia_registro_id: null,
    ausencia_id: null,
    tarea_id: null,
    created_by_user_id: creator_user_id,
    updated_by_user_id: creator_user_id
  }, { transaction: t });

  const asisTipo = await idByCodigo(m.AsistenteTipo, 'obligatorio', t);

  // Asistentes: todos los miembros con feder_id
  const miembros = await m.ChatCanalMiembro.findAll({ where: { canal_id }, transaction: t });
  for (const mm of miembros) {
    if (!mm.feder_id) continue;
    await m.EventoAsistente.create({
      evento_id: evento.id, tipo_id: asisTipo, feder_id: mm.feder_id, nombre: null, respuesta: 'needsAction'
    }, { transaction: t });
  }

  const meet = await m.ChatMeeting.create({
    canal_id, provider_codigo: payload.provider_codigo,
    external_meeting_id: null, join_url: null,
    created_by_user_id: creator_user_id,
    starts_at: payload.starts_at, ends_at: payload.ends_at,
    evento_id: evento.id, mensaje_id: null
  }, { transaction: t });

  return { evento, meet };
}
