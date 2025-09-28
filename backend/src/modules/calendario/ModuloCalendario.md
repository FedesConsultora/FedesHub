import { Router } from 'express';

// Middlewares (soporte default y named exports)
import * as authMw from '../auth/middlewares/requireAuth.js';
import * as permMw from '../auth/middlewares/requirePermission.js';
const requireAuth = (authMw?.default ?? authMw?.requireAuth ?? authMw);
const requirePermissionFactory = (permMw?.default ?? permMw?.requirePermission ?? permMw);
const requirePermission = (mod, act) => requirePermissionFactory(mod, act);

// Controllers
import * as cal from './controllers/calendario.controller.js';
import * as gcal from './controllers/google.controller.js';
import { ping } from './controllers/health.controller.js';

const router = Router();

// Health
router.get('/health', ping);

// Catálogos
router.get('/catalog', requireAuth, requirePermission('calendario','read'), cal.getCatalog);

// Calendarios
router.get('/calendars',     requireAuth, requirePermission('calendario','read'),   cal.getCalendars);
router.post('/calendars',    requireAuth, requirePermission('calendario','create'), cal.postCalendar);
router.put('/calendars/:id', requireAuth, requirePermission('calendario','update'), cal.putCalendar);

// Eventos
router.get('/events',        requireAuth, requirePermission('calendario','read'),   cal.getEvents);
router.post('/events',       requireAuth, requirePermission('calendario','create'), cal.postEvent);
router.put('/events/:id',    requireAuth, requirePermission('calendario','update'), cal.putEvent);
router.delete('/events/:id', requireAuth, requirePermission('calendario','delete'), cal.deleteEvent);

// RSVP (asistente autenticado)
router.post('/events/:id/rsvp', requireAuth, requirePermission('calendario','update'), cal.postMyRsvp);

// Google: listado remoto, link, sync, watch, webhook
router.get('/google/calendars',         requireAuth, requirePermission('calendario','read'),   gcal.listRemoteCalendars);
router.post('/google/link',             requireAuth, requirePermission('calendario','update'), gcal.linkCalendar);
router.post('/google/sync',             requireAuth, requirePermission('calendario','update'), gcal.syncOne);
router.post('/google/watch/:id/start',  requireAuth, requirePermission('calendario','update'), gcal.startWatch);
router.post('/google/watch/stop',       requireAuth, requirePermission('calendario','update'), gcal.stopWatch);

// Webhook público de Google (sin auth)
router.post('/google/webhook', gcal.webhook);

export default router;
// /backend/src/modules/calendario/validators.js
import { z } from 'zod';

export const scopeEnum = z.enum(['mine','feder','celula','cliente','global']);

const asArrayOfInts = (v) => {
  if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
  if (typeof v === 'string') return v.split(',').map(n => parseInt(n,10)).filter(Number.isFinite);
  return undefined;
};

export const listCalendarsQuery = z.object({
  scope: scopeEnum.default('mine'),
  feder_id: z.coerce.number().int().positive().optional(),
  celula_id: z.coerce.number().int().positive().optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  include_inactive: z.coerce.boolean().optional().default(false)
}).refine(v => {
  if (v.scope === 'feder')   return !!v.feder_id;
  if (v.scope === 'celula')  return !!v.celula_id;
  if (v.scope === 'cliente') return !!v.cliente_id;
  return true;
}, { message: 'falta feder_id/celula_id/cliente_id según scope' });

export const upsertCalendarSchema = z.object({
  id: z.number().int().optional(),
  tipo_codigo: z.enum(['personal','celula','cliente','global']),
  nombre: z.string().min(1).max(160),
  visibilidad_codigo: z.enum(['privado','equipo','organizacion']).default('organizacion'),
  feder_id: z.number().int().optional(),
  celula_id: z.number().int().optional(),
  cliente_id: z.number().int().optional(),
  time_zone: z.string().max(60).optional(),
  color: z.string().max(30).optional(),
  is_activo: z.boolean().optional()
});

export const listEventsQuery = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
  calendario_ids: z.preprocess(asArrayOfInts, z.array(z.number().int().positive()).optional()),
  scope: scopeEnum.default('mine'),
  feder_id: z.coerce.number().int().positive().optional(),
  celula_id: z.coerce.number().int().positive().optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  include_overlays: z.coerce.boolean().optional().default(true),
  expand_recurrences: z.coerce.boolean().optional().default(true),
  q: z.string().trim().max(200).optional()
}).refine(v => {
  if (v.scope === 'feder')   return !!v.feder_id || (v.calendario_ids?.length ?? 0) > 0;
  if (v.scope === 'celula')  return !!v.celula_id || (v.calendario_ids?.length ?? 0) > 0;
  if (v.scope === 'cliente') return !!v.cliente_id || (v.calendario_ids?.length ?? 0) > 0;
  return true;
}, { message: 'falta feder_id/celula_id/cliente_id o calendario_ids según scope' });

export const eventAttendee = z.object({
  tipo_codigo: z.enum(['feder','externo']),
  feder_id: z.number().int().optional(),
  email_externo: z.string().email().optional(),
  nombre: z.string().max(160).optional(),
  respuesta: z.enum(['needsAction','accepted','tentative','declined']).optional()
}).refine(v => v.tipo_codigo === 'feder' ? !!v.feder_id : !!v.email_externo,
  { message: 'asistente feder requiere feder_id; externo requiere email_externo' });

export const upsertEventSchema = z.object({
  id: z.number().int().optional(),
  calendario_local_id: z.number().int().positive(),
  tipo_codigo: z.enum(['interno','asistencia','ausencia','tarea_vencimiento']).default('interno'),
  titulo: z.string().min(1).max(200),
  descripcion: z.string().optional(),
  lugar: z.string().max(255).optional(),
  all_day: z.boolean().default(false),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date(),
  rrule: z.string().max(255).nullable().optional(),
  visibilidad_codigo: z.enum(['privado','equipo','organizacion']).default('organizacion'),
  color: z.string().max(30).optional(),
  asistencia_registro_id: z.number().int().optional(),
  ausencia_id: z.number().int().optional(),
  tarea_id: z.number().int().optional(),
  asistentes: z.array(eventAttendee).optional().default([])
}).refine(v => v.ends_at > v.starts_at, { message: 'ends_at debe ser mayor que starts_at' });

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const googleLinkSchema = z.object({
  calendario_local_id: z.number().int().positive(),
  google_calendar_id: z.string().min(1),
  direccion_codigo: z.enum(['pull','push','both','none']).default('both')
});

export const googleSyncOneSchema = z.object({
  calendario_local_id: z.number().int().positive()
});

// RSVP del asistente autenticado
export const rsvpSchema = z.object({
  respuesta: z.enum(['needsAction','accepted','tentative','declined'])
});

export const webhookHeadersSchema = z.object({
  'x-goog-channel-id': z.string(),
  'x-goog-resource-id': z.string(),
  'x-goog-resource-state': z.enum(['exists','sync','not_exists']).optional(),
  'x-goog-message-number': z.string().optional(),
  'x-goog-channel-expiration': z.string().optional()
});
// /backend/src/modules/calendario/controllers/calendario.controller.js
import { initModels } from '../../../models/registry.js';
import {
  listCalendarsQuery, upsertCalendarSchema,
  listEventsQuery, upsertEventSchema, idParam,
  rsvpSchema
} from '../validators.js';
import {
  svcListCalendars, svcUpsertCalendar,
  svcListEvents, svcUpsertEvent, svcDeleteEvent,
  svcSetMyRsvp
} from '../services/calendario.service.js';

await initModels();

export const health = (_req, res) => res.json({ module: 'calendario', ok: true });

export const getCatalog = async (_req, res, next) => {
  try {
    const m = await initModels();
    const [tipos, vis, asisTipos] = await Promise.all([
      m.EventoTipo.findAll({ order: [['codigo','ASC']] }),
      m.VisibilidadTipo.findAll({ order: [['codigo','ASC']] }),
      m.AsistenteTipo.findAll({ order: [['codigo','ASC']] })
    ]);
    res.json({ eventoTipos: tipos, visibilidades: vis, asistenteTipos: asisTipos });
  } catch (e) { next(e); }
};

export const getCalendars = async (req, res, next) => {
  try {
    const q = listCalendarsQuery.parse(req.query);
    res.json(await svcListCalendars(q, req.user));
  } catch (e) { next(e); }
};

export const postCalendar = async (req, res, next) => {
  try {
    const body = upsertCalendarSchema.parse(req.body);
    const row = await svcUpsertCalendar(body, req.user);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

export const putCalendar = async (req, res, next) => {
  try {
    const body = upsertCalendarSchema.parse({ ...req.body, id: Number(req.params.id) });
    res.json(await svcUpsertCalendar(body, req.user));
  } catch (e) { next(e); }
};

export const getEvents = async (req, res, next) => {
  try {
    const q = listEventsQuery.parse(req.query);
    res.json(await svcListEvents(q, req.user));
  } catch (e) { next(e); }
};

export const postEvent = async (req, res, next) => {
  try {
    const body = upsertEventSchema.parse(req.body);
    const row = await svcUpsertEvent(body, req.user);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

export const putEvent = async (req, res, next) => {
  try {
    const body = upsertEventSchema.parse({ ...req.body, id: Number(req.params.id) });
    res.json(await svcUpsertEvent(body, req.user));
  } catch (e) { next(e); }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await svcDeleteEvent(id, req.user));
  } catch (e) { next(e); }
};

export const postMyRsvp = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = rsvpSchema.parse(req.body);
    const row = await svcSetMyRsvp(id, body.respuesta, req.user);
    res.status(200).json(row);
  } catch (e) { next(e); }
};

// /backend/src/modules/calendario/controllers/google.controller.js
import { googleLinkSchema, googleSyncOneSchema, webhookHeadersSchema } from '../validators.js';
import {
  svcGoogleListCalendars, svcGoogleLink, svcGoogleSyncOne,
  svcGoogleStartWatch, svcGoogleStopWatch, svcGoogleWebhook
} from '../services/google.service.js';

export const listRemoteCalendars = async (req, res, next) => {
  try { res.json(await svcGoogleListCalendars(req.user)); } catch (e) { next(e); }
};

export const linkCalendar = async (req, res, next) => {
  try {
    const body = googleLinkSchema.parse(req.body);
    res.status(201).json(await svcGoogleLink(body, req.user));
  } catch (e) { next(e); }
};

export const syncOne = async (req, res, next) => {
  try {
    const body = googleSyncOneSchema.parse(req.body);
    res.json(await svcGoogleSyncOne(body, req.user));
  } catch (e) { next(e); }
};

export const startWatch = async (req, res, next) => {
  try {
    const calendario_local_id = Number(req.params.id);
    res.json(await svcGoogleStartWatch(calendario_local_id, req.user));
  } catch (e) { next(e); }
};

export const stopWatch = async (req, res, next) => {
  try {
    const { channel_id, resource_id } = req.body;
    res.json(await svcGoogleStopWatch(channel_id, resource_id, req.user));
  } catch (e) { next(e); }
};

export const webhook = async (req, res, _next) => {
  try {
    const headers = webhookHeadersSchema.parse(req.headers);
    await svcGoogleWebhook(headers);
    res.status(200).end();
  } catch {
    res.status(200).end();
  }
};
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
// /backend/src/modules/calendario/repositories/calendario.repo.js
import { Op } from 'sequelize';
import { initModels } from '../../../models/registry.js';
const m = await initModels();

async function idByCodigo(model, codigo, t) {
  const row = await model.findOne({ where: { codigo }, transaction: t });
  return row?.id ?? null;
}

async function _federIdByUser(user_id, t) {
  const row = await m.Feder.findOne({ where: { user_id }, transaction: t });
  return row?.id ?? null;
}

function _visibilityWhere(userFederId) {
  return {
    [Op.or]: [
      { '$visibilidad.codigo$': { [Op.in]: ['equipo','organizacion'] } },
      { [Op.and]: [
        { '$visibilidad.codigo$': 'privado' },
        { feder_id: userFederId ?? -1 }
      ]}
    ]
  };
}

export async function listCalendarsForQuery(q, user, t) {
  const where = {};
  const include = [
    { model: m.VisibilidadTipo, as: 'visibilidad', attributes: ['codigo'] }
  ];

  if (!q.include_inactive) where.is_activo = true;

  const myFederId = await _federIdByUser(user.id, t);
  const visWhere = _visibilityWhere(myFederId);

  switch (q.scope) {
    case 'mine':
      where.feder_id = myFederId ?? -1;
      break;
    case 'feder':
      where.feder_id = q.feder_id;
      break;
    case 'celula':
      where.celula_id = q.celula_id;
      break;
    case 'cliente':
      where.cliente_id = q.cliente_id;
      break;
    case 'global':
      where.tipo_id = await idByCodigo(m.CalendarioTipo, 'global', t);
      break;
  }

  return m.CalendarioLocal.findAll({
    where: { ...where, ...visWhere },
    include,
    order: [['tipo_id','ASC'],['nombre','ASC']],
    transaction: t
  });
}

export async function upsertCalendar(payload, user, t) {
  const tipo_id = await idByCodigo(m.CalendarioTipo, payload.tipo_codigo, t);
  const visibilidad_id = await idByCodigo(m.VisibilidadTipo, payload.visibilidad_codigo, t);
  if (!tipo_id || !visibilidad_id) throw Object.assign(new Error('tipo/visibilidad inválidos'), { status: 400 });

  let feder_id = payload.feder_id ?? null;
  if (payload.tipo_codigo === 'personal') feder_id = await _federIdByUser(user.id, t);

  const values = {
    tipo_id, nombre: payload.nombre, visibilidad_id,
    feder_id, celula_id: payload.celula_id ?? null, cliente_id: payload.cliente_id ?? null,
    time_zone: payload.time_zone ?? 'UTC', color: payload.color ?? null,
    is_activo: payload.is_activo ?? true
  };

  if (payload.id) {
    const row = await m.CalendarioLocal.findByPk(payload.id, { transaction: t });
    if (!row) throw Object.assign(new Error('Calendario no encontrado'), { status: 404 });
    await row.update(values, { transaction: t });
    return row;
  } else {
    return m.CalendarioLocal.create(values, { transaction: t });
  }
}
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
