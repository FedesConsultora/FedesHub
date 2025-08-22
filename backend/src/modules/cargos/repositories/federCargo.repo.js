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
