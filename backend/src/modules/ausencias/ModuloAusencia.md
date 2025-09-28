// /backend/src/modules/ausencias/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health,
  // Catálogos
  getUnidades, getEstados, getMitadDia, getTipos, postTipo, patchTipo,
  // Cuotas y saldos
  postCuota, getCuotas, getSaldoPorTipo, getSaldoMe,
  // Ausencias
  listAus, detailAus, createAus, meCreateAus, approveAus, rejectAus, cancelAus,
  // Solicitudes de asignación
  createAsignacionSolicitud, listAsignacionSolicitud, approveAsignacionSolicitud, denyAsignacionSolicitud, cancelAsignacionSolicitud
} from './controllers/ausencias.controller.js';

const router = Router();

router.get('/health', health);

// ===== Catálogos
router.get('/catalog/unidades',  requireAuth, requirePermission('ausencias','read'),    getUnidades);
router.get('/catalog/estados',   requireAuth, requirePermission('ausencias','read'),    getEstados);
router.get('/catalog/mitad-dia', requireAuth, requirePermission('ausencias','read'),    getMitadDia);
router.get('/tipos',             requireAuth, requirePermission('ausencias','read'),    getTipos);
router.post('/tipos',            requireAuth, requirePermission('ausencias','create'),  postTipo);   // Admin/RRHH
router.patch('/tipos/:id',       requireAuth, requirePermission('ausencias','update'),  patchTipo);  // Admin/RRHH

// ===== Cuotas y saldos
router.post('/cuotas',           requireAuth, requirePermission('ausencias','assign'),  postCuota);  // RRHH / Admin
router.get('/cuotas',            requireAuth, requirePermission('ausencias','read'),    getCuotas);
router.get('/saldos',            requireAuth, requirePermission('ausencias','read'),    getSaldoPorTipo);
router.get('/me/saldos',         requireAuth, requirePermission('ausencias','read'),    getSaldoMe);

// ===== Ausencias
router.get('/',                  requireAuth, requirePermission('ausencias','read'),    listAus);
router.get('/:id',               requireAuth, requirePermission('ausencias','read'),    detailAus);
router.post('/',                 requireAuth, requirePermission('ausencias','create'),  createAus);      // crear de cualquiera (si tiene permiso)
router.post('/me',               requireAuth, requirePermission('ausencias','create'),  meCreateAus);    // crear propia
router.post('/:id/approve',      requireAuth, requirePermission('ausencias','approve'), approveAus);
router.post('/:id/reject',       requireAuth, requirePermission('ausencias','approve'), rejectAus);
router.post('/:id/cancel',       requireAuth, requirePermission('ausencias','update'),  cancelAus);

// ===== Solicitudes de Asignación (cupo extra)
router.post('/asignacion/solicitudes',            requireAuth, requirePermission('ausencias','create'),  createAsignacionSolicitud);
router.get('/asignacion/solicitudes',             requireAuth, requirePermission('ausencias','read'),    listAsignacionSolicitud);
router.post('/asignacion/solicitudes/:id/approve',requireAuth, requirePermission('ausencias','approve'), approveAsignacionSolicitud);
router.post('/asignacion/solicitudes/:id/deny',   requireAuth, requirePermission('ausencias','approve'), denyAsignacionSolicitud);
router.post('/asignacion/solicitudes/:id/cancel', requireAuth, requirePermission('ausencias','update'),  cancelAsignacionSolicitud);

export default router;

//  /backend/src/modules/ausencias/validators.js

import { z } from 'zod';

const id = z.coerce.number().int().positive();
const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const isoDateTime = z.string().datetime();

export const catalogQuery = z.object({});

export const tipoCreateSchema = z.object({
  codigo: z.string().min(2).max(50),
  nombre: z.string().min(2).max(100),
  descripcion: z.string().max(2000).nullish(),
  unidad_id: id.optional(),
  unidad_codigo: z.enum(['dia','hora']).optional(),
  requiere_asignacion: z.boolean().default(true),
  permite_medio_dia: z.boolean().default(false)
}).refine(o => o.unidad_id || o.unidad_codigo, { message: 'unidad_id o unidad_codigo requerido' });

export const tipoUpdateSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  descripcion: z.string().max(2000).nullish().optional(),
  unidad_id: id.optional(),
  unidad_codigo: z.enum(['dia','hora']).optional(),
  requiere_asignacion: z.boolean().optional(),
  permite_medio_dia: z.boolean().optional()
});

export const tiposListQuery = z.object({
  q: z.string().min(1).max(100).optional()
});

export const cuotaAssignSchema = z.object({
  feder_id: id,
  tipo_id: id.optional(),
  tipo_codigo: z.string().min(2).max(50).optional(),
  unidad_id: id.optional(),
  unidad_codigo: z.enum(['dia','hora']).optional(),
  cantidad_total: z.coerce.number().positive(),
  vigencia_desde: isoDateOnly,
  vigencia_hasta: isoDateOnly,
  comentario: z.string().max(2000).nullish()
}).refine(o => (o.tipo_id || o.tipo_codigo), { message: 'tipo_id o tipo_codigo requerido' })
  .refine(o => (o.unidad_id || o.unidad_codigo), { message: 'unidad_id o unidad_codigo requerido' });

export const cuotasListQuery = z.object({
  feder_id: id.optional(),
  tipo_id: id.optional(),
  vigentes: z.preprocess(v => v === 'true' ? true : v === 'false' ? false : undefined, z.boolean().optional())
});

export const saldoQuery = z.object({
  feder_id: id,
  fecha: isoDateOnly.optional()
});

export const ausListQuery = z.object({
  feder_id: id.optional(),
  estado_codigo: z.enum(['pendiente','aprobada','denegada','cancelada']).optional(),
  desde: isoDateOnly.optional(),
  hasta: isoDateOnly.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const ausenciaCreateSchema = z.object({
  feder_id: id.optional(), // requerido salvo /me
  tipo_id: id.optional(),
  tipo_codigo: z.string().min(2).max(50).optional(),
  fecha_desde: isoDateOnly,
  fecha_hasta: isoDateOnly,
  es_medio_dia: z.boolean().optional().default(false),
  mitad_dia_id: z.coerce.number().int().min(1).max(2).optional(), // 1=am, 2=pm
  duracion_horas: z.coerce.number().positive().optional(), // requerido si unidad=hora
  motivo: z.string().max(4000).nullish()
}).refine(o => (o.tipo_id || o.tipo_codigo), { message: 'tipo_id o tipo_codigo requerido' });

export const ausenciaDecisionSchema = z.object({
  comentario_admin: z.string().max(2000).nullish()
});

export const ausenciaRechazoSchema = z.object({
  comentario_admin: z.string().max(2000).nullish(),
  denegado_motivo: z.string().max(4000).optional()
});

export const asignacionSolicitudCreate = z.object({
  feder_id: id.optional(), // /me no lo requiere
  tipo_id: id.optional(),
  tipo_codigo: z.string().min(2).max(50).optional(),
  unidad_id: id.optional(),
  unidad_codigo: z.enum(['dia','hora']).optional(),
  cantidad_solicitada: z.coerce.number().positive(),
  vigencia_desde: isoDateOnly,
  vigencia_hasta: isoDateOnly,
  motivo: z.string().max(4000).nullish()
}).refine(o => (o.tipo_id || o.tipo_codigo), { message: 'tipo_id o tipo_codigo requerido' })
  .refine(o => (o.unidad_id || o.unidad_codigo), { message: 'unidad_id o unidad_codigo requerido' });

export const asignacionSolicitudList = z.object({
  feder_id: id.optional(),
  estado_codigo: z.enum(['pendiente','aprobada','denegada','cancelada']).optional()
});
// /backend/src/modules/ausencias/controllers/ausencias.controller.js
import {
  catalogQuery, tiposListQuery, tipoCreateSchema, tipoUpdateSchema,
  cuotaAssignSchema, cuotasListQuery, saldoQuery,
  ausListQuery, ausenciaCreateSchema, ausenciaDecisionSchema, ausenciaRechazoSchema,
  asignacionSolicitudCreate, asignacionSolicitudList
} from '../validators.js';

import {
  catUnidades, catEstados, catMitadDia, tiposList, tipoCreate, tipoUpdate,
  cuotaAssign, cuotasList, saldoTipos,
  ausList, ausDetail, ausCreate, ausApprove, ausReject, ausCancel,
  asignacionSolicitudCreateSvc, asignacionSolicitudListSvc,
  asignacionSolicitudApproveSvc, asignacionSolicitudDenySvc, asignacionSolicitudCancelSvc,
  meFeder
} from '../services/ausencias.service.js';

// Health
export const health = (_req, res) => res.json({ module: 'ausencias', ok: true });

// ==== Catálogos
export const getUnidades = async (_req, res, next) => { try { res.json(await catUnidades()); } catch (e) { next(e); } };
export const getEstados  = async (_req, res, next) => { try { res.json(await catEstados()); } catch (e) { next(e); } };
export const getMitadDia = async (_req, res, next) => { try { res.json(await catMitadDia()); } catch (e) { next(e); } };

export const getTipos = async (req, res, next) => {
  try { res.json(await tiposList(tiposListQuery.parse(req.query))); } catch (e) { next(e); }
};
export const postTipo = async (req, res, next) => {
  try { res.status(201).json(await tipoCreate(tipoCreateSchema.parse(req.body))); } catch (e) { next(e); }
};
export const patchTipo = async (req, res, next) => {
  try { res.json(await tipoUpdate(Number(req.params.id), tipoUpdateSchema.parse(req.body))); } catch (e) { next(e); }
};

// ==== Cuotas y Saldos
export const postCuota = async (req, res, next) => {
  try { res.status(201).json(await cuotaAssign(cuotaAssignSchema.parse(req.body), req.user.id)); } catch (e) { next(e); }
};
export const getCuotas = async (req, res, next) => {
  try { res.json(await cuotasList(cuotasListQuery.parse(req.query))); } catch (e) { next(e); }
};
export const getSaldoPorTipo = async (req, res, next) => {
  try { res.json(await saldoTipos(saldoQuery.parse(req.query))); } catch (e) { next(e); }
};
export const getSaldoMe = async (req, res, next) => {
  try {
    const me = await meFeder(req.user.id);
    const q = saldoQuery.parse({ ...req.query, feder_id: me.id });
    res.json(await saldoTipos(q));
  } catch (e) { next(e); }
};

// ==== Ausencias (solicitudes)
export const listAus = async (req, res, next) => {
  try { res.json(await ausList(ausListQuery.parse(req.query))); } catch (e) { next(e); }
};
export const detailAus = async (req, res, next) => {
  try { res.json(await ausDetail(Number(req.params.id))); } catch (e) { next(e); }
};
export const createAus = async (req, res, next) => {
  try { res.status(201).json(await ausCreate(ausenciaCreateSchema.parse(req.body), req.user.id)); } catch (e) { next(e); }
};
export const meCreateAus = async (req, res, next) => {
  try { res.status(201).json(await ausCreate(ausenciaCreateSchema.parse(req.body), req.user.id)); } catch (e) { next(e); }
};
export const approveAus = async (req, res, next) => {
  try { res.json(await ausApprove(Number(req.params.id), req.user.id)); } catch (e) { next(e); }
};
export const rejectAus = async (req, res, next) => {
  try { res.json(await ausReject(Number(req.params.id), ausenciaRechazoSchema.parse(req.body))); } catch (e) { next(e); }
};
export const cancelAus = async (req, res, next) => {
  try { res.json(await ausCancel(Number(req.params.id))); } catch (e) { next(e); }
};

// ==== Solicitudes de Asignación (cupo extra)
export const createAsignacionSolicitud = async (req, res, next) => {
  try { res.status(201).json(await asignacionSolicitudCreateSvc(asignacionSolicitudCreate.parse(req.body), req.user.id)); } catch (e) { next(e); }
};
export const listAsignacionSolicitud = async (req, res, next) => {
  try { res.json(await asignacionSolicitudListSvc(asignacionSolicitudList.parse(req.query))); } catch (e) { next(e); }
};
export const approveAsignacionSolicitud = async (req, res, next) => {
  try { res.json(await asignacionSolicitudApproveSvc(Number(req.params.id), req.user.id)); } catch (e) { next(e); }
};
export const denyAsignacionSolicitud = async (req, res, next) => {
  try { res.json(await asignacionSolicitudDenySvc(Number(req.params.id), ausenciaDecisionSchema.parse(req.body))); } catch (e) { next(e); }
};
export const cancelAsignacionSolicitud = async (req, res, next) => {
  try { res.json(await asignacionSolicitudCancelSvc(Number(req.params.id))); } catch (e) { next(e); }
};
// /backend/src/modules/ausencias/repositories/ausencias.repo.js
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const m = await initModels();

const getUnidadBy = async ({ id, codigo }) => {
  if (id) return m.AusenciaUnidadTipo.findByPk(id);
  if (codigo) return m.AusenciaUnidadTipo.findOne({ where: { codigo } });
  return null;
};

export const getTipoBy = async ({ id, codigo }) => {
  if (id) return m.AusenciaTipo.findByPk(id);
  if (codigo) return m.AusenciaTipo.findOne({ where: { codigo } });
  return null;
};

export const getEstadoByCodigo = (codigo) =>
  m.AusenciaEstado.findOne({ where: { codigo } });

export const getFederByUser = async (user_id) =>
  m.Feder.findOne({ where: { user_id, is_activo: true }, attributes: ['id','user_id','is_activo'] });

export const ensureFeder = async (feder_id) => {
  const f = await m.Feder.findByPk(feder_id, { attributes: ['id','is_activo'] });
  if (!f) throw Object.assign(new Error('Feder no encontrado'), { status: 404 });
  if (!f.is_activo) throw Object.assign(new Error('Feder inactivo'), { status: 400 });
  return f;
};

// ====== Catálogos ======
export const listUnidades = () => m.AusenciaUnidadTipo.findAll({ order: [['id','ASC']] });
export const listEstados  = () => m.AusenciaEstado.findAll({ order: [['id','ASC']] });
export const listMitadDia = () => m.MitadDiaTipo.findAll({ order: [['id','ASC']] });

export const listTipos = async ({ q }) => {
  const where = q ? `WHERE LOWER(t.nombre) LIKE :q OR LOWER(t.codigo) LIKE :q` : '';
  return sequelize.query(`
    SELECT t.*, u.codigo AS unidad_codigo, u.nombre AS unidad_nombre
    FROM "AusenciaTipo" t
    JOIN "AusenciaUnidadTipo" u ON u.id = t.unidad_id
    ${where}
    ORDER BY t.nombre ASC
  `, { type: QueryTypes.SELECT, replacements: q ? { q: `%${q.toLowerCase()}%` } : {} });
};

export const createTipo = async ({ codigo, nombre, descripcion, unidad_id, unidad_codigo, requiere_asignacion, permite_medio_dia }) => {
  const unidad = await getUnidadBy({ id: unidad_id, codigo: unidad_codigo });
  if (!unidad) throw Object.assign(new Error('Unidad inválida'), { status: 400 });
  return m.AusenciaTipo.create({
    codigo, nombre, descripcion, unidad_id: unidad.id,
    requiere_asignacion, permite_medio_dia
  });
};

export const updateTipo = async (id, patch) => {
  const row = await m.AusenciaTipo.findByPk(id);
  if (!row) throw Object.assign(new Error('Tipo no encontrado'), { status: 404 });

  const next = { ...patch };
  if (patch.unidad_id || patch.unidad_codigo) {
    const u = await getUnidadBy({ id: patch.unidad_id, codigo: patch.unidad_codigo });
    if (!u) throw Object.assign(new Error('Unidad inválida'), { status: 400 });
    next.unidad_id = u.id;
    delete next.unidad_codigo;
  }
  await row.update(next);
  return row;
};

// ====== Cuotas y saldos ======
export const assignCuota = async ({ feder_id, tipo_id, unidad_id, cantidad_total, vigencia_desde, vigencia_hasta, comentario, asignado_por_user_id }) => {
  await ensureFeder(feder_id);
  const tipo = await m.AusenciaTipo.findByPk(tipo_id);
  if (!tipo) throw Object.assign(new Error('tipo_id inválido'), { status: 400 });

  if (unidad_id !== tipo.unidad_id) {
    throw Object.assign(new Error('La unidad de la cuota debe coincidir con la unidad del tipo'), { status: 400 });
  }

  return m.AusenciaCuota.create({
    feder_id, tipo_id, unidad_id, cantidad_total,
    vigencia_desde, vigencia_hasta, comentario,
    asignado_por_user_id, is_activo: true
  });
};

export const listCuotas = async ({ feder_id, tipo_id, vigentes }) => {
  const repl = {};
  const where = ['c.is_activo = true'];
  if (feder_id) { where.push('c.feder_id = :feder_id'); repl.feder_id = feder_id; }
  if (tipo_id) { where.push('c.tipo_id = :tipo_id'); repl.tipo_id = tipo_id; }
  if (typeof vigentes === 'boolean') {
    where.push(vigentes
      ? 'CURRENT_DATE BETWEEN c.vigencia_desde AND c.vigencia_hasta'
      : 'NOT (CURRENT_DATE BETWEEN c.vigencia_desde AND c.vigencia_hasta)'
    );
  }
  const sql = `
    SELECT c.*, t.nombre AS tipo_nombre, u.codigo AS unidad_codigo,
      COALESCE(c.cantidad_total - SUM(cc.cantidad_consumida), c.cantidad_total) AS saldo
    FROM "AusenciaCuota" c
    JOIN "AusenciaTipo" t ON t.id = c.tipo_id
    JOIN "AusenciaUnidadTipo" u ON u.id = c.unidad_id
    LEFT JOIN "AusenciaCuotaConsumo" cc ON cc.cuota_id = c.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    GROUP BY c.id, t.nombre, u.codigo
    ORDER BY c.vigencia_desde ASC, c.id ASC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const saldoPorTipo = async ({ feder_id, fecha = null }) => {
  const repl = { feder_id };
  const filtroVig = fecha ? `:fecha BETWEEN c.vigencia_desde AND c.vigencia_hasta` : `CURRENT_DATE BETWEEN c.vigencia_desde AND c.vigencia_hasta`;
  if (fecha) repl.fecha = fecha;

  const sql = `
    SELECT
      t.id AS tipo_id, t.codigo AS tipo_codigo, t.nombre AS tipo_nombre, u.codigo AS unidad_codigo,
      COALESCE(SUM(c.cantidad_total),0) AS asignado,
      COALESCE(SUM(cc.consumido),0) AS consumido,
      COALESCE(SUM(c.cantidad_total),0) - COALESCE(SUM(cc.consumido),0) AS disponible
    FROM "AusenciaTipo" t
    JOIN "AusenciaUnidadTipo" u ON u.id = t.unidad_id
    LEFT JOIN "AusenciaCuota" c
      ON c.tipo_id = t.id AND c.feder_id = :feder_id AND c.is_activo = true
      AND ${filtroVig}
    LEFT JOIN (
      SELECT cuota_id, SUM(cantidad_consumida) AS consumido
      FROM "AusenciaCuotaConsumo"
      GROUP BY cuota_id
    ) cc ON cc.cuota_id = c.id
    GROUP BY t.id, t.codigo, t.nombre, u.codigo
    ORDER BY t.nombre ASC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

// ====== Ausencias (solicitudes) ======
export const listAusencias = async ({ feder_id, estado_codigo, desde, hasta, limit, offset }) => {
  const repl = { limit, offset };
  const where = [];
  if (feder_id) { where.push('a.feder_id = :feder_id'); repl.feder_id = feder_id; }
  if (estado_codigo) { where.push('e.codigo = :estado'); repl.estado = estado_codigo; }
  if (desde) { where.push('a.fecha_desde >= :desde'); repl.desde = desde; }
  if (hasta) { where.push('a.fecha_hasta <= :hasta'); repl.hasta = hasta; }

  const sql = `
    SELECT a.*, t.nombre AS tipo_nombre, t.codigo AS tipo_codigo, u.codigo AS unidad_codigo, e.codigo AS estado_codigo
    FROM "Ausencia" a
    JOIN "AusenciaTipo" t ON t.id = a.tipo_id
    JOIN "AusenciaUnidadTipo" u ON u.id = t.unidad_id
    JOIN "AusenciaEstado" e ON e.id = a.estado_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY a.fecha_desde DESC, a.id DESC
    LIMIT :limit OFFSET :offset
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const getAusenciaById = async (id) => {
  const rows = await sequelize.query(`
    SELECT a.*, t.nombre AS tipo_nombre, t.codigo AS tipo_codigo, u.codigo AS unidad_codigo, e.codigo AS estado_codigo
    FROM "Ausencia" a
    JOIN "AusenciaTipo" t ON t.id = a.tipo_id
    JOIN "AusenciaUnidadTipo" u ON u.id = t.unidad_id
    JOIN "AusenciaEstado" e ON e.id = a.estado_id
    WHERE a.id = :id
  `, { type: QueryTypes.SELECT, replacements: { id } });
  return rows[0] || null;
};

export const createAusencia = async (payload) => {
  return m.Ausencia.create(payload);
};

export const updateAusencia = async (id, patch) => {
  const row = await m.Ausencia.findByPk(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });
  await row.update(patch);
  return getAusenciaById(id);
};

// ====== Aprobación / Consumo de cuotas ======
async function cuotasConSaldo({ feder_id, tipo_id, atDesde, atHasta }) {
  // Trae cuotas vigentes para *todo el rango* (si solapa, vale)
  const rows = await sequelize.query(`
    SELECT c.*,
      COALESCE(c.cantidad_total - SUM(cc.cantidad_consumida), c.cantidad_total) AS saldo_disponible
    FROM "AusenciaCuota" c
    LEFT JOIN "AusenciaCuotaConsumo" cc ON cc.cuota_id = c.id
    WHERE c.feder_id = :feder_id
      AND c.tipo_id = :tipo_id
      AND c.is_activo = true
      AND c.vigencia_hasta >= :desde
      AND c.vigencia_desde <= :hasta
    GROUP BY c.id
    HAVING COALESCE(c.cantidad_total - SUM(cc.cantidad_consumida), c.cantidad_total) > 0
    ORDER BY c.vigencia_desde ASC, c.id ASC
  `, { type: QueryTypes.SELECT, replacements: { feder_id, tipo_id, desde: atDesde, hasta: atHasta } });
  return rows;
}

export const aprobarAusenciaConConsumo = async ({ ausencia_id, aprobado_por_user_id, requerido, unidad_codigo }) => {
  return sequelize.transaction(async (tx) => {
    const row = await m.Ausencia.findByPk(ausencia_id, { transaction: tx, lock: tx.LOCK.UPDATE });
    if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });
    const tipo = await m.AusenciaTipo.findByPk(row.tipo_id);
    const estadoAprob = await getEstadoByCodigo('aprobada');
    const estadoPend  = await getEstadoByCodigo('pendiente');

    if (row.estado_id !== estadoPend.id) throw Object.assign(new Error('Sólo ausencias pendientes pueden aprobarse'), { status: 409 });

    if (tipo.requiere_asignacion) {
      // Consumir de cuotas FIFO
      let restante = requerido;
      const bolsas = await cuotasConSaldo({
        feder_id: row.feder_id,
        tipo_id: row.tipo_id,
        atDesde: row.fecha_desde,
        atHasta: row.fecha_hasta
      });

      for (const c of bolsas) {
        if (restante <= 0) break;
        const take = Math.min(Number(c.saldo_disponible), Number(restante));
        await m.AusenciaCuotaConsumo.create({
          cuota_id: c.id,
          ausencia_id: row.id,
          cantidad_consumida: take
        }, { transaction: tx });
        restante = Number((restante - take).toFixed(2));
      }
      if (restante > 0) {
        throw Object.assign(new Error('Saldo insuficiente para aprobar'), { status: 400 });
      }
    }

    await row.update({
      estado_id: estadoAprob.id,
      aprobado_por_user_id,
      aprobado_at: new Date()
    }, { transaction: tx });

    // Crear evento en calendario personal (best-effort)
    try {
      const [cal] = await sequelize.query(`
        SELECT cl.id FROM "CalendarioLocal" cl
        JOIN "CalendarioTipo" ct ON ct.id = cl.tipo_id
        WHERE cl.feder_id = :fid AND ct.codigo = 'personal' AND cl.is_activo = true
        LIMIT 1
      `, { type: QueryTypes.SELECT, replacements: { fid: row.feder_id }, transaction: tx });

      const [tipoBloq] = await sequelize.query(`
        SELECT id FROM "EventoTipo" WHERE codigo='bloqueo' LIMIT 1
      `, { type: QueryTypes.SELECT, transaction: tx });

      if (cal?.id && tipoBloq?.id && m.Evento) {
        // Para unidad 'hora' intentamos usar duracion_horas como bloque del primer día
        const start = new Date(`${row.fecha_desde}T09:00:00.000Z`);
        let end = new Date(start);
        if (unidad_codigo === 'hora' && row.duracion_horas) {
          end = new Date(start.getTime() + Number(row.duracion_horas) * 3600 * 1000);
        } else {
          // días completos
          end = new Date(new Date(`${row.fecha_hasta}T23:59:59.000Z`).getTime());
        }
        await m.Evento.create({
          calendario_local_id: cal.id,
          tipo_id: tipoBloq.id,
          visibilidad_id: null,
          titulo: `Ausencia: ${tipo.nombre}`,
          descripcion: row.motivo ?? null,
          start_at: start,
          end_at: end,
          ausencia_id: row.id
        }, { transaction: tx });
      }
    } catch {
      // ignorar silenciosamente
    }

    return getAusenciaById(row.id);
  });
};
// /backend/src/modules/ausencias/services/ausencias.service.js
import {
  listUnidades, listEstados, listMitadDia,
  listTipos, createTipo, updateTipo, getTipoBy,
  assignCuota, listCuotas, saldoPorTipo,
  listAusencias, getAusenciaById, createAusencia, updateAusencia,
  aprobarAusenciaConConsumo, getEstadoByCodigo, getFederByUser, ensureFeder
} from '../repositories/ausencias.repo.js';

const WORKDAY_HOURS = Number(process.env.WORKDAY_HOURS ?? 8);

const parseDaysInclusive = (d1, d2) => {
  const a = new Date(`${d1}T00:00:00Z`);
  const b = new Date(`${d2}T00:00:00Z`);
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / 86400000) + 1; // inclusive
};

export const catUnidades = () => listUnidades();
export const catEstados = () => listEstados();
export const catMitadDia = () => listMitadDia();
export const tiposList = (q) => listTipos(q);
export const tipoCreate = (body) => createTipo(body);
export const tipoUpdate = (id, patch) => updateTipo(id, patch);

// ===== Saldos / Cuotas =====
export const cuotaAssign = async ({ feder_id, tipo_id, tipo_codigo, unidad_id, unidad_codigo, ...rest }, user_id) => {
  const tipo = await getTipoBy({ id: tipo_id, codigo: tipo_codigo });
  if (!tipo) throw Object.assign(new Error('Tipo inválido'), { status: 400 });

  const unidad = (unidad_id || unidad_codigo)
    ? unidad_id
    : (await getTipoBy({ id: tipo.id })).unidad_id;

  return assignCuota({
    feder_id,
    tipo_id: tipo.id,
    unidad_id: unidad ?? tipo.unidad_id,
    ...rest,
    asignado_por_user_id: user_id
  });
};

export const cuotasList = (q) => listCuotas(q);
export const saldoTipos = (q) => saldoPorTipo(q);

// ===== Ausencias =====
export const ausList = (q) => listAusencias(q);
export const ausDetail = (id) => getAusenciaById(id);

const buildPayloadSolicitud = async ({ feder_id, tipo_id, tipo_codigo, fecha_desde, fecha_hasta, es_medio_dia, mitad_dia_id, duracion_horas, motivo }) => {
  const tipo = await getTipoBy({ id: tipo_id, codigo: tipo_codigo });
  if (!tipo) throw Object.assign(new Error('Tipo inválido'), { status: 400 });

  // Validaciones de fechas
  if (new Date(fecha_hasta) < new Date(fecha_desde)) {
    throw Object.assign(new Error('fecha_hasta no puede ser anterior a fecha_desde'), { status: 400 });
  }

  const estadoPend = await getEstadoByCodigo('pendiente');

  const payload = {
    feder_id,
    tipo_id: tipo.id,
    estado_id: estadoPend.id,
    fecha_desde, fecha_hasta,
    es_medio_dia: !!es_medio_dia,
    mitad_dia_id: es_medio_dia ? (mitad_dia_id ?? null) : null,
    duracion_horas: null,
    motivo: motivo ?? null,
    comentario_admin: null,
    aprobado_por_user_id: null,
    aprobado_at: null,
    denegado_motivo: null,
    creado_at: new Date(),
    actualizado_at: new Date()
  };

  if (tipo.unidad_id && tipo.permite_medio_dia === false && es_medio_dia) {
    throw Object.assign(new Error('Este tipo no permite medio día'), { status: 400 });
  }

  // Unidades
  const unidad = tipo.unidad_id;
  // Buscar código de unidad: 'dia'|'hora'
  // (traemos al vuelo para no propagar la tabla)
  // Como ya usamos cat en list, acá resolvemos con una consulta rápida:
  // Nota: esto no falla si no está, porque el seed lo cargó.
  // eslint-disable-next-line no-unused-vars
  const u = await (async () => {
    const rows = await listUnidades();
    return rows.find(x => x.id === unidad);
  })();

  if (u?.codigo === 'hora') {
    if (!duracion_horas && !es_medio_dia) {
      // Si no pasan horas, calculamos (días * WORKDAY_HOURS).
      const days = parseDaysInclusive(fecha_desde, fecha_hasta);
      payload.duracion_horas = days * WORKDAY_HOURS;
    } else if (duracion_horas) {
      payload.duracion_horas = Number(duracion_horas);
    } else if (es_medio_dia) {
      // medio día expresado en horas
      payload.duracion_horas = WORKDAY_HOURS / 2;
    }
  }

  return { payload, tipo, unidad_codigo: u?.codigo ?? 'dia' };
};

export const ausCreate = async (body, meUserId) => {
  if (!body.feder_id) {
    const me = await getFederByUser(meUserId);
    if (!me) throw Object.assign(new Error('El usuario no tiene Feder activo'), { status: 404 });
    body.feder_id = me.id;
  }
  await ensureFeder(body.feder_id);

  const { payload } = await buildPayloadSolicitud(body);
  const created = await createAusencia(payload);
  return ausDetail(created.id);
};

export const ausApprove = async (id, user_id) => {
  const row = await ausDetail(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });

  // Calcular requerido
  let requerido = 0;
  if (row.unidad_codigo === 'dia') {
    const days = parseDaysInclusive(row.fecha_desde, row.fecha_hasta);
    requerido = row.es_medio_dia ? 0.5 : days;
  } else { // 'hora'
    requerido = Number(row.duracion_horas ?? 0);
    if (requerido <= 0) requerido = WORKDAY_HOURS; // fallback
  }

  return aprobarAusenciaConConsumo({
    ausencia_id: id,
    aprobado_por_user_id: user_id,
    requerido,
    unidad_codigo: row.unidad_codigo
  });
};

export const ausReject = async (id, { denegado_motivo, comentario_admin }) => {
  const row = await ausDetail(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo ausencias pendientes pueden rechazarse'), { status: 409 });
  const den = await getEstadoByCodigo('denegada');
  return updateAusencia(id, { estado_id: den.id, denegado_motivo: denegado_motivo ?? null, comentario_admin: comentario_admin ?? null });
};

export const ausCancel = async (id) => {
  const row = await ausDetail(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo ausencias pendientes pueden cancelarse'), { status: 409 });
  const can = await getEstadoByCodigo('cancelada');
  return updateAusencia(id, { estado_id: can.id });
};

// ===== Solicitud de Asignación (cuota extra) =====
export const asignacionSolicitudCreateSvc = async (body, meUserId) => {
  const { feder_id, tipo_id, tipo_codigo, unidad_id, unidad_codigo, cantidad_solicitada, vigencia_desde, vigencia_hasta, motivo } = body;
  const fid = feder_id ?? (await (async () => {
    const me = await getFederByUser(meUserId);
    if (!me) throw Object.assign(new Error('El usuario no tiene Feder activo'), { status: 404 });
    return me.id;
  })());
  await ensureFeder(fid);

  const tipo = await getTipoBy({ id: tipo_id, codigo: tipo_codigo });
  if (!tipo) throw Object.assign(new Error('Tipo inválido'), { status: 400 });

  const unidad = await (async () => {
    if (unidad_id || unidad_codigo) return getUnidadBy({ id: unidad_id, codigo: unidad_codigo });
    const rows = await listUnidades();
    return rows.find(x => x.id === tipo.unidad_id);
  })();
  if (!unidad) throw Object.assign(new Error('Unidad inválida'), { status: 400 });

  const pend = await getEstadoByCodigo('pendiente');

  const row = await (await initModels()).AusenciaAsignacionSolicitud.create({
    feder_id: fid,
    tipo_id: tipo.id,
    unidad_id: unidad.id,
    cantidad_solicitada,
    vigencia_desde,
    vigencia_hasta,
    motivo: motivo ?? null,
    estado_id: pend.id
  });

  return row.toJSON();
};

export const asignacionSolicitudListSvc = async ({ feder_id, estado_codigo }) => {
  const repl = {};
  const where = [];
  if (feder_id) { where.push('s.feder_id = :fid'); repl.fid = feder_id; }
  if (estado_codigo) { where.push('e.codigo = :ec'); repl.ec = estado_codigo; }
  const sql = `
    SELECT s.*, e.codigo AS estado_codigo, t.nombre AS tipo_nombre, u.codigo AS unidad_codigo
    FROM "AusenciaAsignacionSolicitud" s
    JOIN "AusenciaEstado" e ON e.id = s.estado_id
    JOIN "AusenciaTipo" t ON t.id = s.tipo_id
    JOIN "AusenciaUnidadTipo" u ON u.id = s.unidad_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY s.created_at DESC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const asignacionSolicitudApproveSvc = async (id, user_id) => {
  const S = (await initModels()).AusenciaAsignacionSolicitud;
  const row = await S.findByPk(id);
  if (!row) throw Object.assign(new Error('Solicitud no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo pendientes pueden aprobarse'), { status: 409 });
  const apr = await getEstadoByCodigo('aprobada');

  await assignCuota({
    feder_id: row.feder_id,
    tipo_id: row.tipo_id,
    unidad_id: row.unidad_id,
    cantidad_total: row.cantidad_solicitada,
    vigencia_desde: row.vigencia_desde,
    vigencia_hasta: row.vigencia_hasta,
    comentario: 'Aprobación de solicitud',
    asignado_por_user_id: user_id
  });

  await row.update({ estado_id: apr.id, aprobado_por_user_id: user_id, aprobado_at: new Date() });
  return row.toJSON();
};

export const asignacionSolicitudDenySvc = async (id, { comentario_admin }) => {
  const S = (await initModels()).AusenciaAsignacionSolicitud;
  const row = await S.findByPk(id);
  if (!row) throw Object.assign(new Error('Solicitud no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo pendientes pueden denegarse'), { status: 409 });
  const den = await getEstadoByCodigo('denegada');
  await row.update({ estado_id: den.id, comentario_admin: comentario_admin ?? null });
  return row.toJSON();
};

export const asignacionSolicitudCancelSvc = async (id) => {
  const S = (await initModels()).AusenciaAsignacionSolicitud;
  const row = await S.findByPk(id);
  if (!row) throw Object.assign(new Error('Solicitud no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo pendientes pueden cancelarse'), { status: 409 });
  const can = await getEstadoByCodigo('cancelada');
  await row.update({ estado_id: can.id });
  return row.toJSON();
};

// ===== “Me” helpers =====
export const meFeder = async (user_id) => {
  const me = await getFederByUser(user_id);
  if (!me) throw Object.assign(new Error('El usuario no tiene Feder activo'), { status: 404 });
  return me;
};
