// backend/src/modules/asistencia/controllers/asistencia.controller.js
import {
  listQuerySchema, idParamSchema, openQuerySchema,
  checkInBodySchema, checkOutBodySchema, forceCloseBodySchema, adjustBodySchema,
  timelineQuerySchema
,
} from '../validators.js';

import {
  svcCatalogOrigenes, svcCatalogCierreMotivos,
  svcList, svcGet, svcGetOpen, svcCheckIn, svcCheckOut, svcAdjust, svcForceCloseOpen,
  svcToggle, svcGetMyFeder, svcResumenPeriodo,
  svcTimelineDia
} from '../services/asistencia.service.js';

export const health = (_req, res) => res.json({ module: 'asistencia', ok: true });

// Catálogo
export const getOrigenes = async (_req, res, next) => { try { res.json(await svcCatalogOrigenes()); } catch (e) { next(e); } };
export const getCierreMotivos = async (_req, res, next) => { try { res.json(await svcCatalogCierreMotivos()); } catch (e) { next(e); } };

// Listado / Detalle (global)
export const list = async (req, res, next) => {
  try { res.json(await svcList(listQuerySchema.parse(req.query))); } catch (e) { next(e); }
};
export const detail = async (req, res, next) => {
  try { const { id } = idParamSchema.parse(req.params); res.json(await svcGet(id)); } catch (e) { next(e); }
};

// Histórico propio
export const meList = async (req, res, next) => {
  try {
    const me = await svcGetMyFeder(req.user.id);
    const q = listQuerySchema.parse(req.query);
    res.json(await svcList({ ...q, feder_id: me.id }));
  } catch (e) { next(e); }
};

// Abierto por feder
export const getOpen = async (req, res, next) => {
  try { const { feder_id } = openQuerySchema.parse(req.query); res.json(await svcGetOpen(feder_id) ?? null); } catch (e) { next(e); }
};

// Acciones
export const postCheckIn = async (req, res, next) => {
  try { const body = checkInBodySchema.parse(req.body); res.status(201).json(await svcCheckIn(body)); } catch (e) { next(e); }
};

export const patchCheckOut = async (req, res, next) => {
  try { const { id } = idParamSchema.parse(req.params); const body = checkOutBodySchema.parse(req.body); res.json(await svcCheckOut(id, body)); } catch (e) { next(e); }
};

export const patchAdjust = async (req, res, next) => {
  try { const { id } = idParamSchema.parse(req.params); const body = adjustBodySchema.parse(req.body); res.json(await svcAdjust(id, body)); } catch (e) { next(e); }
};

export const postForceClose = async (req, res, next) => {
  try {
    const { federId } = { federId: Number(req.params.federId) };
    if (!Number.isInteger(federId) || federId <= 0) throw Object.assign(new Error('federId inválido'), { status: 400 });
    const body = forceCloseBodySchema.parse(req.body);
    res.json(await svcForceCloseOpen(federId, body));
  } catch (e) { next(e); }
};

// Toggle + “me”
export const postToggle = async (req, res, next) => {
  try {
    const body = checkInBodySchema.parse(req.body); // feder_id | at | origen | modalidad
    if (!body.feder_id) throw Object.assign(new Error('feder_id es requerido'), { status: 400 });
    res.json(await svcToggle(body));
  } catch (e) { next(e); }
};

export const meOpen = async (req, res, next) => {
  try { const me = await svcGetMyFeder(req.user.id); res.json(await svcGetOpen(me.id) ?? null); } catch (e) { next(e); }
};

export const meToggle = async (req, res, next) => {
  try {
    const me = await svcGetMyFeder(req.user.id);
    const body = checkInBodySchema.parse(req.body); // at, origen*, modalidad*
    res.json(await svcToggle({
      feder_id: me.id,
      at: body.at,
      origen_id: body.origen_id, origen_codigo: body.origen_codigo,
      modalidad_id: body.modalidad_id, modalidad_codigo: body.modalidad_codigo
    }));
  } catch (e) { next(e); }
};

export const meCheckIn = async (req, res, next) => {
  try { const me = await svcGetMyFeder(req.user.id); const body = checkInBodySchema.parse(req.body); res.status(201).json(await svcCheckIn({ ...body, feder_id: me.id })); } catch (e) { next(e); }
};

export const meCheckOut = async (req, res, next) => {
  try {
    const me = await svcGetMyFeder(req.user.id);
    const open = await svcGetOpen(me.id);
    if (!open) throw Object.assign(new Error('No tienes registro abierto'), { status: 409 });
    const body = checkOutBodySchema.parse(req.body);
    res.json(await svcCheckOut(open.id, body));
  } catch (e) { next(e); }
};

// Reportes
export const resumenPeriodo = async (req, res, next) => {
  try { res.json(await svcResumenPeriodo(resumenQuerySchema.parse(req.query))); } catch (e) { next(e); }
};

export const timelineDia = async (req, res, next) => {
  try {
    const q = timelineQuerySchema.parse(req.query);
    res.json(await svcTimelineDia(q));
  } catch (e) { next(e); }
};

export const meTimelineDia = async (req, res, next) => {
  try {
    const q = timelineQuerySchema.parse(req.query);
    const me = await svcGetMyFeder(req.user.id);
    res.json(await svcTimelineDia({ ...q, feder_id: me.id }));
  } catch (e) { next(e); }
};