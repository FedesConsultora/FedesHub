// backend/src/modules/cargos/controllers/cargos.controller.js
import {
  listCargosQuerySchema, cargoIdParamSchema, createCargoSchema, updateCargoSchema, setCargoActiveSchema,
  federIdParamSchema, createAssignmentSchema, assignmentIdParamSchema, updateAssignmentSchema
} from '../validators.js';

import {
  svcListAmbitos, svcListCargos, svcGetCargo, svcCreateCargo, svcUpdateCargo, svcSetCargoActive, svcDeleteCargo,
  svcListFederCargos, svcCreateAssignment, svcUpdateAssignment, svcDeleteAssignment,
  svcListCargosWithPeople
} from '../services/cargos.service.js';

export const health = (_req, res) => res.json({ module: 'cargos', ok: true });

// ===== Catálogos
export const listAmbitos = async (_req, res, next) => {
  try { res.json(await svcListAmbitos()); } catch (e) { next(e); }
};

// ===== Cargos
export const listCargos = async (req, res, next) => {
  try {
    const q = listCargosQuerySchema.parse(req.query);
    res.json(await svcListCargos(q));
  } catch (e) { next(e); }
};

export const listCargosWithPeopleCtrl = async (_req, res, next) => {
  try { res.json(await svcListCargosWithPeople()); } catch (e) { next(e); }
};

export const getCargo = async (req, res, next) => {
  try {
    const { id } = cargoIdParamSchema.parse(req.params);
    res.json(await svcGetCargo(id));
  } catch (e) { next(e); }
};

export const postCargo = async (req, res, next) => {
  try {
    const body = createCargoSchema.parse(req.body);
    const created = await svcCreateCargo(body);
    res.status(201).json(created);
  } catch (e) { next(e); }
};

export const patchCargo = async (req, res, next) => {
  try {
    const { id } = cargoIdParamSchema.parse(req.params);
    const body = updateCargoSchema.parse(req.body);
    const updated = await svcUpdateCargo(id, body);
    res.json(updated);
  } catch (e) { next(e); }
};

export const patchCargoActive = async (req, res, next) => {
  try {
    const { id } = cargoIdParamSchema.parse(req.params);
    const { is_activo } = setCargoActiveSchema.parse(req.body);
    const updated = await svcSetCargoActive(id, is_activo);
    res.json(updated);
  } catch (e) { next(e); }
};

export const deleteCargoCtrl = async (req, res, next) => {
  try {
    const { id } = cargoIdParamSchema.parse(req.params);
    res.json(await svcDeleteCargo(id));
  } catch (e) { next(e); }
};

// ===== Asignaciones a Feders
export const listFederCargoHistory = async (req, res, next) => {
  try {
    const { federId } = federIdParamSchema.parse(req.params);
    res.json(await svcListFederCargos(federId));
  } catch (e) { next(e); }
};

export const assignCargoToFeder = async (req, res, next) => {
  try {
    const { federId } = federIdParamSchema.parse(req.params);
    const body = createAssignmentSchema.parse(req.body);
    const row = await svcCreateAssignment(federId, body);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

export const patchFederAssignment = async (req, res, next) => {
  try {
    const { federId } = federIdParamSchema.parse(req.params);
    const { id } = assignmentIdParamSchema.parse(req.params);
    const body = updateAssignmentSchema.parse(req.body);
    const rows = await svcUpdateAssignment(federId, id, body);
    res.json(rows);
  } catch (e) { next(e); }
};

export const deleteFederAssignment = async (req, res, next) => {
  try {
    const { federId } = federIdParamSchema.parse(req.params);
    const { id } = assignmentIdParamSchema.parse(req.params);
    const rows = await svcDeleteAssignment(federId, id);
    res.json(rows);
  } catch (e) { next(e); }
};
