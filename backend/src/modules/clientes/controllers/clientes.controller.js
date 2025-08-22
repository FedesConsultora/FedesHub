// /backend/src/modules/clientes/controllers/clientes.controller.js
// ───────────────────────────────────────────────────────────────────────────────
// Express controllers + validación Zod + manejo de errores consistente.
import {
  listQuerySchema, idParamSchema, clienteCreateSchema, clienteUpdateSchema,
  assignCelulaBodySchema, listContactosQuery, contactoCreateSchema, contactoUpdateSchema
} from '../validators.js';

import {
  svcList, svcDetail, svcCreate, svcUpdate, svcDelete, svcAssignCelula,
  svcListContactos, svcCreateContacto, svcUpdateContacto, svcDeleteContacto,
  svcResumenEstado, svcResumenPonderacion, svcResumenCelula
} from '../services/clientes.service.js';

export const health = (_req, res) => res.json({ module: 'clientes', ok: true });

// Listado / detalle
export const list = async (req, res, next) => {
  try { res.json(await svcList(listQuerySchema.parse(req.query))); } catch (e) { next(e); }
};
export const detail = async (req, res, next) => {
  try { const { id } = idParamSchema.parse(req.params); res.json(await svcDetail(id)); } catch (e) { next(e); }
};

// Crear / actualizar / borrar
export const create = async (req, res, next) => {
  try { const body = clienteCreateSchema.parse(req.body); res.status(201).json(await svcCreate(body)); } catch (e) { next(e); }
};
export const update = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = clienteUpdateSchema.parse(req.body);
    res.json(await svcUpdate(id, body));
  } catch (e) { next(e); }
};
export const del = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const force = req.query.force === 'true';
    res.json(await svcDelete(id, { force }));
  } catch (e) { next(e); }
};

// Asignaciones
export const assignCelula = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { celula_id } = assignCelulaBodySchema.parse(req.body);
    res.json(await svcAssignCelula(id, celula_id));
  } catch (e) { next(e); }
};

// Contactos
export const listContactosCtrl = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const q = listContactosQuery.parse(req.query);
    res.json(await svcListContactos(id, q));
  } catch (e) { next(e); }
};
export const createContactoCtrl = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = contactoCreateSchema.parse(req.body);
    res.status(201).json(await svcCreateContacto(id, body));
  } catch (e) { next(e); }
};
export const updateContactoCtrl = async (req, res, next) => {
  try {
    const { id, contactoId } = { id: Number(req.params.id), contactoId: Number(req.params.contactoId) };
    if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error('id inválido'), { status: 400 });
    if (!Number.isInteger(contactoId) || contactoId <= 0) throw Object.assign(new Error('contactoId inválido'), { status: 400 });
    const body = contactoUpdateSchema.parse(req.body);
    res.json(await svcUpdateContacto(id, contactoId, body));
  } catch (e) { next(e); }
};
export const deleteContactoCtrl = async (req, res, next) => {
  try {
    const { id, contactoId } = { id: Number(req.params.id), contactoId: Number(req.params.contactoId) };
    if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error('id inválido'), { status: 400 });
    if (!Number.isInteger(contactoId) || contactoId <= 0) throw Object.assign(new Error('contactoId inválido'), { status: 400 });
    res.json(await svcDeleteContacto(id, contactoId));
  } catch (e) { next(e); }
};

// Resúmenes para “tableros”
export const resumenEstado = async (_req, res, next) => { try { res.json(await svcResumenEstado()); } catch (e) { next(e); } };
export const resumenPonderacion = async (_req, res, next) => { try { res.json(await svcResumenPonderacion()); } catch (e) { next(e); } };
export const resumenCelula = async (_req, res, next) => { try { res.json(await svcResumenCelula()); } catch (e) { next(e); } };
