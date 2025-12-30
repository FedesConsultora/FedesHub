// backend/src/modules/cargos/repositories/cargo.repo.js
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

// === Catálogo de Ámbitos ===
export const listAmbitos = () =>
  models.CargoAmbito.findAll({
    attributes: ['id', 'codigo', 'nombre', 'descripcion'],
    order: [['codigo', 'ASC']]
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
  `, { type: QueryTypes.SELECT, replacements: { id } });
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

// === Vista de Cargos con Personas (Overview) ===
export const listCargosWithPeople = async () => {
  const sql = `
    SELECT 
      c.id, c.nombre, c.descripcion, c.ambito_id, 
      a.nombre AS ambito_nombre, a.codigo AS ambito_codigo,
      COALESCE(
        json_agg(
          json_build_object(
            'id', f.id,
            'user_id', f.user_id,
            'nombre', f.nombre,
            'apellido', f.apellido,
            'avatar_url', f.avatar_url
          ) ORDER BY f.apellido ASC, f.nombre ASC
        ) FILTER (WHERE f.id IS NOT NULL AND f.is_activo = true),
        '[]'::json
      ) AS people
    FROM "Cargo" c
    JOIN "CargoAmbito" a ON a.id = c.ambito_id
    LEFT JOIN "FederCargo" fc ON fc.cargo_id = c.id 
      AND fc.es_principal = true 
      AND (fc.hasta IS NULL OR fc.hasta > CURRENT_DATE)
    LEFT JOIN "Feder" f ON f.id = fc.feder_id
    WHERE c.is_activo = true
    GROUP BY c.id, a.id
    ORDER BY a.codigo ASC, c.nombre ASC
  `;

  return sequelize.query(sql, { type: QueryTypes.SELECT });
};
