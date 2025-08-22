// /backend/src/modules/celulas/controllers/celulas.controller.js

// celulas.controller.js — Handlers Express
import {
  listQuery, createBody, updateBody, changeStateBody,
  asignarRolBody, cerrarAsignacionBody, idParam, asignacionIdParam
} from '../validators.js';

import {
  catEstados, catRoles,
  svcCreate, svcUpdate, svcChangeState,
  svcDetail, svcList, svcListAsignaciones, svcAssignRol, svcCloseAsignacion,
  svcListClientes, svcCoverage
} from '../services/celulas.service.js';

export const health = (_req, res) => res.json({ module: 'celulas', ok: true });

// Catálogos
export const getEstados = async (_req, res, next) => { try { res.json(await catEstados()); } catch (e) { next(e); } };
export const getRolTipos = async (_req, res, next) => { try { res.json(await catRoles()); } catch (e) { next(e); } };

// CRUD
export const list = async (req, res, next) => {
  try { res.json(await svcList(listQuery.parse(req.query))); } catch (e) { next(e); }
};

export const detail = async (req, res, next) => {
  try { const { id } = idParam.parse(req.params); res.json(await svcDetail(id)); } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try { res.status(201).json(await svcCreate(createBody.parse(req.body))); } catch (e) { next(e); }
};

export const patch = async (req, res, next) => {
  try { const { id } = idParam.parse(req.params); res.json(await svcUpdate(id, updateBody.parse(req.body))); } catch (e) { next(e); }
};

export const postState = async (req, res, next) => {
  try { const { id } = idParam.parse(req.params); const { estado_codigo } = changeStateBody.parse(req.body);
        res.json(await svcChangeState(id, estado_codigo)); } catch (e) { next(e); }
};

// Asignaciones de roles (tridente/miembros)
export const listAsign = async (req, res, next) => {
  try { const { id } = idParam.parse(req.params); res.json(await svcListAsignaciones(id)); } catch (e) { next(e); }
};

export const postAsign = async (req, res, next) => {
  try { const { id } = idParam.parse(req.params); res.status(201).json(await svcAssignRol(id, asignarRolBody.parse(req.body))); } catch (e) { next(e); }
};

export const closeAsign = async (req, res, next) => {
  try { const { asignacionId } = asignacionIdParam.parse(req.params); res.json(await svcCloseAsignacion(asignacionId, cerrarAsignacionBody.parse(req.body))); } catch (e) { next(e); }
};

// Clientes vinculados a la célula
export const listClientes = async (req, res, next) => {
  try { const { id } = idParam.parse(req.params); res.json(await svcListClientes(id)); } catch (e) { next(e); }
};

// Cobertura del tridente
export const coverage = async (req, res, next) => {
  try { const { id } = idParam.parse(req.params); res.json(await svcCoverage(id)); } catch (e) { next(e); }
};
