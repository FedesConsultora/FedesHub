// /backend/src/modules/celulas/router.js
// router.js — Rutas y permisos del módulo Células
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health, getEstados, getRolTipos,
  list, detail, create, patch, postState,
  listAsign, postAsign, closeAsign,
  listClientes, coverage
} from './controllers/celulas.controller.js';

const router = Router();

router.get('/health', health);

// Catálogos
router.get('/catalog/estados',   requireAuth, requirePermission('celulas','read'),   getEstados);
router.get('/catalog/roles',     requireAuth, requirePermission('celulas','read'),   getRolTipos);

// CRUD
router.get('/',                  requireAuth, requirePermission('celulas','read'),   list);
router.get('/:id',               requireAuth, requirePermission('celulas','read'),   detail);
router.post('/',                 requireAuth, requirePermission('celulas','create'), create);
router.patch('/:id',             requireAuth, requirePermission('celulas','update'), patch);
router.post('/:id/state',        requireAuth, requirePermission('celulas','update'), postState);

// Asignaciones
router.get('/:id/asignaciones',                  requireAuth, requirePermission('celulas','read'),    listAsign);
router.post('/:id/asignaciones',                 requireAuth, requirePermission('celulas','assign'),  postAsign);
router.patch('/asignaciones/:asignacionId',      requireAuth, requirePermission('celulas','update'),  closeAsign);

// Clientes de la célula
router.get('/:id/clientes',      requireAuth, requirePermission('celulas','read'),   listClientes);

// Cobertura del tridente
router.get('/:id/coverage',      requireAuth, requirePermission('celulas','read'),   coverage);

export default router;
// backend/src/modules/celulas/validators.js

import { z } from 'zod';

const id = z.coerce.number().int().positive();
const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const listQuery = z.object({
  q: z.string().min(1).max(120).optional(),
  estado_codigo: z.enum(['activa','pausada','cerrada']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const createBody = z.object({
  nombre: z.string().min(2).max(120),
  descripcion: z.string().max(4000).nullish(),
  perfil_md: z.string().max(20000).nullish(),
  avatar_url: z.string().url().max(512).nullish(),
  cover_url: z.string().url().max(512).nullish(),
  estado_codigo: z.enum(['activa','pausada','cerrada']).optional() // default activa
});

export const updateBody = z.object({
  nombre: z.string().min(2).max(120).optional(),
  descripcion: z.string().max(4000).nullish().optional(),
  perfil_md: z.string().max(20000).nullish().optional(),
  avatar_url: z.string().url().max(512).nullish().optional(),
  cover_url: z.string().url().max(512).nullish().optional()
}).refine(o => Object.keys(o).length > 0, { message: 'Sin cambios' });

export const changeStateBody = z.object({
  estado_codigo: z.enum(['activa','pausada','cerrada'])
});

export const asignarRolBody = z.object({
  feder_id: id,
  rol_codigo: z.enum(['analista_diseno','analista_cuentas','analista_audiovisual','miembro']),
  desde: isoDateOnly,
  es_principal: z.boolean().default(true),
  observacion: z.string().max(2000).nullish()
});

export const cerrarAsignacionBody = z.object({
  hasta: isoDateOnly,
  observacion: z.string().max(2000).nullish()
});

export const idParam = z.object({ id });

export const asignacionIdParam = z.object({ asignacionId: id });

export const catalogQuery = z.object({});
// /backend/src/modules/celulas/services/celulas.service.js

// celulas.service.js — Reglas de negocio y conveniencias
import {
  listEstados, listRolTipos, getEstadoByCodigo,
  createCelula, updateCelula, changeCelulaState,
  getCelulaById, listCelulas, listAsignaciones,
  assignRol, closeAsignacion, getClientesByCelula
} from '../repositories/celulas.repo.js';

export const catEstados = () => listEstados();
export const catRoles = () => listRolTipos();

export const svcCreate = (body) => createCelula(body);
export const svcUpdate = (id, patch) => updateCelula(id, patch);
export const svcChangeState = (id, estado_codigo) => changeCelulaState(id, estado_codigo);

export const svcDetail = (id) => getCelulaById(id);
export const svcList = (q) => listCelulas(q);

export const svcListAsignaciones = (celula_id) => listAsignaciones(celula_id);
export const svcAssignRol = (celula_id, body) => assignRol({ celula_id, ...body });
export const svcCloseAsignacion = (asignacion_id, body) => closeAsignacion(asignacion_id, body);

export const svcListClientes = (celula_id) => getClientesByCelula(celula_id);

// Sugerencia de “completitud” del tridente
export const svcCoverage = async (celula_id) => {
  const c = await getCelulaById(celula_id);
  if (!c) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });
  const active = (c.asignaciones || []).filter(a => !a.hasta);
  const has = (code) => active.some(a => a.rol_codigo === code);
  return {
    celula_id,
    has_diseno: has('analista_diseno'),
    has_cuentas: has('analista_cuentas'),
    has_audiovisual: has('analista_audiovisual'),
    complete: ['analista_diseno','analista_cuentas','analista_audiovisual'].every(has)
  };
};
// /backend/src/modules/celulas/repositories/celulas.repo.js

// celulas.repo.js — Acceso a datos y SQL de apoyo para Células
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const m = await initModels();

const slugify = (s) =>
  s.normalize('NFKD')
   .replace(/[\u0300-\u036f]/g,'')
   .replace(/[^a-zA-Z0-9]+/g,'-')
   .replace(/^-+|-+$/g,'')
   .toLowerCase()
   .slice(0, 120);

export const getEstadoByCodigo = (codigo) =>
  m.CelulaEstado.findOne({ where: { codigo } });

export const getRolTipoByCodigo = (codigo) =>
  m.CelulaRolTipo.findOne({ where: { codigo } });

export const listEstados = () => m.CelulaEstado.findAll({ order: [['id','ASC']] });

export const listRolTipos = () => m.CelulaRolTipo.findAll({ order: [['nombre','ASC']] });

async function ensureCalendarioCelula(celula_id, tx) {
  if (!m.CalendarioLocal) return null;
  const [tipo] = await sequelize.query(
    `SELECT id FROM "CalendarioTipo" WHERE codigo='celula' LIMIT 1`,
    { type: QueryTypes.SELECT, transaction: tx }
  );
  if (!tipo) return null;
  const [vis] = await sequelize.query(
    `SELECT id FROM "VisibilidadTipo" WHERE codigo='equipo' LIMIT 1`,
    { type: QueryTypes.SELECT, transaction: tx }
  );
  const exists = await m.CalendarioLocal.findOne({ where: { celula_id }, transaction: tx });
  if (exists) return exists;
  return m.CalendarioLocal.create({
    tipo_id: tipo.id, nombre: `Calendario Célula ${celula_id}`,
    visibilidad_id: vis?.id ?? null, feder_id: null, celula_id, cliente_id: null,
    time_zone: 'America/Argentina/Buenos_Aires', color: '#1976d2', is_activo: true
  }, { transaction: tx });
}

async function uniqueSlugFrom(nombre, tx) {
  const base = slugify(nombre);
  let slug = base || `celula-${Date.now()}`;
  let i = 1;
  // @ts-ignore
  while (await m.Celula.findOne({ where: { slug }, transaction: tx })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

export const createCelula = async ({ nombre, descripcion, perfil_md, avatar_url, cover_url, estado_codigo }) => {
  return sequelize.transaction(async (tx) => {
    const estado = await getEstadoByCodigo(estado_codigo || 'activa');
    if (!estado) throw Object.assign(new Error('Estado inválido'), { status: 400 });

    const slug = await uniqueSlugFrom(nombre, tx);
    const row = await m.Celula.create({
      nombre, descripcion: descripcion ?? null, perfil_md: perfil_md ?? null,
      avatar_url: avatar_url ?? null, cover_url: cover_url ?? null,
      slug, estado_id: estado.id
    }, { transaction: tx });

    await ensureCalendarioCelula(row.id, tx);
    return getCelulaById(row.id, { tx });
  });
};

export const updateCelula = async (id, patch) => {
  return sequelize.transaction(async (tx) => {
    const row = await m.Celula.findByPk(id, { transaction: tx });
    if (!row) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });

    const next = { ...patch };
    if (patch.nombre) {
      // Si cambia el nombre, recalculamos slug si no hay slug manual
      const newSlug = await uniqueSlugFrom(patch.nombre, tx);
      next.slug = newSlug;
    }
    await row.update(next, { transaction: tx });
    return getCelulaById(id, { tx });
  });
};

export const changeCelulaState = async (id, estado_codigo) => {
  const est = await getEstadoByCodigo(estado_codigo);
  if (!est) throw Object.assign(new Error('Estado inválido'), { status: 400 });
  const row = await m.Celula.findByPk(id);
  if (!row) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });
  await row.update({ estado_id: est.id });
  return getCelulaById(id);
};

export const getCelulaById = async (id, { tx = null } = {}) => {
  const sql = `
    SELECT c.*, ce.codigo AS estado_codigo, ce.nombre AS estado_nombre,
           COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
             'asig_id', cra.id,
             'feder_id', cra.feder_id,
             'rol_codigo', crt.codigo,
             'rol_nombre', crt.nombre,
             'desde', cra.desde,
             'hasta', cra.hasta,
             'es_principal', cra.es_principal
           )) FILTER (WHERE cra.id IS NOT NULL), '[]'::jsonb) AS asignaciones,
           (SELECT COUNT(*)::int FROM "Cliente" cli WHERE cli.celula_id = c.id) AS clientes_count
    FROM "Celula" c
    JOIN "CelulaEstado" ce ON ce.id = c.estado_id
    LEFT JOIN "CelulaRolAsignacion" cra ON cra.celula_id = c.id
    LEFT JOIN "CelulaRolTipo" crt ON crt.id = cra.rol_tipo_id
    WHERE c.id = :id
    GROUP BY c.id, ce.codigo, ce.nombre
  `;
  const rows = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: { id }, transaction: tx });
  return rows[0] || null;
};

export const listCelulas = async ({ q, estado_codigo, limit, offset }) => {
  const where = [];
  const repl = { limit, offset };
  if (q) { where.push('LOWER(c.nombre) LIKE :q'); repl.q = `%${q.toLowerCase()}%`; }
  if (estado_codigo) { where.push('ce.codigo = :ec'); repl.ec = estado_codigo; }
  const sql = `
    WITH roster AS (
      SELECT cra.celula_id,
        bool_or(crt.codigo='analista_diseno' AND (cra.hasta IS NULL OR cra.hasta >= CURRENT_DATE)) AS has_diseno,
        bool_or(crt.codigo='analista_cuentas' AND (cra.hasta IS NULL OR cra.hasta >= CURRENT_DATE)) AS has_cuentas,
        bool_or(crt.codigo='analista_audiovisual' AND (cra.hasta IS NULL OR cra.hasta >= CURRENT_DATE)) AS has_audiovisual
      FROM "CelulaRolAsignacion" cra
      JOIN "CelulaRolTipo" crt ON crt.id = cra.rol_tipo_id
      GROUP BY cra.celula_id
    )
    SELECT c.id, c.nombre, c.slug, c.avatar_url, c.cover_url, c.descripcion, c.perfil_md,
           ce.codigo AS estado_codigo,
           COALESCE(r.has_diseno,false) AS has_diseno,
           COALESCE(r.has_cuentas,false) AS has_cuentas,
           COALESCE(r.has_audiovisual,false) AS has_audiovisual,
           (SELECT COUNT(*)::int FROM "Cliente" cli WHERE cli.celula_id = c.id) AS clientes_count
    FROM "Celula" c
    JOIN "CelulaEstado" ce ON ce.id = c.estado_id
    LEFT JOIN roster r ON r.celula_id = c.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY c.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const listAsignaciones = async (celula_id) => {
  const sql = `
    SELECT cra.*, crt.codigo AS rol_codigo, crt.nombre AS rol_nombre,
           f.nombre AS feder_nombre, f.apellido AS feder_apellido
    FROM "CelulaRolAsignacion" cra
    JOIN "CelulaRolTipo" crt ON crt.id = cra.rol_tipo_id
    JOIN "Feder" f ON f.id = cra.feder_id
    WHERE cra.celula_id = :cid
    ORDER BY cra.desde DESC, cra.id DESC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: { cid: celula_id } });
};

export const assignRol = async ({ celula_id, feder_id, rol_codigo, desde, es_principal, observacion }) => {
  return sequelize.transaction(async (tx) => {
    const cel = await m.Celula.findByPk(celula_id, { transaction: tx });
    if (!cel) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });
    const f = await m.Feder.findByPk(feder_id, { transaction: tx });
    if (!f || !f.is_activo) throw Object.assign(new Error('Feder inválido o inactivo'), { status: 400 });

    const rol = await getRolTipoByCodigo(rol_codigo);
    if (!rol) throw Object.assign(new Error('rol_codigo inválido'), { status: 400 });

    // Un principal por rol y célula
    if (es_principal) {
      await m.CelulaRolAsignacion.update(
        { es_principal: false },
        { where: { celula_id, rol_tipo_id: rol.id, hasta: null, es_principal: true }, transaction: tx }
      );
    }

    const row = await m.CelulaRolAsignacion.create({
      celula_id, feder_id, rol_tipo_id: rol.id, desde,
      hasta: null, es_principal: !!es_principal, observacion: observacion ?? null
    }, { transaction: tx });

    return row.toJSON();
  });
};

export const closeAsignacion = async (asignacion_id, { hasta, observacion }) => {
  const row = await m.CelulaRolAsignacion.findByPk(asignacion_id);
  if (!row) throw Object.assign(new Error('Asignación no encontrada'), { status: 404 });
  await row.update({ hasta, observacion: observacion ?? row.observacion });
  return row.toJSON();
};

export const getClientesByCelula = async (celula_id) => {
  const sql = `
    SELECT cli.*, ct.codigo AS tipo_codigo, ce.codigo AS estado_codigo
    FROM "Cliente" cli
    JOIN "ClienteTipo" ct ON ct.id = cli.tipo_id
    JOIN "ClienteEstado" ce ON ce.id = cli.estado_id
    WHERE cli.celula_id = :cid
    ORDER BY cli.created_at DESC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: { cid: celula_id } });
};
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
