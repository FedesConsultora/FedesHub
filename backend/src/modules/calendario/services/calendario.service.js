// /backend/src/modules/calendario/services/calendario.service.js
import { listCalendarsForQuery, upsertCalendar } from '../repositories/calendario.repo.js';
import { listEventsRange, upsertEvent, deleteEvent, setMyRsvp } from '../repositories/eventos.repo.js';
import { svcCreate as createNotif } from '../../notificaciones/services/notificaciones.service.js';
import { initModels } from '../../../models/registry.js';
import { sequelize } from '../../../core/db.js';
import { Op } from 'sequelize';

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

/* ─────────────────────────────────────────────────────────────────────────────
   Crear/Actualizar evento → notificaciones + email
   - Invitación a asistentes nuevos
   - Actualización a asistentes existentes
   - Removidos del evento
   - Difusión a watchers (suscriptores) del calendario o dueño en personales
────────────────────────────────────────────────────────────────────────────── */
export const svcUpsertEvent = async (payload, user) => {
  const t = await sequelize.transaction();
  const wasUpdate = !!payload.id;
  try {
    const m = await initModels();
    // asistentes previos para detectar agregados/removidos
    let prevFederIds = [];
    if (wasUpdate) {
      const prev = await m.Evento.findByPk(payload.id, {
        include: [{ model: m.EventoAsistente, as: 'asistentes' }],
        transaction: t
      });
      prevFederIds = (prev?.asistentes || []).map(a => a.feder_id).filter(Boolean);
    }

    const row = await upsertEvent(payload, user, t);
    await t.commit();

    const nowFederIds   = (row.asistentes || []).map(a => a.feder_id).filter(Boolean);
    const addedFederIds   = nowFederIds.filter(x => !prevFederIds.includes(x));
    const removedFederIds = prevFederIds.filter(x => !nowFederIds.includes(x));

    const destinosTodos    = await _destinosForFederIds(nowFederIds);
    const destinosAdded    = await _destinosForFederIds(addedFederIds);
    const destinosRemoved  = await _destinosForFederIds(removedFederIds);
    const destinosWatchers = await _buildDestinosForWatchers(row.calendario_local_id, nowFederIds);

    // Invitaciones a nuevos
    if (destinosAdded.length) {
      await _notifyAndEmail('evento_invitacion', `Invitación: ${row.titulo}`, row, destinosAdded, user);
      _log('upsert:add', { evento_id: row.id, added: destinosAdded.length });
    }
    // Actualización a todos (si hubo update)
    if (wasUpdate && destinosTodos.length) {
      await _notifyAndEmail('evento_actualizado', `Actualizado: ${row.titulo}`, row, destinosTodos, user);
      _log('upsert:update', { evento_id: row.id, asistentes: destinosTodos.length });
    }
    // Removidos
    if (destinosRemoved.length) {
      await _notifyAndEmail('evento_removido', `Ya no formás parte: ${row.titulo}`, row, destinosRemoved, user);
      _log('upsert:removed', { evento_id: row.id, removed: destinosRemoved.length });
    }
    // Difusión a watchers cuando es nuevo
    if (!wasUpdate && destinosWatchers.length) {
      await _notifyAndEmail('evento_nuevo', `Nuevo evento en calendario: ${row.titulo}`, row, destinosWatchers, user);
      _log('upsert:watchers', { evento_id: row.id, watchers: destinosWatchers.length });
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
      await _notifyAndEmail('evento_cancelado', `Cancelado: ${row.titulo}`, row, destinos, user);
      _log('delete', { evento_id: row.id, notified: destinos.length });
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

    // Notificar al dueño del calendario (si lo hay)
    const m = await initModels();
    const ev = await m.Evento.findByPk(evento_id, { include: [{ model: m.CalendarioLocal, as:'calendarioLocal' }] });
    const ownerFeder = ev?.calendarioLocal?.feder_id ? [ev.calendarioLocal.feder_id] : [];
    const destinosOwner = await _destinosForFederIds(ownerFeder);
    if (destinosOwner.length) {
      await _notifyAndEmail('evento_rsvp', `RSVP actualizado: ${ev?.titulo || ''}`, ev, destinosOwner, user, { rsvp: respuesta });
      _log('rsvp', { evento_id, respuesta, to: destinosOwner.length });
    }

    return row;
  } catch (e) { await t.rollback(); throw e; }
};

// ───────────────────── Helpers de destinos ─────────────────────
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

async function _destinosForFederIds(federIds = []) {
  const uniq = [...new Set(federIds.filter(Boolean))];
  const res = [];
  for (const fid of uniq) {
    const user_id = await _userIdByFeder(fid);
    if (user_id) res.push({ user_id, feder_id: fid });
  }
  return res;
}

// Watchers (suscriptores) del calendario, excluyendo asistentes para no duplicar
async function _buildDestinosForWatchers(calendario_local_id, excludeFederIds = []) {
  const m = await initModels();
  const excl = new Set(excludeFederIds.filter(Boolean));
  const outFeder = new Set();
  try {
    if (m.CalendarioSuscripcion) {
      const subs = await m.CalendarioSuscripcion.findAll({
        where: { calendario_local_id, is_activo: true }
      });
      subs.forEach(s => { if (s.feder_id && !excl.has(s.feder_id)) outFeder.add(s.feder_id) });
    }
  } catch {}
  // Fallback: en calendarios personales privados, avisar al dueño si no está en asistentes
  try {
    const cal = await m.CalendarioLocal.findByPk(calendario_local_id, {
      include: [{ model: m.VisibilidadTipo, as: 'visibilidad' }]
    });
    if (cal?.visibilidad?.codigo === 'privado' && cal.feder_id && !excl.has(cal.feder_id)) {
      outFeder.add(cal.feder_id);
    }
  } catch {}
  return _destinosForFederIds([...outFeder]);
}

// ───────────────────── Notificación + Email ─────────────────────
async function _notifyAndEmail(tipo_codigo, titulo, evento, destinos, actorUser, extra = {}) {
  try {
    await createNotif({
      tipo_codigo,
      titulo,
      mensaje: null,
      evento_id: evento?.id,
      destinos
    }, actorUser);
  } catch (e) {
    console.error('[cal:notif] fail', tipo_codigo, e?.message || e);
  }
  try {
    await _sendCalendarEmails(tipo_codigo, titulo, evento, destinos, extra);
  } catch (e) {
    console.error('[cal:email] fail', tipo_codigo, e?.message || e);
  }
}

function _log(tag, payload) {
  if (process.env.LOG_CALENDAR === '1' || process.env.LOG_LEVEL === 'debug') {
    console.log('[cal]', tag, JSON.stringify(payload));
  }
}

function _eventUrl(ev) {
  const base = process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL || '';
  return base ? `${base.replace(/\/+$/,'')}/calendario?event=${ev?.id}` : null;
}

async function _sendCalendarEmails(kind, titulo, ev, destinos, extra = {}) {
  const url = _eventUrl(ev);
  const subject = (() => {
    switch (kind) {
      case 'evento_invitacion': return `Invitación: ${ev?.titulo || ''}`;
      case 'evento_actualizado': return `Actualizado: ${ev?.titulo || ''}`;
      case 'evento_cancelado': return `Cancelado: ${ev?.titulo || ''}`;
      case 'evento_removido': return `Ya no formás parte: ${ev?.titulo || ''}`;
      case 'evento_nuevo': return `Nuevo evento: ${ev?.titulo || ''}`;
      case 'evento_rsvp': return `RSVP: ${ev?.titulo || ''} → ${extra?.rsvp || ''}`;
      default: return titulo || `Evento: ${ev?.titulo || ''}`;
    }
  })();

  const bodyText =
`Título: ${ev?.titulo || '(sin título)'}
Cuándo: ${ev?.starts_at ? new Date(ev.starts_at).toLocaleString() : '—'}${ev?.all_day ? ' (todo el día)' : ''}${ev?.ends_at ? ' – ' + new Date(ev.ends_at).toLocaleString() : ''}
Dónde: ${ev?.lugar || '—'}
${url ? `Ver evento: ${url}` : ''}`;

  // import dinámico para no romper si el módulo de mail no existe aún
  let sendMail;
  try { ({ svcSend: sendMail } = await import('../../mail/services/mail.service.js')) } catch { sendMail = null }
  if (!sendMail) return;

  const to_users = destinos.map(d => d.user_id).filter(Boolean);
  if (!to_users.length) return;
  await sendMail({
    to_users,
    subject,
    text: bodyText,
    html: bodyText.replace(/\n/g,'<br/>'),
    template: null,
    data: { event_id: ev?.id, url, kind, ...extra }
  });
}