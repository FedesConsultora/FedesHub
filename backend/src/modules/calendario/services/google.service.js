// /backend/src/modules/calendario/services/google.service.js
import pkg from '@googleapis/calendar';
const { google } = pkg;

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
        updatedMin: new Date(Date.now() - 90*24*3600*1000).toISOString(),
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