// backend/src/modules/feders/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health,
  listEstados, listModalidadesTrabajo, listDias,
  listFeders, getFeder, postFeder, patchFeder, patchFederActive, deleteFederCtrl,
  getFederModalidad, putFederModalidadBulk, patchFederModalidad, deleteFederModalidad, overview
} from './controllers/feders.controller.js';

const router = Router();

// Health
router.get('/health', health);

router.get('/overview', requireAuth, requirePermission('feders','read'), overview);

// Catálogos (feders.read)
router.get('/catalog/estados',     requireAuth, requirePermission('feders','read'), listEstados);
router.get('/catalog/modalidades', requireAuth, requirePermission('feders','read'), listModalidadesTrabajo);
router.get('/catalog/dias-semana', requireAuth, requirePermission('feders','read'), listDias);

// Feders CRUD
router.get('/',            requireAuth, requirePermission('feders','read'),   listFeders);
router.get('/:id',         requireAuth, requirePermission('feders','read'),   getFeder);
router.post('/',           requireAuth, requirePermission('feders','create'), postFeder);
router.patch('/:id',       requireAuth, requirePermission('feders','update'), patchFeder);
router.patch('/:id/active',requireAuth, requirePermission('feders','update'), patchFederActive);
router.delete('/:id',      requireAuth, requirePermission('feders','delete'), deleteFederCtrl);

// Modalidad por día (feders.assign: “gestión de configuración del feder”)
router.get('/:federId/modalidad',               requireAuth, requirePermission('feders','read'),   getFederModalidad);
router.put('/:federId/modalidad',               requireAuth, requirePermission('feders','assign'), putFederModalidadBulk);
router.patch('/:federId/modalidad',             requireAuth, requirePermission('feders','assign'), patchFederModalidad);
router.delete('/:federId/modalidad/:diaId',     requireAuth, requirePermission('feders','assign'), deleteFederModalidad);

export default router;
// backend/src/modules/feders/validators.js
import { z } from 'zod';

export const listFedersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().trim().min(1).max(120).optional(),
  celula_id: z.coerce.number().int().positive().optional(),
  estado_id: z.coerce.number().int().positive().optional(),
  is_activo: z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional())
});

export const federIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD');

export const createFederSchema = z.object({
  user_id: z.number().int().positive().optional().nullable(),
  celula_id: z.number().int().positive().optional().nullable(),
  estado_id: z.number().int().positive(),
  nombre: z.string().min(2).max(120),
  apellido: z.string().min(2).max(120),
  telefono: z.string().max(30).nullish(),
  avatar_url: z.string().url().max(512).nullish(),
  fecha_ingreso: dateOnly.nullish(),
  fecha_egreso: dateOnly.nullish(),
  is_activo: z.boolean().optional().default(true)
});

export const updateFederSchema = z.object({
  user_id: z.number().int().positive().nullable().optional(),
  celula_id: z.number().int().positive().nullable().optional(),
  estado_id: z.number().int().positive().optional(),
  nombre: z.string().min(2).max(120).optional(),
  apellido: z.string().min(2).max(120).optional(),
  telefono: z.string().max(30).nullish().optional(),
  avatar_url: z.string().url().max(512).nullish().optional(),
  fecha_ingreso: dateOnly.nullish().optional(),
  fecha_egreso: dateOnly.nullish().optional(),
  is_activo: z.boolean().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const setFederActiveSchema = z.object({
  is_activo: z.boolean()
});

// ---- Modalidad por día
export const federIdRouteSchema = z.object({
  federId: z.coerce.number().int().positive()
});

export const upsertModalidadSchema = z.object({
  dia_semana_id: z.number().int().min(1).max(7),
  modalidad_id: z.number().int().positive(),
  comentario: z.string().max(2000).nullish(),
  is_activo: z.boolean().optional().default(true)
});

export const bulkModalidadSchema = z.object({
  items: z.array(upsertModalidadSchema).min(1).max(7)
});

export const diaParamSchema = z.object({
  diaId: z.coerce.number().int().min(1).max(7)
});
// backend/src/modules/feders/controllers/feders.controller.js
import {
  listFedersQuerySchema, federIdParamSchema, createFederSchema, updateFederSchema, setFederActiveSchema,
  federIdRouteSchema, upsertModalidadSchema, bulkModalidadSchema, diaParamSchema
} from '../validators.js';

import {
  svcListEstados, svcListModalidadesTrabajo, svcListDiasSemana,
  svcListFeders, svcGetFeder, svcCreateFeder, svcUpdateFeder, svcSetFederActive, svcDeleteFeder,
  svcListFederModalidad, svcUpsertFederModalidad, svcBulkSetFederModalidad, svcRemoveFederModalidad, svcOverview
} from '../services/feders.service.js';
import { z } from 'zod';

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

const overviewQuery = z.object({
  // priorizar ámbitos que consideramos “C-level” (coma-separado)
  prio_ambitos: z.string().optional(),              // ej: "c_level,direccion"
  celulas_estado: z.enum(['activa','pausada','cerrada']).optional().default('activa'),
  limit_celulas: z.coerce.number().int().min(1).max(500).optional().default(200)
});

export const overview = async (req, res, next) => {
  try {
    const { prio_ambitos, celulas_estado, limit_celulas } = overviewQuery.parse(req.query);
    const prio = prio_ambitos ? prio_ambitos.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    res.json(await svcOverview({ prioAmbitos: prio, celulasEstado: celulas_estado, limitCelulas: limit_celulas }));
  } catch (e) { next(e); }
};
// backend/src/modules/feders/services/feders.service.js
import {
  listEstados, listModalidadesTrabajo, listDiasSemana,
  listFeders, countFeders, getFederById, createFeder, updateFeder, setFederActive, deleteFeder,
  hasFederUsage,
  listFederModalidad, upsertFederModalidad, bulkSetFederModalidad, removeFederModalidad, repoOverview
} from '../repositories/feders.repo.js';

export const svcListEstados = () => listEstados();
export const svcListModalidadesTrabajo = () => listModalidadesTrabajo();
export const svcListDiasSemana = () => listDiasSemana();



export const svcListFeders = async (q) => {
  const rows = await listFeders(q);
  const total = await countFeders(q);
  return { total, rows };
};

export const svcGetFeder = async (id) => {
  const f = await getFederById(id);
  if (!f) throw Object.assign(new Error('Feder no encontrado'), { status: 404 });
  return f;
};

export const svcCreateFeder = async (body) => {
  const row = await createFeder(body);
  return svcGetFeder(row.id);
};

export const svcUpdateFeder = (id, body) => updateFeder(id, body);
export const svcSetFederActive = (id, is_activo) => setFederActive(id, is_activo);

export const svcDeleteFeder = async (id) => {
  if (await hasFederUsage(id)) {
    throw Object.assign(new Error('No se puede eliminar: el Feder tiene uso histórico. Inactivalo en su lugar.'), { status: 400 });
  }
  return deleteFeder(id);
};

// Modalidad por día
export const svcListFederModalidad = (federId) => listFederModalidad(federId);
export const svcUpsertFederModalidad = (federId, body) => upsertFederModalidad(federId, body);
export const svcBulkSetFederModalidad = (federId, items) => bulkSetFederModalidad(federId, items);
export const svcRemoveFederModalidad = (federId, diaId) => removeFederModalidad(federId, diaId);
export const svcOverview = (opts = {}) => repoOverview(opts);
// backend/src/modules/feders/repositories/feders.repo.js
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

// --------- Catálogos
export const listEstados = () =>
  models.FederEstadoTipo.findAll({ attributes: ['id','codigo','nombre','descripcion'], order: [['codigo','ASC']] });

export const listModalidadesTrabajo = () =>
  models.ModalidadTrabajoTipo.findAll({ attributes: ['id','codigo','nombre','descripcion'], order: [['codigo','ASC']] });

export const listDiasSemana = () =>
  models.DiaSemana.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] });

// --------- Helpers de existencia
export const ensureUserExists = async (user_id) => {
  if (!user_id) return;
  const u = await models.User.findByPk(user_id, { attributes: ['id'] });
  if (!u) throw Object.assign(new Error('User no encontrado'), { status: 404 });
};
export const ensureCelulaExists = async (celula_id) => {
  if (!celula_id) return;
  const c = await models.Celula.findByPk(celula_id, { attributes: ['id'] });
  if (!c) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });
};
export const ensureEstadoExists = async (estado_id) => {
  const e = await models.FederEstadoTipo.findByPk(estado_id, { attributes: ['id'] });
  if (!e) throw Object.assign(new Error('Estado no encontrado'), { status: 404 });
};

// --------- Listado / conteo
export const listFeders = async ({ limit = 50, offset = 0, q, celula_id, estado_id, is_activo } = {}) => {
  const repl = { limit, offset };
  const where = [];
  let sql = `
    SELECT
      f.id, f.nombre, f.apellido, f.telefono, f.avatar_url,
      f.fecha_ingreso, f.fecha_egreso, f.is_activo,
      u.id AS user_id, u.email AS user_email,
      ce.id AS celula_id, ce.nombre AS celula_nombre,
      est.id AS estado_id, est.codigo AS estado_codigo, est.nombre AS estado_nombre,
      (
        SELECT c.nombre
        FROM "FederCargo" fc
        JOIN "Cargo" c ON c.id = fc.cargo_id
        WHERE fc.feder_id = f.id
          AND fc.es_principal = true
          AND (fc.hasta IS NULL OR fc.hasta >= CURRENT_DATE)
        ORDER BY fc.desde DESC, fc.id DESC
        LIMIT 1
      ) AS cargo_principal
    FROM "Feder" f
    JOIN "FederEstadoTipo" est ON est.id = f.estado_id
    LEFT JOIN "User" u ON u.id = f.user_id
    LEFT JOIN "Celula" ce ON ce.id = f.celula_id
  `;
  if (q) {
    where.push(`(f.nombre ILIKE :q OR f.apellido ILIKE :q OR COALESCE(f.telefono,'') ILIKE :q OR COALESCE(u.email,'') ILIKE :q)`);
    repl.q = `%${q}%`;
  }
  if (celula_id) { where.push(`f.celula_id = :celula_id`); repl.celula_id = celula_id; }
  if (estado_id) { where.push(`f.estado_id = :estado_id`); repl.estado_id = estado_id; }
  if (typeof is_activo === 'boolean') { where.push(`f.is_activo = :is_activo`); repl.is_activo = is_activo; }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ` ORDER BY f.apellido ASC, f.nombre ASC LIMIT :limit OFFSET :offset`;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const countFeders = async ({ q, celula_id, estado_id, is_activo } = {}) => {
  const repl = {};
  const where = [];
  let sql = `
    SELECT COUNT(*)::int AS cnt
    FROM "Feder" f
    LEFT JOIN "User" u ON u.id = f.user_id
  `;
  if (q) { where.push(`(f.nombre ILIKE :q OR f.apellido ILIKE :q OR COALESCE(f.telefono,'') ILIKE :q OR COALESCE(u.email,'') ILIKE :q)`); repl.q = `%${q}%`; }
  if (celula_id) { where.push(`f.celula_id = :celula_id`); repl.celula_id = celula_id; }
  if (estado_id) { where.push(`f.estado_id = :estado_id`); repl.estado_id = estado_id; }
  if (typeof is_activo === 'boolean') { where.push(`f.is_activo = :is_activo`); repl.is_activo = is_activo; }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  const rows = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
  return rows[0]?.cnt ?? 0;
};

// --------- Detalle / CRUD básico
export const getFederById = async (id) => {
  const rows = await sequelize.query(`
    SELECT
      f.*,
      u.email AS user_email,
      ce.nombre AS celula_nombre,
      est.codigo AS estado_codigo, est.nombre AS estado_nombre,
      (
        SELECT c.nombre
        FROM "FederCargo" fc
        JOIN "Cargo" c ON c.id = fc.cargo_id
        WHERE fc.feder_id = f.id
          AND fc.es_principal = true
          AND (fc.hasta IS NULL OR fc.hasta >= CURRENT_DATE)
        ORDER BY fc.desde DESC, fc.id DESC
        LIMIT 1
      ) AS cargo_principal
    FROM "Feder" f
    JOIN "FederEstadoTipo" est ON est.id = f.estado_id
    LEFT JOIN "User" u ON u.id = f.user_id
    LEFT JOIN "Celula" ce ON ce.id = f.celula_id
    WHERE f.id = :id
    LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { id }});
  return rows[0] || null;
};

export const createFeder = async (payload) => {
  await ensureEstadoExists(payload.estado_id);
  await ensureUserExists(payload.user_id);
  await ensureCelulaExists(payload.celula_id);
  const row = await models.Feder.create(payload);
  return row;
};

export const updateFeder = async (id, payload) => {
  if (payload.estado_id) await ensureEstadoExists(payload.estado_id);
  if (payload.user_id !== undefined) await ensureUserExists(payload.user_id);
  if (payload.celula_id !== undefined) await ensureCelulaExists(payload.celula_id);
  await models.Feder.update(payload, { where: { id } });
  return getFederById(id);
};

export const setFederActive = async (id, is_activo) => {
  await models.Feder.update({ is_activo }, { where: { id } });
  return getFederById(id);
};

// --------- Uso (para evitar deletes peligrosos)
export const hasFederUsage = async (feder_id) => {
  const counts = await Promise.all([
    models.FederCargo.count({ where: { feder_id } }),
    models.FederModalidadDia.count({ where: { feder_id } }),
    models.AsistenciaRegistro?.count ? models.AsistenciaRegistro.count({ where: { feder_id } }) : 0,
    models.Ausencia?.count ? models.Ausencia.count({ where: { feder_id } }) : 0,
    models.Tarea?.count ? models.Tarea.count({ where: { creado_por_feder_id: feder_id } }) : 0,
    models.TareaResponsable?.count ? models.TareaResponsable.count({ where: { feder_id } }) : 0,
    models.TareaColaborador?.count ? models.TareaColaborador.count({ where: { feder_id } }) : 0,
    models.CalendarioLocal?.count ? models.CalendarioLocal.count({ where: { feder_id } }) : 0,
  ]);
  return counts.some(c => (c || 0) > 0);
};

export const deleteFeder = async (id) => {
  await models.Feder.destroy({ where: { id } });
  return { ok: true };
};

// --------- Modalidad por día
export const listFederModalidad = async (feder_id) => {
  return sequelize.query(`
    SELECT fmd.id, fmd.feder_id, fmd.dia_semana_id, ds.codigo AS dia_codigo, ds.nombre AS dia_nombre,
           fmd.modalidad_id, mt.codigo AS modalidad_codigo, mt.nombre AS modalidad_nombre,
           fmd.comentario, fmd.is_activo, fmd.created_at, fmd.updated_at
    FROM "FederModalidadDia" fmd
    JOIN "DiaSemana" ds ON ds.id = fmd.dia_semana_id
    JOIN "ModalidadTrabajoTipo" mt ON mt.id = fmd.modalidad_id
    WHERE fmd.feder_id = :fid
    ORDER BY fmd.dia_semana_id ASC
  `, { type: QueryTypes.SELECT, replacements: { fid: feder_id }});
};

export const upsertFederModalidad = async (feder_id, { dia_semana_id, modalidad_id, comentario = null, is_activo = true }) => {
  // validar FK simples
  const d = await models.DiaSemana.findByPk(dia_semana_id);
  if (!d) throw Object.assign(new Error('Día inválido'), { status: 400 });
  const m = await models.ModalidadTrabajoTipo.findByPk(modalidad_id);
  if (!m) throw Object.assign(new Error('Modalidad inválida'), { status: 400 });

  const [row] = await models.FederModalidadDia.findOrCreate({
    where: { feder_id, dia_semana_id },
    defaults: { feder_id, dia_semana_id, modalidad_id, comentario, is_activo }
  });
  if (!row.isNewRecord) {
    row.modalidad_id = modalidad_id;
    row.comentario = comentario;
    row.is_activo = is_activo;
    await row.save();
  }
  return row;
};

export const bulkSetFederModalidad = async (feder_id, items = []) => {
  return sequelize.transaction(async (t) => {
    for (const it of items) {
      await upsertFederModalidad(feder_id, it);
    }
    return listFederModalidad(feder_id);
  });
};

export const removeFederModalidad = async (feder_id, dia_semana_id) => {
  await models.FederModalidadDia.destroy({ where: { feder_id, dia_semana_id } });
  return listFederModalidad(feder_id);
};
// ———— /feders/overview ————
export const repoOverview = async ({
  prioAmbitos = ['c_level','direccion'],      // códigos de CargoAmbito que tratamos como “C-level”
  celulasEstado = 'activa',
  limitCelulas = 200
} = {}) => {
  // 1) C-LEVEL: principal vigente, con ámbito priorizado
  const ambitos = prioAmbitos.length ? prioAmbitos : ['c_level','direccion'];
  const ambPlaceholders = ambitos.map((_,i)=>`:a${i}`).join(', ');
  const ambRepl = Object.fromEntries(ambitos.map((v,i)=>[`a${i}`, v]));

  const cLevel = await sequelize.query(`
    SELECT f.id AS feder_id, f.nombre, f.apellido, f.avatar_url,
           u.email AS user_email,
           ce.id AS celula_id, ce.nombre AS celula_nombre,
           c.id AS cargo_id, c.nombre AS cargo_nombre,
           a.codigo AS ambito_codigo, a.nombre AS ambito_nombre
    FROM "Feder" f
    JOIN "FederCargo" fc ON fc.feder_id = f.id AND fc.es_principal = true
                         AND (fc.hasta IS NULL OR fc.hasta >= CURRENT_DATE)
    JOIN "Cargo" c ON c.id = fc.cargo_id
    JOIN "CargoAmbito" a ON a.id = c.ambito_id
    LEFT JOIN "User" u ON u.id = f.user_id
    LEFT JOIN "Celula" ce ON ce.id = f.celula_id
    WHERE a.codigo IN (${ambPlaceholders})
    ORDER BY a.codigo ASC, c.nombre ASC, f.apellido ASC, f.nombre ASC
  `, { type: QueryTypes.SELECT, replacements: ambRepl });

  // 2) TRIDENTES (por célula, solo estado pedido): principal vigente por rol
  const tridentes = await sequelize.query(`
    WITH cel AS (
      SELECT c.id, c.nombre, ce.codigo AS estado_codigo
      FROM "Celula" c
      JOIN "CelulaEstado" ce ON ce.id = c.estado_id
      WHERE ce.codigo = :celulasEstado
      ORDER BY c.nombre ASC
    ),
    pick AS (
      SELECT
        c.id AS celula_id,
        -- una helper para traer principal vigente por rol_codigo:
        (
          SELECT jsonb_build_object('feder_id', f.id, 'nombre', f.nombre, 'apellido', f.apellido, 'avatar_url', f.avatar_url)
          FROM "CelulaRolAsignacion" cra
          JOIN "CelulaRolTipo" crt ON crt.id = cra.rol_tipo_id
          JOIN "Feder" f ON f.id = cra.feder_id
          WHERE cra.celula_id = c.id AND crt.codigo = 'analista_diseno'
            AND cra.desde <= CURRENT_DATE AND (cra.hasta IS NULL OR cra.hasta >= CURRENT_DATE)
          ORDER BY cra.es_principal DESC, cra.desde DESC, cra.id DESC
          LIMIT 1
        ) AS diseno,
        (
          SELECT jsonb_build_object('feder_id', f.id, 'nombre', f.nombre, 'apellido', f.apellido, 'avatar_url', f.avatar_url)
          FROM "CelulaRolAsignacion" cra
          JOIN "CelulaRolTipo" crt ON crt.id = cra.rol_tipo_id
          JOIN "Feder" f ON f.id = cra.feder_id
          WHERE cra.celula_id = c.id AND crt.codigo = 'analista_cuentas'
            AND cra.desde <= CURRENT_DATE AND (cra.hasta IS NULL OR cra.hasta >= CURRENT_DATE)
          ORDER BY cra.es_principal DESC, cra.desde DESC, cra.id DESC
          LIMIT 1
        ) AS cuentas,
        (
          SELECT jsonb_build_object('feder_id', f.id, 'nombre', f.nombre, 'apellido', f.apellido, 'avatar_url', f.avatar_url)
          FROM "CelulaRolAsignacion" cra
          JOIN "CelulaRolTipo" crt ON crt.id = cra.rol_tipo_id
          JOIN "Feder" f ON f.id = cra.feder_id
          WHERE cra.celula_id = c.id AND crt.codigo = 'analista_audiovisual'
            AND cra.desde <= CURRENT_DATE AND (cra.hasta IS NULL OR cra.hasta >= CURRENT_DATE)
          ORDER BY cra.es_principal DESC, cra.desde DESC, cra.id DESC
          LIMIT 1
        ) AS audiovisual
      FROM cel c
    )
    SELECT c.id AS celula_id, c.nombre AS celula_nombre, c.estado_codigo,
           p.diseno, p.cuentas, p.audiovisual
    FROM cel c
    LEFT JOIN pick p ON p.celula_id = c.id
    ORDER BY c.nombre ASC
    LIMIT :limitCelulas
  `, { type: QueryTypes.SELECT, replacements: { celulasEstado, limitCelulas } });

  // 3) CÉLULAS COMPLETAS (tridente + miembros activos)
  const celulas = await sequelize.query(`
    SELECT c.id, c.nombre, c.avatar_url, c.cover_url,
           ce.codigo AS estado_codigo, ce.nombre AS estado_nombre,
           -- tridente (mismo criterio que arriba, embebido)
           (
             SELECT jsonb_build_object(
               'diseno',      p.diseno,
               'cuentas',     p.cuentas,
               'audiovisual', p.audiovisual,
               'complete', (p.diseno IS NOT NULL AND p.cuentas IS NOT NULL AND p.audiovisual IS NOT NULL)
             )
             FROM (
               SELECT
                 (SELECT jsonb_build_object('feder_id', f.id, 'nombre', f.nombre, 'apellido', f.apellido, 'avatar_url', f.avatar_url)
                  FROM "CelulaRolAsignacion" a
                  JOIN "CelulaRolTipo" rt ON rt.id = a.rol_tipo_id
                  JOIN "Feder" f ON f.id = a.feder_id
                  WHERE a.celula_id = c.id AND rt.codigo='analista_diseno'
                    AND a.desde <= CURRENT_DATE AND (a.hasta IS NULL OR a.hasta >= CURRENT_DATE)
                  ORDER BY a.es_principal DESC, a.desde DESC, a.id DESC LIMIT 1) AS diseno,
                 (SELECT jsonb_build_object('feder_id', f.id, 'nombre', f.nombre, 'apellido', f.apellido, 'avatar_url', f.avatar_url)
                  FROM "CelulaRolAsignacion" a
                  JOIN "CelulaRolTipo" rt ON rt.id = a.rol_tipo_id
                  JOIN "Feder" f ON f.id = a.feder_id
                  WHERE a.celula_id = c.id AND rt.codigo='analista_cuentas'
                    AND a.desde <= CURRENT_DATE AND (a.hasta IS NULL OR a.hasta >= CURRENT_DATE)
                  ORDER BY a.es_principal DESC, a.desde DESC, a.id DESC LIMIT 1) AS cuentas,
                 (SELECT jsonb_build_object('feder_id', f.id, 'nombre', f.nombre, 'apellido', f.apellido, 'avatar_url', f.avatar_url)
                  FROM "CelulaRolAsignacion" a
                  JOIN "CelulaRolTipo" rt ON rt.id = a.rol_tipo_id
                  JOIN "Feder" f ON f.id = a.feder_id
                  WHERE a.celula_id = c.id AND rt.codigo='analista_audiovisual'
                    AND a.desde <= CURRENT_DATE AND (a.hasta IS NULL OR a.hasta >= CURRENT_DATE)
                  ORDER BY a.es_principal DESC, a.desde DESC, a.id DESC LIMIT 1) AS audiovisual
             ) p
           ) AS tridente,
           -- miembros activos
           COALESCE((
             SELECT jsonb_agg(DISTINCT jsonb_build_object(
               'feder_id', f.id, 'nombre', f.nombre, 'apellido', f.apellido, 'avatar_url', f.avatar_url,
               'es_principal', a.es_principal, 'desde', a.desde, 'hasta', a.hasta
             ) ORDER BY a.es_principal DESC, f.apellido ASC, f.nombre ASC)
             FROM "CelulaRolAsignacion" a
             JOIN "CelulaRolTipo" rt ON rt.id = a.rol_tipo_id
             JOIN "Feder" f ON f.id = a.feder_id
             WHERE a.celula_id = c.id AND rt.codigo = 'miembro'
               AND a.desde <= CURRENT_DATE AND (a.hasta IS NULL OR a.hasta >= CURRENT_DATE)
           ), '[]'::jsonb) AS miembros
    FROM "Celula" c
    JOIN "CelulaEstado" ce ON ce.id = c.estado_id
    WHERE ce.codigo = :celulasEstado
    ORDER BY c.nombre ASC
    LIMIT :limitCelulas
  `, { type: QueryTypes.SELECT, replacements: { celulasEstado, limitCelulas } });

  return { c_level: cLevel, tridentes, celulas };
};