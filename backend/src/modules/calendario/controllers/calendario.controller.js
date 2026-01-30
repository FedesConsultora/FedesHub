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
import { feriadosService } from '../../../lib/feriados.service.js';

// No top-level await for initModels here anymore, we call it inside each function if needed
// or just trust the registry handles it.

export const health = (_req, res) => res.json({ module: 'calendario', ok: true });

export async function getCatalog(_req, res, next) {
  try {
    const m = await initModels();
    const [tipos, vis, asisTipos] = await Promise.all([
      m.EventoTipo.findAll({ order: [['codigo', 'ASC']] }),
      m.VisibilidadTipo.findAll({ order: [['codigo', 'ASC']] }),
      m.AsistenteTipo.findAll({ order: [['codigo', 'ASC']] })
    ]);
    res.json({ eventoTipos: tipos, visibilidades: vis, asistenteTipos: asisTipos });
  } catch (e) { next(e); }
}

export async function getCalendars(req, res, next) {
  try {
    console.log('[cal:endpoint] GET /calendars q=%s user=%s', JSON.stringify(req.query), req.user?.id);
    const q = listCalendarsQuery.parse(req.query);
    const out = await svcListCalendars(q, req.user);
    res.json(out);
  } catch (e) { next(e); }
}

export async function postCalendar(req, res, next) {
  try {
    const body = upsertCalendarSchema.parse(req.body);
    const row = await svcUpsertCalendar(body, req.user);
    res.status(201).json(row);
  } catch (e) { next(e); }
}

export async function putCalendar(req, res, next) {
  try {
    const body = upsertCalendarSchema.parse({ ...req.body, id: Number(req.params.id) });
    const row = await svcUpsertCalendar(body, req.user);
    res.json(row);
  } catch (e) { next(e); }
}

export async function getEvents(req, res, next) {
  try {
    const q = listEventsQuery.parse(req.query);
    const out = await svcListEvents(q, req.user);
    res.json(out);
  } catch (e) { next(e); }
}

export async function postEvent(req, res, next) {
  try {
    const body = upsertEventSchema.parse(req.body);
    const row = await svcUpsertEvent(body, req.user);
    res.status(201).json(row);
  } catch (e) { next(e); }
}

export async function putEvent(req, res, next) {
  try {
    const body = upsertEventSchema.parse({ ...req.body, id: Number(req.params.id) });
    const row = await svcUpsertEvent(body, req.user);
    res.json(row);
  } catch (e) { next(e); }
}

export async function deleteEvent(req, res, next) {
  try {
    const { id } = idParam.parse(req.params);
    const out = await svcDeleteEvent(id, req.user);
    res.json(out);
  } catch (e) { next(e); }
}

export async function postMyRsvp(req, res, next) {
  try {
    const { id } = idParam.parse(req.params);
    const body = rsvpSchema.parse(req.body);
    const row = await svcSetMyRsvp(id, body.respuesta, req.user);
    res.status(200).json(row);
  } catch (e) { next(e); }
}

export async function getFeriados(req, res, next) {
  try {
    const { year } = req.params;
    console.log('[cal:endpoint] GET /feriados/%s', year);
    const data = await feriadosService.getFeriados(year);
    res.json(data);
  } catch (e) {
    console.error('[cal:endpoint] Error in getFeriados:', e);
    next(e);
  }
}