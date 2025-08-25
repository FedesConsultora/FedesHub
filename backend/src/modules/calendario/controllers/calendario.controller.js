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

