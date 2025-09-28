// backend/src/modules/cargos/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health,
  // catálogos
  listAmbitos,
  // cargos
  listCargos, getCargo, postCargo, patchCargo, patchCargoActive, deleteCargoCtrl,
  // asignaciones
  listFederCargoHistory, assignCargoToFeder, patchFederAssignment, deleteFederAssignment
} from './controllers/cargos.controller.js';

const router = Router();

// health
router.get('/health', health);

// catálogos (cargos.read)
router.get('/ambitos', requireAuth, requirePermission('cargos','read'), listAmbitos);

// cargos
router.get('/',        requireAuth, requirePermission('cargos','read'),   listCargos);
router.get('/:id',     requireAuth, requirePermission('cargos','read'),   getCargo);
router.post('/',       requireAuth, requirePermission('cargos','create'), postCargo);
router.patch('/:id',   requireAuth, requirePermission('cargos','update'), patchCargo);
router.patch('/:id/active', requireAuth, requirePermission('cargos','update'), patchCargoActive);
router.delete('/:id',  requireAuth, requirePermission('cargos','delete'), deleteCargoCtrl);

// asignaciones a feders (cargos.assign)
router.get('/feder/:federId',                       requireAuth, requirePermission('cargos','read'),   listFederCargoHistory);
router.post('/feder/:federId/assign',               requireAuth, requirePermission('cargos','assign'), assignCargoToFeder);
router.patch('/feder/:federId/assignments/:id',     requireAuth, requirePermission('cargos','assign'), patchFederAssignment);
router.delete('/feder/:federId/assignments/:id',    requireAuth, requirePermission('cargos','assign'), deleteFederAssignment);

export default router;
// backend/src/modules/cargos/validators.js
import { z } from 'zod';

export const healthOk = () => true;

// ===== Listados =====
export const listCargosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().trim().min(1).max(120).optional(),
  ambito_id: z.coerce.number().int().positive().optional(),
  is_activo: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  )
});

// ===== Cargos =====
export const cargoIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const createCargoSchema = z.object({
  nombre: z.string().min(3).max(120),
  descripcion: z.string().max(1000).nullish(),
  ambito_id: z.number().int().positive(),
  is_activo: z.boolean().optional().default(true)
});

export const updateCargoSchema = z.object({
  nombre: z.string().min(3).max(120).optional(),
  descripcion: z.string().max(1000).nullish().optional(),
  ambito_id: z.number().int().positive().optional(),
  is_activo: z.boolean().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const setCargoActiveSchema = z.object({
  is_activo: z.boolean()
});

// ===== Feder & Assignments =====
export const federIdParamSchema = z.object({
  federId: z.coerce.number().int().positive()
});

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD');

export const createAssignmentSchema = z.object({
  cargo_id: z.number().int().positive(),
  es_principal: z.boolean().optional().default(true),
  desde: dateOnly,
  hasta: dateOnly.nullish(),
  observacion: z.string().max(2000).nullish()
});

export const assignmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const updateAssignmentSchema = z.object({
  es_principal: z.boolean().optional(),
  desde: dateOnly.optional(),
  hasta: dateOnly.nullish().optional(),
  observacion: z.string().max(2000).nullish().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });
// backend/src/modules/cargos/services/cargos.service.js
import {
  listAmbitos, listCargos, countCargos, getCargoById,
  createCargo, updateCargo, setCargoActive, deleteCargo, hasFederCargoUsage
} from '../repositories/cargo.repo.js';

import {
  listFederCargos, createAssignment, updateAssignment, deleteAssignment
} from '../repositories/federCargo.repo.js';

// ========== Catálogos ==========
export const svcListAmbitos = () => listAmbitos();

// ========== Cargos ==========
export const svcListCargos = async (q) => {
  const rows = await listCargos(q);
  const total = await countCargos(q);
  return { total, rows };
};

export const svcGetCargo = async (id) => {
  const c = await getCargoById(id);
  if (!c) throw Object.assign(new Error('Cargo no encontrado'), { status: 404 });
  return c;
};

export const svcCreateCargo = async (body) => {
  const c = await createCargo(body);
  return svcGetCargo(c.id);
};

export const svcUpdateCargo = (id, body) => updateCargo(id, body);
export const svcSetCargoActive = (id, is_activo) => setCargoActive(id, is_activo);

export const svcDeleteCargo = async (id) => {
  if (await hasFederCargoUsage(id)) {
    throw Object.assign(new Error('No se puede eliminar: el cargo tiene historial asignado'), { status: 400 });
  }
  return deleteCargo(id);
};

// ========== Asignaciones a Feders ==========
export const svcListFederCargos = (federId) => listFederCargos(federId);
export const svcCreateAssignment = (federId, body) => createAssignment({ feder_id: federId, ...body });
export const svcUpdateAssignment = (federId, id, body) => updateAssignment(id, body);
export const svcDeleteAssignment = (federId, id) => deleteAssignment(id);
// backend/src/modules/cargos/repositories/cargo.repo.js
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

// === Catálogo de Ámbitos ===
export const listAmbitos = () =>
  models.CargoAmbito.findAll({
    attributes: ['id','codigo','nombre','descripcion'],
    order: [['codigo','ASC']]
  });

// === CRUD de cargos ===
export const listCargos = async ({ limit = 50, offset = 0, q, ambito_id, is_activo } = {}) => {
  const repl = { limit, offset };
  const where = [];
  let sql = `
    SELECT c.id, c.nombre, c.descripcion, c.is_activo,
           a.id AS ambito_id, a.codigo AS ambito_codigo, a.nombre AS ambito_nombre
    FROM "Cargo" c
    JOIN "CargoAmbito" a ON a.id = c.ambito_id
  `;

  if (q) { where.push(`(c.nombre ILIKE :q OR COALESCE(c.descripcion,'') ILIKE :q)`); repl.q = `%${q}%`; }
  if (ambito_id) { where.push(`c.ambito_id = :ambito_id`); repl.ambito_id = ambito_id; }
  if (typeof is_activo === 'boolean') { where.push(`c.is_activo = :is_activo`); repl.is_activo = is_activo; }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY c.nombre ASC LIMIT :limit OFFSET :offset';

  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const countCargos = async ({ q, ambito_id, is_activo } = {}) => {
  const repl = {};
  const where = [];
  let sql = `SELECT COUNT(*)::int AS cnt FROM "Cargo" c`;
  if (q) { where.push(`(c.nombre ILIKE :q OR COALESCE(c.descripcion,'') ILIKE :q)`); repl.q = `%${q}%`; }
  if (ambito_id) { where.push(`c.ambito_id = :ambito_id`); repl.ambito_id = ambito_id; }
  if (typeof is_activo === 'boolean') { where.push(`c.is_activo = :is_activo`); repl.is_activo = is_activo; }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  const rows = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
  return rows[0]?.cnt ?? 0;
};

export const getCargoById = async (id) => {
  const rows = await sequelize.query(`
    SELECT c.id, c.nombre, c.descripcion, c.is_activo,
           a.id AS ambito_id, a.codigo AS ambito_codigo, a.nombre AS ambito_nombre
    FROM "Cargo" c
    JOIN "CargoAmbito" a ON a.id = c.ambito_id
    WHERE c.id = :id
    LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { id }});
  return rows[0] || null;
};

export const createCargo = ({ nombre, descripcion = null, ambito_id, is_activo = true }) =>
  models.Cargo.create({ nombre, descripcion, ambito_id, is_activo });

export const updateCargo = async (id, { nombre, descripcion, ambito_id, is_activo }) => {
  await models.Cargo.update(
    {
      ...(nombre ? { nombre } : {}),
      ...(descripcion !== undefined ? { descripcion } : {}),
      ...(ambito_id ? { ambito_id } : {}),
      ...(typeof is_activo === 'boolean' ? { is_activo } : {})
    },
    { where: { id } }
  );
  return getCargoById(id);
};

export const setCargoActive = async (id, is_activo) => {
  await models.Cargo.update({ is_activo }, { where: { id } });
  return getCargoById(id);
};

// Evitar borrar cargos en uso por historial (aunque la FK permite CASCADE en la tabla)
export const hasFederCargoUsage = async (cargo_id) =>
  (await models.FederCargo.count({ where: { cargo_id } })) > 0;

export const deleteCargo = async (id) => {
  await models.Cargo.destroy({ where: { id } });
  return { ok: true };
};
// backend/src/modules/cargos/repositories/federCargo.repo.js
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

export const ensureFederExists = async (feder_id) => {
  const f = await models.Feder.findByPk(feder_id, { attributes: ['id'] });
  if (!f) throw Object.assign(new Error('Feder no encontrado'), { status: 404 });
};

export const ensureCargoExists = async (cargo_id) => {
  const c = await models.Cargo.findByPk(cargo_id, { attributes: ['id','is_activo'] });
  if (!c) throw Object.assign(new Error('Cargo no encontrado'), { status: 404 });
  if (!c.is_activo) throw Object.assign(new Error('Cargo inactivo'), { status: 400 });
};

export const listFederCargos = async (feder_id) => {
  return sequelize.query(`
    SELECT fc.id, fc.feder_id, fc.cargo_id, fc.es_principal, fc.desde, fc.hasta, fc.observacion, fc.created_at,
           c.nombre AS cargo_nombre, c.descripcion AS cargo_descripcion,
           a.codigo AS ambito_codigo, a.nombre AS ambito_nombre
    FROM "FederCargo" fc
    JOIN "Cargo" c ON c.id = fc.cargo_id
    JOIN "CargoAmbito" a ON a.id = c.ambito_id
    WHERE fc.feder_id = :fid
    ORDER BY COALESCE(fc.hasta, TO_DATE('9999-12-31','YYYY-MM-DD')) DESC, fc.desde DESC, fc.id DESC
  `, { type: QueryTypes.SELECT, replacements: { fid: feder_id }});
};

export const getAssignmentById = (id) =>
  models.FederCargo.findByPk(id);

export const clearPrincipalForFeder = async (feder_id, excludeId = null) => {
  await models.FederCargo.update(
    { es_principal: false },
    { where: { feder_id, ...(excludeId ? { id: { [models.Sequelize.Op.ne]: excludeId } } : {}) } }
  );
};

export const createAssignment = async ({ feder_id, cargo_id, es_principal = true, desde, hasta = null, observacion = null }) => {
  await ensureFederExists(feder_id);
  await ensureCargoExists(cargo_id);

  return await sequelize.transaction(async (t) => {
    if (es_principal) {
      await clearPrincipalForFeder(feder_id);
    }
    const row = await models.FederCargo.create(
      { feder_id, cargo_id, es_principal: !!es_principal, desde, hasta, observacion },
      { transaction: t }
    );
    return row;
  });
};

export const updateAssignment = async (id, { es_principal, desde, hasta, observacion }) => {
  const row = await getAssignmentById(id);
  if (!row) throw Object.assign(new Error('Asignación no encontrada'), { status: 404 });

  await sequelize.transaction(async (t) => {
    if (typeof es_principal === 'boolean' && es_principal) {
      await clearPrincipalForFeder(row.feder_id, row.id);
    }
    await models.FederCargo.update(
      {
        ...(typeof es_principal === 'boolean' ? { es_principal } : {}),
        ...(desde ? { desde } : {}),
        ...(hasta !== undefined ? { hasta } : {}),
        ...(observacion !== undefined ? { observacion } : {})
      },
      { where: { id }, transaction: t }
    );
  });

  return listFederCargos(row.feder_id);
};

export const deleteAssignment = async (id) => {
  const row = await getAssignmentById(id);
  if (!row) throw Object.assign(new Error('Asignación no encontrada'), { status: 404 });
  await models.FederCargo.destroy({ where: { id } });
  return listFederCargos(row.feder_id);
};
// backend/src/modules/cargos/controllers/cargos.controller.js
import {
  listCargosQuerySchema, cargoIdParamSchema, createCargoSchema, updateCargoSchema, setCargoActiveSchema,
  federIdParamSchema, createAssignmentSchema, assignmentIdParamSchema, updateAssignmentSchema
} from '../validators.js';

import {
  svcListAmbitos, svcListCargos, svcGetCargo, svcCreateCargo, svcUpdateCargo, svcSetCargoActive, svcDeleteCargo,
  svcListFederCargos, svcCreateAssignment, svcUpdateAssignment, svcDeleteAssignment
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
