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
