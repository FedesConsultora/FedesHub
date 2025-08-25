// /backend/src/modules/calendario/services/calendario.service.js
import { initModels } from '../../../models/registry.js';
import { listCalendarsForQuery, upsertCalendar } from '../repositories/calendario.repo.js';
import { listEventsRange, upsertEvent, deleteEvent, setMyRsvp } from '../repositories/eventos.repo.js';
import { svcCreate as createNotif } from '../../notificaciones/services/notificaciones.service.js';

const mReg = await initModels();
const sequelize = mReg.sequelize;

export const svcListCalendars = (q, user) => listCalendarsForQuery(q, user);

export const svcUpsertCalendar = async (payload, user) => {
  const t = await sequelize.transaction();
  try {
    const row = await upsertCalendar(payload, user, t);
    await t.commit();
    return row;
  } catch (e) { await t.rollback(); throw e; }
};

export const svcListEvents = (q, user) => listEventsRange(q, user);

// Crear/Actualizar evento → notificación (buzón calendario)
export const svcUpsertEvent = async (payload, user) => {
  const t = await sequelize.transaction();
  const wasUpdate = !!payload.id;
  try {
    const row = await upsertEvent(payload, user, t);
    await t.commit();

    const destinos = await _buildDestinosFromAsistentes(row.asistentes);
    if (destinos.length) {
      const tipo_codigo = wasUpdate ? 'evento_actualizado' : 'evento_invitacion';
      try {
        await createNotif({
          tipo_codigo,
          titulo: wasUpdate ? `Actualizado: ${row.titulo}` : `Invitación: ${row.titulo}`,
          mensaje: null,
          evento_id: row.id,
          destinos
        }, user);
      } catch (e) { console.error('notif calendario upsert', e); }
    }
    return row;
  } catch (e) { await t.rollback(); throw e; }
};

// Eliminar evento → notificación de cancelación
export const svcDeleteEvent = async (id, user) => {
  const t = await sequelize.transaction();
  try {
    const m = await initModels();
    const row = await m.Evento.findByPk(id, {
      include: [{ model: m.EventoAsistente, as: 'asistentes' }],
      transaction: t
    });
    if (!row) { await t.rollback(); return { deleted: 0 }; }

    const destinos = await _buildDestinosFromAsistentes(row.asistentes);
    const n = await deleteEvent(id, t);
    await t.commit();

    if (n && destinos.length) {
      try {
        await createNotif({
          tipo_codigo: 'evento_cancelado',
          titulo: `Cancelado: ${row.titulo}`,
          mensaje: null,
          evento_id: row.id,
          destinos
        }, user);
      } catch (e) { console.error('notif calendario cancelado', e); }
    }
    return { deleted: n };
  } catch (e) { await t.rollback(); throw e; }
};

// RSVP asistente autenticado
export const svcSetMyRsvp = async (evento_id, respuesta, user) => {
  const t = await sequelize.transaction();
  try {
    const row = await setMyRsvp(evento_id, user.id, respuesta, t);
    await t.commit();
    return row;
  } catch (e) { await t.rollback(); throw e; }
};

// Helpers
async function _buildDestinosFromAsistentes(asistentes = []) {
  const destinos = [];
  for (const a of asistentes) {
    if (a.feder_id) {
      const user_id = await _userIdByFeder(a.feder_id);
      if (user_id) destinos.push({ user_id, feder_id: a.feder_id });
    }
  }
  return destinos;
}

async function _userIdByFeder(feder_id) {
  const { Feder } = await initModels();
  const f = await Feder.findByPk(feder_id);
  return f?.user_id ?? null;
}
