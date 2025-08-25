// /backend/src/modules/calendario/repositories/google.repo.js
import pkg from '@googleapis/calendar';
const { google } = pkg;
import { initModels } from '../../../models/registry.js';
const m = await initModels();

function gcClient(refresh_token, client_id = process.env.GOOGLE_CLIENT_ID, client_secret = process.env.GOOGLE_CLIENT_SECRET) {
  const { OAuth2 } = google.auth;
  const auth = new OAuth2(client_id, client_secret);
  auth.setCredentials({ refresh_token });
  return google.calendar({ version: 'v3', auth });
}

export async function listRemoteCalendars(googleCuentaId, t) {
  const acct = await m.GoogleCuenta.findByPk(googleCuentaId, { transaction: t });
  if (!acct?.refresh_token_enc) {
    throw Object.assign(new Error('Cuenta Google no válida'), { status: 400 });
  }
  const cal = gcClient(acct.refresh_token_enc);
  const res = await cal.calendarList.list({});
  return res.data.items || [];
}

export async function upsertGoogleCalendario(cuenta_id, remote, t) {
  const [row] = await m.GoogleCalendario.findOrCreate({
    where: { cuenta_id, google_calendar_id: remote.id },
    defaults: {
      cuenta_id, google_calendar_id: remote.id,
      summary: remote.summary || null,
      time_zone: remote.timeZone || null,
      access_role: remote.accessRole || null,
      is_primary: !!remote.primary,
      color_id: remote.colorId || null
    },
    transaction: t
  });

  if (!row.isNewRecord) {
    await row.update({
      summary: remote.summary || row.summary,
      time_zone: remote.timeZone || row.time_zone,
      access_role: remote.accessRole || row.access_role,
      is_primary: !!remote.primary,
      color_id: remote.colorId || row.color_id
    }, { transaction: t });
  }
  return row;
}

export async function linkCalendario(calendario_local_id, google_calendar_id, direccion_id, user_id, t) {
  const acct = await m.GoogleCuenta.findOne({ where: { user_id }, transaction: t });
  if (!acct) throw Object.assign(new Error('Conectá tu Google antes de vincular'), { status: 400 });

  const cal = gcClient(acct.refresh_token_enc);
  const remote = (await cal.calendars.get({ calendarId: google_calendar_id })).data;
  const gc = await upsertGoogleCalendario(acct.id, remote, t);

  const v = await m.CalendarioVinculo.findOne({ where: { calendario_local_id, google_cal_id: gc.id }, transaction: t });
  if (v) {
    await v.update({ direccion_id }, { transaction: t });
    return v;
  }
  return m.CalendarioVinculo.create({ calendario_local_id, google_cal_id: gc.id, direccion_id, is_activo: true }, { transaction: t });
}

export async function saveWatchChannel(cuenta_id, google_cal_id, channel) {
  return m.GoogleWebhookCanal.create({
    cuenta_id, google_cal_id,
    channel_id: channel.id,
    resource_id: channel.resourceId,
    resource_uri: channel.resourceUri,
    expiration_at: channel.expiration ? new Date(Number(channel.expiration)) : null,
    is_activo: true
  });
}

export async function deactivateChannelByHeader(channel_id, resource_id) {
  const row = await m.GoogleWebhookCanal.findOne({ where: { channel_id, resource_id, is_activo: true } });
  if (!row) return null;
  await row.update({ is_activo: false });
  return row;
}

/* ========== Helpers de mapeo ========== */

function parseGoogleDate(item) {
  // all-day → date (sin hora); con hora → dateTime
  const ds = item.start?.dateTime || item.start?.date;
  const de = item.end?.dateTime   || item.end?.date;
  const allDay = !!item.start?.date; // si viene 'date' es allDay
  return {
    starts_at: ds ? new Date(ds) : null,
    ends_at:   de ? new Date(de) : null,
    all_day: allDay
  };
}

function extractRRule(item) {
  // Google manda recurrence como ['RRULE:FREQ=...;...']
  const r = Array.isArray(item.recurrence) ? item.recurrence.find(s => s.startsWith('RRULE:')) : null;
  return r ? r.replace(/^RRULE:/,'') : null;
}

/**
 * upsert de un item Google a Evento + EventoSync
 * - Crea o actualiza el Evento local
 * - Mantiene EventoSync por (google_cal_id, google_event_id)
 */
export async function upsertFromGoogleItem(vinc, gItem, t) {
  const isCancelled = gItem.status === 'cancelled';
  const syncWhere = { google_cal_id: vinc.google_cal_id, google_event_id: gItem.id };
  const syncRow = await m.EventoSync.findOne({ where: syncWhere, transaction: t });

  if (isCancelled) {
    // cancelar local si existe
    if (syncRow?.evento_id) {
      await m.EventoAsistente.destroy({ where: { evento_id: syncRow.evento_id }, transaction: t });
      await m.Evento.destroy({ where: { id: syncRow.evento_id }, transaction: t });
    }
    if (syncRow) {
      await syncRow.update({ is_deleted_remote: true, last_error: null, last_synced_at: new Date() }, { transaction: t });
      return { deleted: true };
    } else {
      await m.EventoSync.create({ ...syncWhere, is_deleted_remote: true }, { transaction: t });
      return { deleted: true };
    }
  }

  // Datos base → Evento
  const { starts_at, ends_at, all_day } = parseGoogleDate(gItem);
  const rrule = extractRRule(gItem);
  const tipo = await m.EventoTipo.findOne({ where: { codigo: 'interno' }, transaction: t });
  const vis  = await m.VisibilidadTipo.findOne({ where: { codigo: 'organizacion' }, transaction: t });

  // Si no tenemos tipo/vis, abortamos
  if (!tipo || !vis) throw Object.assign(new Error('Faltan catálogos EventoTipo/VisibilidadTipo'), { status: 500 });

  let evento;
  if (syncRow?.evento_id) {
    evento = await m.Evento.findByPk(syncRow.evento_id, { transaction: t });
    if (evento) {
      await evento.update({
        calendario_local_id: vinc.calendario_local_id,
        tipo_id: tipo.id,
        titulo: gItem.summary || '(sin título)',
        descripcion: gItem.description || null,
        lugar: gItem.location || null,
        all_day,
        starts_at,
        ends_at,
        rrule: rrule || null,
        visibilidad_id: vis.id,
        color: null,
        updated_by_user_id: null
      }, { transaction: t });
    }
  }
  if (!evento) {
    evento = await m.Evento.create({
      calendario_local_id: vinc.calendario_local_id,
      tipo_id: tipo.id,
      titulo: gItem.summary || '(sin título)',
      descripcion: gItem.description || null,
      lugar: gItem.location || null,
      all_day,
      starts_at,
      ends_at,
      rrule: rrule || null,
      visibilidad_id: vis.id,
      color: null,
      created_by_user_id: null,
      updated_by_user_id: null
    }, { transaction: t });
  }

  // Sincronía
  const payloadSync = {
    evento_id: evento.id,
    google_cal_id: vinc.google_cal_id,
    google_event_id: gItem.id,
    etag: gItem.etag || null,
    ical_uid: gItem.iCalUID || null,
    recurring_event_id: gItem.recurringEventId || null,
    original_start_time: gItem.originalStartTime?.dateTime ? new Date(gItem.originalStartTime.dateTime) :
                         gItem.originalStartTime?.date ? new Date(gItem.originalStartTime.date) : null,
    last_synced_at: new Date(),
    last_error: null,
    is_deleted_remote: false,
    is_deleted_local: false
  };

  if (syncRow) {
    await syncRow.update(payloadSync, { transaction: t });
  } else {
    await m.EventoSync.create(payloadSync, { transaction: t });
  }

  // (Opcional) asistentes remotos → EventoAsistente como 'externo'
  try {
    if (Array.isArray(gItem.attendees) && gItem.attendees.length) {
      const asTipo = await m.AsistenteTipo.findOne({ where: { codigo: 'externo' }, transaction: t });
      await m.EventoAsistente.destroy({ where: { evento_id: evento.id }, transaction: t });
      for (const a of gItem.attendees) {
        await m.EventoAsistente.create({
          evento_id: evento.id,
          tipo_id: asTipo?.id,
          feder_id: null,
          email_externo: a.email || null,
          nombre: a.displayName || null,
          respuesta: a.responseStatus || null
        }, { transaction: t });
      }
    }
  } catch { /* no crítico */ }

  return { upserted: true, evento_id: evento.id };
}
