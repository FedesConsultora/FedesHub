// backend/src/modules/asistencia/repositories/asistencia.repo.js
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

// ============ Catálogo Modalidad ============
export const getModalidadBy = async ({ id, codigo }) => {
  if (id) return models.ModalidadTrabajoTipo.findByPk(id);
  if (codigo) return models.ModalidadTrabajoTipo.findOne({ where: { codigo } });
  return null;
};

// Plan semanal → modalidad por día
export const getModalidadPlanFor = async (feder_id, at) => {
  const rows = await sequelize.query(`
    SELECT fmd.modalidad_id
    FROM "FederModalidadDia" fmd
    WHERE fmd.feder_id = :fid
      AND fmd.dia_semana_id = EXTRACT(ISODOW FROM :at::timestamptz)::int
      AND fmd.is_activo = true
    LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { fid: feder_id, at } });
  return rows[0]?.modalidad_id ?? null;
};

// Fallback razonable
export const getFallbackModalidadId = async () => {
  const rows = await sequelize.query(`
    SELECT id FROM "ModalidadTrabajoTipo"
    WHERE codigo IN ('presencial','oficina')
    ORDER BY CASE codigo WHEN 'presencial' THEN 1 ELSE 2 END
    LIMIT 1
  `, { type: QueryTypes.SELECT });
  return rows[0]?.id ?? null;
};

// ================== Catálogos ==================
export const listOrigenes = () =>
  models.AsistenciaOrigenTipo.findAll({
    attributes: ['id', 'codigo', 'nombre', 'descripcion'], order: [['codigo', 'ASC']]
  });

export const listCierreMotivos = () =>
  models.AsistenciaCierreMotivoTipo.findAll({
    attributes: ['id', 'codigo', 'nombre', 'descripcion'], order: [['codigo', 'ASC']]
  });

export const getOrigenBy = async ({ id, codigo }) => {
  if (id) return models.AsistenciaOrigenTipo.findByPk(id);
  if (codigo) return models.AsistenciaOrigenTipo.findOne({ where: { codigo } });
  return null;
};

export const getCierreMotivoBy = async ({ id, codigo }) => {
  if (id) return models.AsistenciaCierreMotivoTipo.findByPk(id);
  if (codigo) return models.AsistenciaCierreMotivoTipo.findOne({ where: { codigo } });
  return null;
};

// ================== Helpers ==================
export const ensureFederExists = async (feder_id) => {
  const f = await models.Feder.findByPk(feder_id, { attributes: ['id', 'is_activo'] });
  if (!f) throw Object.assign(new Error('Feder no encontrado'), { status: 404 });
  if (!f.is_activo) throw Object.assign(new Error('Feder inactivo'), { status: 400 });
  return f;
};

export const getFederByUser = async (user_id) => {
  if (!user_id) return null;
  return models.Feder.findOne({ where: { user_id, is_activo: true }, attributes: ['id', 'user_id', 'is_activo'] });
};

// ================== Consultas ==================
const baseSelect = `
  SELECT
    ar.id, ar.feder_id, f.nombre AS feder_nombre, f.apellido AS feder_apellido,
    ar.check_in_at, ar.check_out_at,
    ar.check_in_origen_id, oin.codigo as check_in_origen_codigo, oin.nombre as check_in_origen_nombre,
    ar.check_out_origen_id, oout.codigo as check_out_origen_codigo, oout.nombre as check_out_origen_nombre,
    ar.cierre_motivo_id, cm.codigo as cierre_motivo_codigo, cm.nombre as cierre_motivo_nombre,
    ar.modalidad_id, mt.codigo AS modalidad_codigo, mt.nombre AS modalidad_nombre,
    ar.comentario, ar.created_at, ar.updated_at,
    EXTRACT(EPOCH FROM (COALESCE(ar.check_out_at, NOW()) - ar.check_in_at))/60.0 AS minutos_trabajados,
    EXTRACT(EPOCH FROM (COALESCE(ar.check_out_at, NOW()) - ar.check_in_at))::int    AS segundos_trabajados
  FROM "AsistenciaRegistro" ar
  JOIN "Feder" f ON f.id = ar.feder_id
  LEFT JOIN "AsistenciaOrigenTipo" oin  ON oin.id  = ar.check_in_origen_id
  LEFT JOIN "AsistenciaOrigenTipo" oout ON oout.id = ar.check_out_origen_id
  LEFT JOIN "AsistenciaCierreMotivoTipo" cm ON cm.id = ar.cierre_motivo_id
  LEFT JOIN "ModalidadTrabajoTipo" mt ON mt.id = ar.modalidad_id
`;

export const listRegistros = async ({ feder_id, celula_id, desde, hasta, abiertos, q, limit = 50, offset = 0, order = 'desc' }) => {
  const repl = { limit, offset };
  let sql = baseSelect;
  const where = [];
  if (feder_id) { where.push('ar.feder_id = :feder_id'); repl.feder_id = feder_id; }
  if (celula_id) { where.push('f.celula_id = :celula_id'); repl.celula_id = celula_id; }
  if (desde) { where.push('ar.check_in_at >= :desde'); repl.desde = desde; }
  if (hasta) { where.push('ar.check_in_at <= :hasta'); repl.hasta = hasta; }
  if (typeof abiertos === 'boolean') where.push(abiertos ? 'ar.check_out_at IS NULL' : 'ar.check_out_at IS NOT NULL');
  if (q) { where.push(`(LOWER(f.nombre) LIKE :q OR LOWER(f.apellido) LIKE :q OR LOWER(COALESCE(ar.comentario,'')) LIKE :q)`); repl.q = `%${q.toLowerCase()}%`; }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ` ORDER BY ar.check_in_at ${order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC'} LIMIT :limit OFFSET :offset`;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const countRegistros = async ({ feder_id, celula_id, desde, hasta, abiertos, q }) => {
  const repl = {};
  let sql = `
    SELECT COUNT(*)::int AS cnt
    FROM "AsistenciaRegistro" ar
    JOIN "Feder" f ON f.id = ar.feder_id
  `;
  const where = [];
  if (feder_id) { where.push('ar.feder_id = :feder_id'); repl.feder_id = feder_id; }
  if (celula_id) { where.push('f.celula_id = :celula_id'); repl.celula_id = celula_id; }
  if (desde) { where.push('ar.check_in_at >= :desde'); repl.desde = desde; }
  if (hasta) { where.push('ar.check_in_at <= :hasta'); repl.hasta = hasta; }
  if (typeof abiertos === 'boolean') where.push(abiertos ? 'ar.check_out_at IS NULL' : 'ar.check_out_at IS NOT NULL');
  if (q) { where.push(`(LOWER(f.nombre) LIKE :q OR LOWER(f.apellido) LIKE :q OR LOWER(COALESCE(ar.comentario,'')) LIKE :q)`); repl.q = `%${q.toLowerCase()}%`; }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  const rows = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
  return rows[0]?.cnt ?? 0;
};

export const getRegistroById = async (id) => {
  const rows = await sequelize.query(`${baseSelect} WHERE ar.id = :id`, {
    type: QueryTypes.SELECT, replacements: { id }
  });
  return rows[0] || null;
};

export const getOpenByFeder = async (feder_id, { lock = false, tx = null } = {}) => {
  const sql = `${baseSelect} WHERE ar.feder_id = :feder_id AND ar.check_out_at IS NULL ORDER BY ar.check_in_at DESC LIMIT 1`;
  return sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: { feder_id },
    transaction: tx,
    lock: lock ? tx?.LOCK.UPDATE : undefined
  }).then(r => r[0] || null);
};

// ================== Mutaciones ==================
export const createCheckIn = async ({ feder_id, check_in_at, check_in_origen_id, comentario, modalidad_id }) => {
  await ensureFederExists(feder_id);

  if (check_in_origen_id) {
    const o = await models.AsistenciaOrigenTipo.findByPk(check_in_origen_id);
    if (!o) throw Object.assign(new Error('Origen de check-in inválido'), { status: 400 });
  }

  const modId = modalidad_id ?? await getModalidadPlanFor(feder_id, check_in_at) ?? await getFallbackModalidadId();

  const row = await models.AsistenciaRegistro.create({
    feder_id, check_in_at, check_in_origen_id, comentario, modalidad_id: modId
  });
  return getRegistroById(row.id);
};

export const updateCheckOut = async (id, { check_out_at, check_out_origen_id, cierre_motivo_id, comentario }) => {
  const row = await models.AsistenciaRegistro.findByPk(id);
  if (!row) throw Object.assign(new Error('Registro no encontrado'), { status: 404 });
  if (row.check_out_at) throw Object.assign(new Error('El registro ya está cerrado'), { status: 409 });

  if (check_out_origen_id) {
    const o = await models.AsistenciaOrigenTipo.findByPk(check_out_origen_id);
    if (!o) throw Object.assign(new Error('Origen de check-out inválido'), { status: 400 });
  }
  if (cierre_motivo_id) {
    const m = await models.AsistenciaCierreMotivoTipo.findByPk(cierre_motivo_id);
    if (!m) throw Object.assign(new Error('Motivo de cierre inválido'), { status: 400 });
  }
  if (check_out_at && new Date(check_out_at) < new Date(row.check_in_at)) {
    throw Object.assign(new Error('check_out_at no puede ser anterior a check_in_at'), { status: 400 });
  }

  await row.update({ check_out_at, check_out_origen_id, cierre_motivo_id, comentario: comentario ?? row.comentario });
  return getRegistroById(row.id);
};

export const adjustRegistro = async (id, patch) => {
  const row = await models.AsistenciaRegistro.findByPk(id);
  if (!row) throw Object.assign(new Error('Registro no encontrado'), { status: 404 });

  const next = { ...patch };
  if (next.modalidad_id) {
    const m = await models.ModalidadTrabajoTipo.findByPk(next.modalidad_id);
    if (!m) throw Object.assign(new Error('modalidad_id inválido'), { status: 400 });
  }
  if (next.check_in_at && row.check_out_at && new Date(next.check_in_at) > new Date(row.check_out_at)) {
    throw Object.assign(new Error('check_in_at no puede ser posterior a check_out_at'), { status: 400 });
  }
  if (next.check_out_at && new Date(next.check_out_at) < new Date(next.check_in_at ?? row.check_in_at)) {
    throw Object.assign(new Error('check_out_at no puede ser anterior a check_in_at'), { status: 400 });
  }
  if (next.check_in_origen_id) {
    const o = await models.AsistenciaOrigenTipo.findByPk(next.check_in_origen_id);
    if (!o) throw Object.assign(new Error('check_in_origen_id inválido'), { status: 400 });
  }
  if (next.check_out_origen_id) {
    const o = await models.AsistenciaOrigenTipo.findByPk(next.check_out_origen_id);
    if (!o) throw Object.assign(new Error('check_out_origen_id inválido'), { status: 400 });
  }
  if (next.cierre_motivo_id) {
    const m = await models.AsistenciaCierreMotivoTipo.findByPk(next.cierre_motivo_id);
    if (!m) throw Object.assign(new Error('cierre_motivo_id inválido'), { status: 400 });
  }

  await row.update(next);
  return getRegistroById(row.id);
};

export const forceCloseOpenForFeder = async (feder_id, { check_out_at, cierre_motivo_id, check_out_origen_id, comentario }) => {
  return sequelize.transaction(async (tx) => {
    const open = await getOpenByFeder(feder_id, { lock: true, tx });
    if (!open) throw Object.assign(new Error('El feder no tiene registro abierto'), { status: 404 });

    if (check_out_origen_id) {
      const o = await models.AsistenciaOrigenTipo.findByPk(check_out_origen_id);
      if (!o) throw Object.assign(new Error('Origen de check-out inválido'), { status: 400 });
    }
    if (!cierre_motivo_id) throw Object.assign(new Error('cierre_motivo_id es requerido'), { status: 400 });
    const m = await models.AsistenciaCierreMotivoTipo.findByPk(cierre_motivo_id);
    if (!m) throw Object.assign(new Error('Motivo de cierre inválido'), { status: 400 });

    if (new Date(check_out_at) < new Date(open.check_in_at)) {
      throw Object.assign(new Error('check_out_at no puede ser anterior a check_in_at'), { status: 400 });
    }

    await models.AsistenciaRegistro.update(
      { check_out_at, check_out_origen_id, cierre_motivo_id, comentario: comentario ?? open.comentario },
      { where: { id: open.id }, transaction: tx }
    );
    return getRegistroById(open.id);
  });
};

// ================== Toggle (check-in/out en un botón) ==================
export const toggleForFeder = async ({ feder_id, at, origen_id, modalidad_id }) => {
  await ensureFederExists(feder_id);
  const origen = origen_id ? await models.AsistenciaOrigenTipo.findByPk(origen_id) : null;
  if (origen_id && !origen) throw Object.assign(new Error('Origen inválido'), { status: 400 });

  return sequelize.transaction(async (tx) => {
    const open = await models.AsistenciaRegistro.findOne({
      where: { feder_id, check_out_at: null }, transaction: tx, lock: tx.LOCK.UPDATE
    });

    if (open) {
      if (new Date(at) < new Date(open.check_in_at)) {
        throw Object.assign(new Error('No se puede cerrar antes del check-in'), { status: 400 });
      }
      await open.update({ check_out_at: at, check_out_origen_id: origen_id }, { transaction: tx });
      return getRegistroById(open.id);
    }

    const modId = modalidad_id ?? await getModalidadPlanFor(feder_id, at) ?? await getFallbackModalidadId();

    const created = await models.AsistenciaRegistro.create({
      feder_id, check_in_at: at, check_in_origen_id: origen_id, modalidad_id: modId
    }, { transaction: tx });
    return getRegistroById(created.id);
  });
};

// ================== Reporte simple por periodo ==================
export const resumenPorPeriodo = async ({ desde, hasta, celula_id, feder_id }) => {
  const repl = { desde, hasta };
  const where = ['ar.check_in_at >= :desde', 'ar.check_in_at <= :hasta'];
  if (celula_id) { where.push('f.celula_id = :celula_id'); repl.celula_id = celula_id; }
  if (feder_id) { where.push('ar.feder_id = :feder_id'); repl.feder_id = feder_id; }
  const sql = `
    SELECT
      ar.feder_id, f.nombre, f.apellido,
      date_trunc('day', ar.check_in_at)::date AS fecha,
      SUM(EXTRACT(EPOCH FROM (COALESCE(ar.check_out_at, NOW()) - ar.check_in_at))/3600.0)::numeric(10,2) AS horas
    FROM "AsistenciaRegistro" ar
    JOIN "Feder" f ON f.id = ar.feder_id
    WHERE ${where.join(' AND ')}
    GROUP BY ar.feder_id, f.nombre, f.apellido, date_trunc('day', ar.check_in_at)
    ORDER BY fecha ASC, apellido ASC, nombre ASC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};
export const timelineDiaRepo = async ({ fecha, feder_id, celula_id }) => {
  // día en límites [00:00, 24:00) del servidor
  const sql = `
    WITH bounds AS (
      SELECT
        (:fecha::date)::timestamptz             AS day_start,
        (:fecha::date + INTERVAL '1 day')::timestamptz AS day_end
    )
    SELECT
      ar.id,
      f.id      AS feder_id,
      f.nombre  AS feder_nombre,
      f.apellido AS feder_apellido,
      mt.codigo AS modalidad_codigo,
      mt.nombre AS modalidad_nombre,

      GREATEST(ar.check_in_at,  (SELECT day_start FROM bounds))   AS seg_start_at,
      LEAST  (COALESCE(ar.check_out_at, NOW()), (SELECT day_end FROM bounds)) AS seg_end_at,

      -- offsets relativos al inicio del día (para dibujar)
      FLOOR(EXTRACT(EPOCH FROM (GREATEST(ar.check_in_at, (SELECT day_start FROM bounds)) - (SELECT day_start FROM bounds)))/60.0)::int AS start_min,
      CEIL (EXTRACT(EPOCH FROM (LEAST  (COALESCE(ar.check_out_at, NOW()), (SELECT day_end FROM bounds)) - (SELECT day_start FROM bounds)))/60.0)::int AS end_min,

      EXTRACT(EPOCH FROM (
        LEAST  (COALESCE(ar.check_out_at, NOW()), (SELECT day_end FROM bounds)) -
        GREATEST(ar.check_in_at, (SELECT day_start FROM bounds))
      ))::int AS segundos

    FROM "AsistenciaRegistro" ar
    JOIN "Feder" f ON f.id = ar.feder_id
    LEFT JOIN "ModalidadTrabajoTipo" mt ON mt.id = ar.modalidad_id
    WHERE
      -- que el tramo se superponga con el día
      ar.check_in_at <  (SELECT day_end   FROM bounds)
      AND COALESCE(ar.check_out_at, NOW()) > (SELECT day_start FROM bounds)
      -- filtros opcionales
      AND (:feder_id::int IS NULL OR ar.feder_id = :feder_id)
      AND (:celula_id::int IS NULL OR f.celula_id = :celula_id)
    ORDER BY f.apellido ASC, f.nombre ASC, seg_start_at ASC
  `;
  return sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: { fecha, feder_id: feder_id ?? null, celula_id: celula_id ?? null }
  });
};


export const timelineRangoRepo = async ({ desde, hasta, feder_id, celula_id, q }) => {
  const repl = { desde, hasta }
  const where = [
    'ar.check_in_at >= :desde',
    'ar.check_in_at < :hasta',
  ]

  if (feder_id) {
    where.push('ar.feder_id = :feder_id')
    repl.feder_id = feder_id
  }

  if (celula_id) {
    where.push('f.celula_id = :celula_id')
    repl.celula_id = celula_id
  }

  if (q) {
    where.push(`(
      LOWER(f.nombre) LIKE :q
      OR LOWER(f.apellido) LIKE :q
    )`)
    repl.q = `%${q.toLowerCase()}%`
  }

  const sql = `
    SELECT
      ar.id,
      ar.feder_id,
      f.nombre,
      f.apellido,
      ar.check_in_at,
      ar.check_out_at,
      mt.codigo AS modalidad_codigo,
      mt.nombre AS modalidad_nombre
    FROM "AsistenciaRegistro" ar
    JOIN "Feder" f ON f.id = ar.feder_id
    LEFT JOIN "ModalidadTrabajoTipo" mt ON mt.id = ar.modalidad_id
    WHERE ${where.join(' AND ')}
    ORDER BY ar.check_in_at ASC
  `
  const response = sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: repl,
    logging: console.log,


  })
  console.log(response);





  return response;


}


// ================== Bulk Status (for attendance badges) ==================
export const getBulkOpenStatus = async (federIds = []) => {
  if (!federIds.length) return [];
  // Sanitizar IDs como integers para evitar SQL injection
  const safeIds = federIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  if (!safeIds.length) return [];

  const sql = `
    SELECT DISTINCT ON (ar.feder_id)
      ar.feder_id,
      ar.id as registro_id,
      ar.check_in_at,
      mt.codigo as modalidad_codigo
    FROM "AsistenciaRegistro" ar
    LEFT JOIN "ModalidadTrabajoTipo" mt ON mt.id = ar.modalidad_id
    WHERE ar.feder_id IN (${safeIds.join(',')})
      AND ar.check_out_at IS NULL
    ORDER BY ar.feder_id, ar.check_in_at DESC
  `;
  return await sequelize.query(sql, {
    type: QueryTypes.SELECT
  });
};