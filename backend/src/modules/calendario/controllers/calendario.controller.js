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
    console.log('[cal:endpoint] GET /calendars q=%s user=%s', JSON.stringify(req.query), req.user?.id);
    const q = listCalendarsQuery.parse(req.query);
    const out = await svcListCalendars(q, req.user);
    console.log('[cal:endpoint] GET /calendars -> %s', Array.isArray(out) ? out.length : 'ok');
    res.json(out);
  } catch (e) { next(e); }
};

export const postCalendar = async (req, res, next) => {
  try {
    console.log('[cal:endpoint] POST /calendars body=%s user=%s', JSON.stringify(req.body), req.user?.id);
    const body = upsertCalendarSchema.parse(req.body);
    const row = await svcUpsertCalendar(body, req.user);
    console.log('[cal:endpoint] POST /calendars -> id=%s', row?.id);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

export const putCalendar = async (req, res, next) => {
  try {
    console.log('[cal:endpoint] PUT /calendars/%s body=%s user=%s', req.params.id, JSON.stringify(req.body), req.user?.id);
    const body = upsertCalendarSchema.parse({ ...req.body, id: Number(req.params.id) });
    const row = await svcUpsertCalendar(body, req.user);
    console.log('[cal:endpoint] PUT /calendars/%s -> ok', req.params.id);
    res.json(row);
  } catch (e) { next(e); }
};

export const getEvents = async (req, res, next) => {
  try {
    console.log('[cal:endpoint] GET /events q=%s user=%s', JSON.stringify(req.query), req.user?.id);
    const q = listEventsQuery.parse(req.query);
    const out = await svcListEvents(q, req.user);
    console.log('[cal:endpoint] GET /events -> events=%s', out?.events?.length ?? (Array.isArray(out) ? out.length : 'n/a'));
    res.json(out);
  } catch (e) { next(e); }
};

export const postEvent = async (req, res, next) => {
  try {
    console.log('[cal:endpoint] POST /events body=%s user=%s', JSON.stringify(req.body), req.user?.id);
    const body = upsertEventSchema.parse(req.body);
    const row = await svcUpsertEvent(body, req.user);
    console.log('[cal:endpoint] POST /events -> id=%s', row?.id);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

export const putEvent = async (req, res, next) => {
  try {
    console.log('[cal:endpoint] PUT /events/%s body=%s user=%s', req.params.id, JSON.stringify(req.body), req.user?.id);
    const body = upsertEventSchema.parse({ ...req.body, id: Number(req.params.id) });
    const row = await svcUpsertEvent(body, req.user);
    console.log('[cal:endpoint] PUT /events/%s -> ok', req.params.id);
    res.json(row);
  } catch (e) { next(e); }
};

export const deleteEvent = async (req, res, next) => {
  try {
    console.log('[cal:endpoint] DELETE /events/%s user=%s', req.params.id, req.user?.id);
    const { id } = idParam.parse(req.params);
    const out = await svcDeleteEvent(id, req.user);
    console.log('[cal:endpoint] DELETE /events/%s -> %j', req.params.id, out);
    res.json(out);
  } catch (e) { next(e); }
};

export const postMyRsvp = async (req, res, next) => {
  try {
    console.log('[cal:endpoint] POST /events/%s/rsvp body=%s user=%s', req.params.id, JSON.stringify(req.body), req.user?.id);
    const { id } = idParam.parse(req.params);
    const body = rsvpSchema.parse(req.body);
    const row = await svcSetMyRsvp(id, body.respuesta, req.user);
    console.log('[cal:endpoint] RSVP evento=%s -> %s', id, row?.respuesta);
    res.status(200).json(row);
  } catch (e) { next(e); }
};