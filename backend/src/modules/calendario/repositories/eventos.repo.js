// /backend/src/modules/calendario/repositories/eventos.repo.js
import { Op } from 'sequelize';
import RRulePkg from 'rrule';
const { RRule } = RRulePkg;
import { initModels } from '../../../models/registry.js';
const m = await initModels();

const SELECT_BASE = {
  include: [
    { model: m.CalendarioLocal, as: 'calendarioLocal',
      include: [{ model: m.VisibilidadTipo, as: 'visibilidad', attributes: ['codigo'] }] },
    { model: m.EventoTipo, as: 'tipo' },
    { model: m.VisibilidadTipo, as: 'visibilidad' },
    { model: m.EventoAsistente, as: 'asistentes' }
  ],
  order: [['starts_at','ASC'], ['id','ASC']]
};

async function _federIdByUser(user_id, t) {
  const row = await m.Feder.findOne({ where: { user_id }, transaction: t });
  return row?.id ?? null;
}

function _overlapWhere(start, end) {
  return {
    [Op.or]: [
      { starts_at: { [Op.between]: [start, end] } },
      { ends_at:   { [Op.between]: [start, end] } },
      { [Op.and]: [{ starts_at: { [Op.lte]: start } }, { ends_at: { [Op.gte]: end } }] }
    ]
  };
}

export async function listEventsRange(params, user, t) {
  const { start, end, calendario_ids, scope, feder_id, celula_id, cliente_id,
          include_overlays, expand_recurrences, q } = params;

  let calWhere = {};
  if (Array.isArray(calendario_ids) && calendario_ids.length) {
    calWhere.id = { [Op.in]: calendario_ids };
  } else {
    switch (scope) {
      case 'mine':
        calWhere.feder_id = await _federIdByUser(user.id, t);
        break;
      case 'feder':
        calWhere.feder_id = feder_id;
        break;
      case 'celula':
        calWhere.celula_id = celula_id;
        break;
      case 'cliente':
        calWhere.cliente_id = cliente_id;
        break;
      case 'global': {
        const tipoGlobal = await m.CalendarioTipo.findOne({ where: { codigo: 'global' }, transaction: t });
        calWhere.tipo_id = tipoGlobal?.id ?? -1;
        break;
      }
    }
    calWhere.is_activo = true;
  }

  const myFeder = await _federIdByUser(user.id, t);
  const calendars = await m.CalendarioLocal.findAll({
    where: calWhere,
    include: [{ model: m.VisibilidadTipo, as: 'visibilidad', attributes: ['codigo'] }],
    transaction: t
  });
  const visibleCalIds = calendars
    .filter(c =>
      c.visibilidad?.codigo === 'organizacion' ||
      c.visibilidad?.codigo === 'equipo' ||
      (c.visibilidad?.codigo === 'privado' && c.feder_id === myFeder)
    )
    .map(c => c.id);

  if (!visibleCalIds.length) return { events: [], overlays: [] };

  const baseWhere = {
    calendario_local_id: { [Op.in]: visibleCalIds },
    ..._overlapWhere(start, end)
  };
  if (q) baseWhere.titulo = { [Op.iLike]: `%${q}%` };

  const rows = await m.Evento.findAll({ where: baseWhere, ...SELECT_BASE, transaction: t });
  const expanded = expand_recurrences ? await _expandRecurrences(rows, start, end) : rows;

  let overlays = [];
  if (include_overlays) {
    overlays = expanded.filter(e =>
      ['asistencia','ausencia','tarea_vencimiento'].includes(e.tipo?.codigo));
  }

  return { events: expanded, overlays };
}

async function _expandRecurrences(rows, start, end) {
  const res = [];
  for (const e of rows) {
    if (!e.rrule) { res.push(e); continue; }
    try {
      const rule = RRule.fromString(e.rrule);
      const insts = rule.between(start, end, true);
      if (!insts.length) continue;
      const dur = new Date(e.ends_at) - new Date(e.starts_at);
      for (const dt of insts) {
        const plain = e.get({ plain: true });
        plain.starts_at = dt;
        plain.ends_at = new Date(dt.getTime() + dur);
        plain.recurrence_instance = true;
        res.push(plain);
      }
    } catch {
      res.push(e);
    }
  }
  return res;
}

export async function upsertEvent(payload, user, t) {
  const tipo = await m.EventoTipo.findOne({ where: { codigo: payload.tipo_codigo }, transaction: t });
  const vis  = await m.VisibilidadTipo.findOne({ where: { codigo: payload.visibilidad_codigo }, transaction: t });
  if (!tipo || !vis) throw Object.assign(new Error('tipo/visibilidad inválidos'), { status: 400 });

  const base = {
    calendario_local_id: payload.calendario_local_id,
    tipo_id: tipo.id,
    titulo: payload.titulo,
    descripcion: payload.descripcion ?? null,
    lugar: payload.lugar ?? null,
    all_day: !!payload.all_day,
    starts_at: payload.starts_at,
    ends_at: payload.ends_at,
    rrule: payload.rrule ?? null,
    visibilidad_id: vis.id,
    color: payload.color ?? null,
    asistencia_registro_id: payload.asistencia_registro_id ?? null,
    ausencia_id: payload.ausencia_id ?? null,
    tarea_id: payload.tarea_id ?? null,
    created_by_user_id: user.id,
    updated_by_user_id: user.id
  };

  let row;
  if (payload.id) {
    row = await m.Evento.findByPk(payload.id, { transaction: t });
    if (!row) throw Object.assign(new Error('Evento no encontrado'), { status: 404 });
    await row.update(base, { transaction: t });
  } else {
    row = await m.Evento.create(base, { transaction: t });
  }

  await m.EventoAsistente.destroy({ where: { evento_id: row.id }, transaction: t });
  for (const a of (payload.asistentes || [])) {
    const tipoAs = await m.AsistenteTipo.findOne({ where: { codigo: a.tipo_codigo }, transaction: t });
    if (!tipoAs) continue;
    await m.EventoAsistente.create({
      evento_id: row.id, tipo_id: tipoAs.id,
      feder_id: a.feder_id ?? null, email_externo: a.email_externo ?? null,
      nombre: a.nombre ?? null, respuesta: a.respuesta ?? 'needsAction'
    }, { transaction: t });
  }

  return m.Evento.findByPk(row.id, { ...SELECT_BASE, transaction: t });
}

export async function deleteEvent(id, t) {
  const row = await m.Evento.findByPk(id, { transaction: t });
  if (!row) return 0;
  await m.EventoAsistente.destroy({ where: { evento_id: id }, transaction: t });
  await row.destroy({ transaction: t });
  return 1;
}

// RSVP del asistente autenticado
export async function setMyRsvp(evento_id, user_id, respuesta, t) {
  const myFeder = await _federIdByUser(user_id, t);
  if (!myFeder) throw Object.assign(new Error('Feder no asociado'), { status: 400 });

  const ea = await m.EventoAsistente.findOne({
    where: { evento_id, feder_id: myFeder },
    transaction: t
  });
  if (!ea) throw Object.assign(new Error('No sos asistente del evento'), { status: 403 });

  await ea.update({ respuesta }, { transaction: t });
  return ea;
}
