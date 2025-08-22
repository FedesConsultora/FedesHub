// backend/src/modules/feders/controllers/feders.controller.js
import {
  listFedersQuerySchema, federIdParamSchema, createFederSchema, updateFederSchema, setFederActiveSchema,
  federIdRouteSchema, upsertModalidadSchema, bulkModalidadSchema, diaParamSchema
} from '../validators.js';

import {
  svcListEstados, svcListModalidadesTrabajo, svcListDiasSemana,
  svcListFeders, svcGetFeder, svcCreateFeder, svcUpdateFeder, svcSetFederActive, svcDeleteFeder,
  svcListFederModalidad, svcUpsertFederModalidad, svcBulkSetFederModalidad, svcRemoveFederModalidad
} from '../services/feders.service.js';

export const health = (_req, res) => res.json({ module: 'feders', ok: true });

// ---- Catálogos
export const listEstados = async (_req, res, next) => {
  try { res.json(await svcListEstados()); } catch (e) { next(e); }
};
export const listModalidadesTrabajo = async (_req, res, next) => {
  try { res.json(await svcListModalidadesTrabajo()); } catch (e) { next(e); }
};
export const listDias = async (_req, res, next) => {
  try { res.json(await svcListDiasSemana()); } catch (e) { next(e); }
};

// ---- Feders CRUD
export const listFeders = async (req, res, next) => {
  try {
    const q = listFedersQuerySchema.parse(req.query);
    res.json(await svcListFeders(q));
  } catch (e) { next(e); }
};

export const getFeder = async (req, res, next) => {
  try {
    const { id } = federIdParamSchema.parse(req.params);
    res.json(await svcGetFeder(id));
  } catch (e) { next(e); }
};

export const postFeder = async (req, res, next) => {
  try {
    const body = createFederSchema.parse(req.body);
    const created = await svcCreateFeder(body);
    res.status(201).json(created);
  } catch (e) { next(e); }
};

export const patchFeder = async (req, res, next) => {
  try {
    const { id } = federIdParamSchema.parse(req.params);
    const body = updateFederSchema.parse(req.body);
    const updated = await svcUpdateFeder(id, body);
    res.json(updated);
  } catch (e) { next(e); }
};

export const patchFederActive = async (req, res, next) => {
  try {
    const { id } = federIdParamSchema.parse(req.params);
    const { is_activo } = setFederActiveSchema.parse(req.body);
    res.json(await svcSetFederActive(id, is_activo));
  } catch (e) { next(e); }
};

export const deleteFederCtrl = async (req, res, next) => {
  try {
    const { id } = federIdParamSchema.parse(req.params);
    res.json(await svcDeleteFeder(id));
  } catch (e) { next(e); }
};

// ---- Modalidad por día
export const getFederModalidad = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    res.json(await svcListFederModalidad(federId));
  } catch (e) { next(e); }
};

export const putFederModalidadBulk = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const { items } = bulkModalidadSchema.parse(req.body);
    res.json(await svcBulkSetFederModalidad(federId, items));
  } catch (e) { next(e); }
};

export const patchFederModalidad = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const body = upsertModalidadSchema.parse(req.body);
    res.json(await svcUpsertFederModalidad(federId, body));
  } catch (e) { next(e); }
};

export const deleteFederModalidad = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const { diaId } = diaParamSchema.parse(req.params);
    res.json(await svcRemoveFederModalidad(federId, diaId));
  } catch (e) { next(e); }
};
