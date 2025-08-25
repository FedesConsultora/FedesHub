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
