// /backend/src/modules/calendario/services/google.service.js
import { google } from 'googleapis';

import { initModels } from '../../../models/registry.js';
import {
  listRemoteCalendars, linkCalendario, saveWatchChannel,
  deactivateChannelByHeader, upsertFromGoogleItem
} from '../repositories/google.repo.js';

const m = await initModels();

function clientForCuenta(acct) {
  const { OAuth2 } = google.auth;
  const auth = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: acct.refresh_token_enc });
  return google.calendar({ version: 'v3', auth });
}

export async function svcGoogleListCalendars(user) {
  const acct = await m.GoogleCuenta.findOne({ where: { user_id: user.id } });
  if (!acct) throw Object.assign(new Error('No hay cuenta Google conectada'), { status: 400 });
  return listRemoteCalendars(acct.id);
}

export async function svcGoogleLink(body, user) {
  const t = await m.sequelize.transaction();
  try {
    const dir = await m.SyncDireccionTipo.findOne({ where: { codigo: body.direccion_codigo }, transaction: t });
    if (!dir) throw Object.assign(new Error('direccion inválida'), { status: 400 });
    const v = await linkCalendario(body.calendario_local_id, body.google_calendar_id, dir.id, user.id, t);
    await t.commit();
    return v;
  } catch (e) { await t.rollback(); throw e; }
}

export async function svcGoogleSyncOne(body, user) {
  const vinc = await m.CalendarioVinculo.findOne({
    where: { calendario_local_id: body.calendario_local_id, is_activo: true },
    include: [{ model: m.GoogleCalendario, as: 'googleCalendario' }]
  });
  if (!vinc) throw Object.assign(new Error('Calendario no vinculado'), { status: 400 });

  const acct = await m.GoogleCuenta.findOne({ where: { user_id: user.id } });
  if (!acct) throw Object.assign(new Error('Conectá tu Google'), { status: 400 });

  const cal = clientForCuenta(acct);
  let pageToken = undefined;
  let syncToken = vinc.sync_token || undefined;
  let count = 0;

  try {
    do {
      const res = await cal.events.list({
        calendarId: vinc.googleCalendario.google_calendar_id,
        pageToken,
        syncToken,
        showDeleted: true,
        singleEvents: false
      });
      const items = res.data.items || [];
      for (const it of items) {
        await upsertFromGoogleItem(vinc, it, m.sequelize);
        count++;
      }
      pageToken = res.data.nextPageToken;
      if (res.data.nextSyncToken) syncToken = res.data.nextSyncToken;
    } while (pageToken);

    await vinc.update({ sync_token: syncToken, last_synced_at: new Date() });
    console.log('[cal:gsync] ok calendario_local_id=%s items=%s', body.calendario_local_id, count);
    return { synced: count };
  } catch (err) {
    if (err?.code === 410) {
      const res = await cal.events.list({
        calendarId: vinc.googleCalendario.google_calendar_id,
        updatedMin: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
        showDeleted: true
      });
      const items = res.data.items || [];
      for (const it of items) {
        await upsertFromGoogleItem(vinc, it, m.sequelize);
        count++;
      }
      await vinc.update({ sync_token: res.data.nextSyncToken ?? null, last_synced_at: new Date() });
      console.log('[cal:gsync] resynced calendario_local_id=%s items=%s', body.calendario_local_id, count);
      return { resynced: count };
    }
    throw err;
  }
}

export async function svcGoogleStartWatch(calendario_local_id, user) {
  const vinc = await m.CalendarioVinculo.findOne({
    where: { calendario_local_id, is_activo: true },
    include: [{ model: m.GoogleCalendario, as: 'googleCalendario' }]
  });
  if (!vinc) throw Object.assign(new Error('Calendario no vinculado'), { status: 400 });

  const acct = await m.GoogleCuenta.findOne({ where: { user_id: user.id } });
  if (!acct) throw Object.assign(new Error('Conectá tu Google'), { status: 400 });
  const cal = clientForCuenta(acct);

  const channel = {
    id: `cal-${vinc.google_cal_id}-${Date.now()}`,
    type: 'web_hook',
    address: process.env.GOOGLE_WEBHOOK_URL,
    params: { ttl: '86400' }
  };
  const res = await cal.events.watch({ calendarId: vinc.googleCalendario.google_calendar_id, requestBody: channel });
  const saved = await saveWatchChannel(acct.id, vinc.google_cal_id, res.data);
  return { channel: saved };
}

export async function svcGoogleStopWatch(channel_id, resource_id, user) {
  const acct = await m.GoogleCuenta.findOne({ where: { user_id: user.id } });
  if (!acct) throw Object.assign(new Error('Conectá tu Google'), { status: 400 });
  const cal = clientForCuenta(acct);
  await cal.channels.stop({ requestBody: { id: channel_id, resourceId: resource_id } });
  await deactivateChannelByHeader(channel_id, resource_id);
  return { stopped: true };
}

export async function svcGoogleWebhook(headers) {
  const channel_id = headers['x-goog-channel-id'];
  const resource_id = headers['x-goog-resource-id'];
  const state = headers['x-goog-resource-state'] || 'exists';

  const canal = await m.GoogleWebhookCanal.findOne({
    where: { channel_id, resource_id, is_activo: true },
    include: [{ model: m.GoogleCalendario, as: 'googleCalendario' }]
  });
  if (!canal) return { ok: true, ignored: true };

  try {
    await m.sequelize.transaction(async (t) => {
      const vinc = await m.CalendarioVinculo.findOne({
        where: { google_cal_id: canal.google_cal_id, is_activo: true },
        transaction: t,
        include: [{ model: m.GoogleCalendario, as: 'googleCalendario' }]
      });
      if (vinc) await vinc.update({ updated_at: new Date() }, { transaction: t });
    });
  } catch { /* noop */ }

  return { ok: true, state };
}

export async function svcGoogleCreateMeetEvent(user, eventData) {
  const acct = await m.GoogleCuenta.findOne({ where: { user_id: user.id } });
  if (!acct) throw Object.assign(new Error('No hay cuenta Google conectada'), { status: 400 });

  const cal = clientForCuenta(acct);

  const googleEvent = {
    summary: eventData.titulo,
    description: eventData.descripcion,
    start: { dateTime: eventData.starts_at },
    end: { dateTime: eventData.ends_at },
    attendees: eventData.attendees || [],
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  };

  const res = await cal.events.insert({
    calendarId: 'primary',
    requestBody: googleEvent,
    conferenceDataVersion: 1,
    sendUpdates: 'all'
  });

  return {
    id: res.data.id,
    join_url: res.data.hangoutLink,
    provider: 'google_meet'
  };
}

/**
 * Agrega o actualiza un evento en Google Calendar (Push Hub -> Google)
 */
export async function svcGoogleUpsertEvent(evento, user_id) {
  const vinc = await m.CalendarioVinculo.findOne({
    where: { calendario_local_id: evento.calendario_local_id, is_activo: true },
    include: [{ model: m.GoogleCalendario, as: 'googleCalendario' }]
  });
  if (!vinc) return null; // No vinculado, nada que hacer

  const acct = await m.GoogleCuenta.findOne({ where: { user_id } });
  if (!acct) return null;

  const cal = clientForCuenta(acct);
  const sync = await m.EventoSync.findOne({ where: { evento_id: evento.id, google_cal_id: vinc.google_cal_id } });

  // Buscar asistentes locales para enviar a Google
  const asistentes = await m.EventoAsistente.findAll({
    where: { evento_id: evento.id },
    include: [{ model: m.Feder, as: 'feder', include: [{ model: m.User, as: 'user' }] }]
  });
  const attendees = asistentes.map(a => ({
    email: a.email_externo || a.feder?.user?.email,
    displayName: a.nombre || a.feder?.nombre
  })).filter(a => a.email);

  const gEventBody = {
    summary: evento.titulo,
    description: evento.descripcion,
    location: evento.lugar,
    start: evento.all_day ? { date: evento.starts_at.split('T')[0] } : { dateTime: evento.starts_at },
    end: evento.all_day ? { date: evento.ends_at.split('T')[0] } : { dateTime: evento.ends_at },
    attendees
  };

  let res;
  if (sync && sync.google_event_id && !sync.is_deleted_remote) {
    // Update
    res = await cal.events.update({
      calendarId: vinc.googleCalendario.google_calendar_id,
      eventId: sync.google_event_id,
      requestBody: gEventBody,
      sendUpdates: 'all'
    });
  } else {
    // Create
    res = await cal.events.insert({
      calendarId: vinc.googleCalendario.google_calendar_id,
      requestBody: gEventBody,
      sendUpdates: 'all'
    });
  }

  // Actualizar tabla de sincronización
  const syncData = {
    evento_id: evento.id,
    google_cal_id: vinc.google_cal_id,
    google_event_id: res.data.id,
    etag: res.data.etag,
    last_synced_at: new Date(),
    is_deleted_remote: false
  };

  if (sync) await sync.update(syncData);
  else await m.EventoSync.create(syncData);

  return res.data;
}

/**
 * Elimina un evento en Google Calendar (Push Hub -> Google)
 */
export async function svcGoogleDeleteEvent(evento_id, user_id) {
  const syncs = await m.EventoSync.findAll({
    where: { evento_id, is_deleted_remote: false },
    include: [
      {
        model: m.GoogleCalendario, as: 'googleCalendario',
        include: [{ model: m.GoogleCuenta, as: 'cuenta' }]
      }
    ]
  });

  for (const sync of syncs) {
    if (sync.googleCalendario?.cuenta?.user_id !== user_id) continue;

    try {
      const cal = clientForCuenta(sync.googleCalendario.cuenta);
      await cal.events.delete({
        calendarId: sync.googleCalendario.google_calendar_id,
        eventId: sync.google_event_id,
        sendUpdates: 'all'
      });
      await sync.update({ is_deleted_remote: true, last_synced_at: new Date() });
    } catch (err) {
      console.error('[svcGoogleDeleteEvent] Error:', err.message);
    }
  }
}