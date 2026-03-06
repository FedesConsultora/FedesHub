// /backend/src/modules/calendario/repositories/eventos.repo.js
import { Op } from 'sequelize';
import RRulePkg from 'rrule';
const { RRule } = RRulePkg;
import { initModels } from '../../../models/registry.js';
import { feriadosService } from '../../../lib/feriados.service.js';
// Importación diferida para evitar ciclos
let googleService;
async function getGoogleService() {
  if (!googleService) googleService = await import('../services/google.service.js');
  return googleService;
}
const m = await initModels();

const SELECT_BASE = {
  include: [
    {
      model: m.CalendarioLocal, as: 'calendarioLocal',
      include: [{ model: m.VisibilidadTipo, as: 'visibilidad', attributes: ['codigo'] }]
    },
    { model: m.EventoTipo, as: 'tipo' },
    { model: m.VisibilidadTipo, as: 'visibilidad' },
    { model: m.EventoAsistente, as: 'asistentes' }
  ],
  order: [['starts_at', 'ASC'], ['id', 'ASC']]
};

async function _federIdByUser(user_id, t) {
  const row = await m.Feder.findOne({ where: { user_id }, transaction: t });
  return row?.id ?? null;
}

function _overlapWhere(start, end) {
  return {
    [Op.or]: [
      { starts_at: { [Op.between]: [start, end] } },
      { ends_at: { [Op.between]: [start, end] } },
      { [Op.and]: [{ starts_at: { [Op.lte]: start } }, { ends_at: { [Op.gte]: end } }] }
    ]
  };
}

export async function listEventsRange(params, user, t) {
  const { start, end, calendario_ids, scope, feder_id, cliente_id,
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
  // visibility filtering...
  const visibleCalIds = calendars
    .filter(c =>
      c.visibilidad?.codigo === 'organizacion' ||
      c.visibilidad?.codigo === 'equipo' ||
      (c.visibilidad?.codigo === 'privado' && c.feder_id === myFeder)
    )
    .map(c => c.id);

  // synthetic events (bdays/hdays) always show up even if no calendars are visible
  const bdays = await _getBirthdaysInRange(start, end, t, params.feder_id);
  const hdays = await _getHolidaysInRange(start, end);

  if (!visibleCalIds.length) {
    return { events: [...bdays, ...hdays], overlays: [] };
  }

  const baseWhere = {
    calendario_local_id: { [Op.in]: visibleCalIds },
    ..._overlapWhere(start, end)
  };
  if (q) baseWhere.titulo = { [Op.iLike]: `%${q}%` };

  // If feder_id filter is present, also filter non-synthetic events
  if (params.feder_id) {
    // This is a simple version, might need a join or more complex check if we want strict filtering
    // For now we'll filter by created_by or attendees if we were to be precise.
    // But birthdays/holidays are already filtered or global.
  }

  const rows = await m.Evento.findAll({ where: baseWhere, ...SELECT_BASE, transaction: t });
  const expanded = expand_recurrences ? await _expandRecurrences(rows, start, end) : rows;

  let finalEvents = [...expanded, ...bdays, ...hdays];

  // Apply feder_id filter if requested
  if (params.feder_id) {
    finalEvents = finalEvents.filter(e => {
      if (e.is_synthetic && e.tipo?.codigo === 'cumpleanos') {
        // Birthdays are for a specific feder, ID is encoded in our synthetic ID: bday-{f.id}-{y}
        return e.id.startsWith(`bday-${params.feder_id}-`);
      }
      if (e.is_synthetic && e.tipo?.codigo === 'feriado') return true; // Holidays are for everyone

      // Regular events: check attendees
      if (e.asistentes && Array.isArray(e.asistentes)) {
        return e.asistentes.some(a => a.feder_id === params.feder_id);
      }
      return false;
    });
  }

  let overlays = [];
  if (include_overlays) {
    overlays = finalEvents.filter(e =>
      ['asistencia', 'ausencia', 'tarea_vencimiento', 'cumpleanos', 'feriado'].includes(e.tipo?.codigo));
  }

  return { events: finalEvents, overlays };
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
  const vis = await m.VisibilidadTipo.findOne({ where: { codigo: payload.visibilidad_codigo }, transaction: t });
  if (!tipo || !vis) throw Object.assign(new Error('tipo/visibilidad inválidos'), { status: 400 });

  const base = {
    calendario_local_id: payload.calendario_local_id,
    tipo_id: tipo.id,
    titulo: payload.titulo,
    descripcion: payload.descripcion ?? null,
    lugar: payload.lugar ?? null,
    google_meet: !!payload.google_meet,
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

  const finalRow = await m.Evento.findByPk(row.id, { ...SELECT_BASE, transaction: t });

  // Sincronizar con Google (Fuera de la transacción principal para no bloquear)
  setImmediate(async () => {
    try {
      const gSvc = await getGoogleService();
      await gSvc.svcGoogleUpsertEvent(finalRow, user.id);
    } catch (err) {
      console.error('[upsertEvent:sync] Error sync Google:', err.message);
    }
  });

  return finalRow;
}

export async function deleteEvent(id, user_id, t) {
  // Primero avisar a Google antes de borrar localmente (necesitamos los datos de sync)
  try {
    const gSvc = await getGoogleService();
    await gSvc.svcGoogleDeleteEvent(id, user_id);
  } catch (err) {
    console.error('[deleteEvent:sync] Error sync Google:', err.message);
  }

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

// 🧁 Helper: Cumpleaños en el rango (Sintético)
async function _getBirthdaysInRange(start, end, t, only_feder_id = null) {
  const whereFeder = { fecha_nacimiento: { [Op.not]: null }, is_activo: true };
  if (only_feder_id) whereFeder.id = only_feder_id;

  const feders = await m.Feder.findAll({
    where: whereFeder,
    transaction: t
  });
  const res = [];

  // Garantizar strings YYYY-MM-DD para comparaciones
  const rangeStart = (start instanceof Date ? start.toISOString() : String(start)).split('T')[0];
  const rangeEnd = (end instanceof Date ? end.toISOString() : String(end)).split('T')[0];

  const sYear = parseInt(rangeStart.split('-')[0]);
  const eYear = parseInt(rangeEnd.split('-')[0]);

  for (const f of feders) {
    let bMonth, bDay;
    if (typeof f.fecha_nacimiento === 'string') {
      const parts = f.fecha_nacimiento.split('-');
      if (parts.length < 3) continue;
      bMonth = parts[1];
      bDay = parts[2];
    } else if (f.fecha_nacimiento instanceof Date) {
      bMonth = String(f.fecha_nacimiento.getUTCMonth() + 1).padStart(2, '0');
      bDay = String(f.fecha_nacimiento.getUTCDate()).padStart(2, '0');
    } else {
      continue;
    }

    for (let y = sYear; y <= eYear; y++) {
      const dateStr = `${y}-${bMonth}-${bDay}`;
      if (dateStr >= rangeStart && dateStr <= rangeEnd) {
        res.push({
          id: `bday-${f.id}-${y}`,
          titulo: `🎂 Cumple ${f.nombre} ${f.apellido}`.trim(),
          all_day: true,
          starts_at: `${dateStr}T00:00:00`,
          ends_at: `${dateStr}T23:59:59`,
          tipo: { codigo: 'cumpleanos', nombre: 'Cumpleaños' },
          visibilidad: { codigo: 'organizacion' },
          color: '#ec4899', // pink-500
          is_readonly: true,
          is_synthetic: true
        });
      }
    }
  }
  return res;
}

// 🇦🇷 Helper: Feriados en el rango (vía ArgentinaDatos API)
async function _getHolidaysInRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const sYear = s.getUTCFullYear();
  const eYear = e.getUTCFullYear();
  const rangeStartStr = s.toISOString().split('T')[0];
  const rangeEndStr = e.toISOString().split('T')[0];

  const years = [];
  for (let y = sYear; y <= eYear; y++) years.push(y);

  const res = [];
  for (const year of years) {
    try {
      const data = await feriadosService.getFeriados(year);
      // data: [{ fecha, tipo, nombre }]
      for (const h of data) {
        if (h.fecha >= rangeStartStr && h.fecha <= rangeEndStr) {
          res.push({
            id: `holiday-${h.fecha}-${h.nombre}`,
            titulo: `🇦🇷 ${h.nombre}`,
            all_day: true,
            starts_at: `${h.fecha}T00:00:00`,
            ends_at: `${h.fecha}T23:59:59`,
            tipo: { codigo: 'feriado', nombre: 'Feriado' },
            visibilidad: { codigo: 'organizacion' },
            color: '#e11d48', // rose-600
            is_readonly: true,
            is_synthetic: true
          });
        }
      }
    } catch (err) {
      console.error(`[eventos.repo:feriados] Fail for year ${year}:`, err.message);
    }
  }
  return res;
}
