// backend/src/modules/auth/repositories/role.repo.js
import { sequelize } from '../../../core/db.js';
import { QueryTypes } from 'sequelize';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

// ya tenías:
export const listAllRoles = async () => {
  return sequelize.query(
    `SELECT id, nombre, descripcion FROM "Rol" ORDER BY nombre`,
    { type: QueryTypes.SELECT }
  );
};

// nuevos:
export const listRoleTypes = () =>
  models.RolTipo.findAll({ attributes: ['id','codigo','nombre','descripcion'], order: [['id','ASC']] });

export const getRoleById = (id) =>
  models.Rol.findByPk(id, { attributes: ['id','nombre','descripcion','rol_tipo_id'] });

export const isSystemRole = async (rolId) => {
  const rows = await sequelize.query(`
    SELECT rt.codigo
    FROM "Rol" r
    JOIN "RolTipo" rt ON rt.id = r.rol_tipo_id
    WHERE r.id = :id
  `, { type: QueryTypes.SELECT, replacements: { id: rolId }});
  return rows[0]?.codigo === 'system';
};

export const createRole = async ({ nombre, descripcion = null, rol_tipo = 'custom' }) => {
  const rows = await sequelize.query(`
    SELECT id FROM "RolTipo" WHERE codigo = :code LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { code: rol_tipo }});
  const rol_tipo_id = rows[0]?.id;
  if (!rol_tipo_id) throw Object.assign(new Error('RolTipo inválido'), { status: 400 });
  return models.Rol.create({ nombre, descripcion, rol_tipo_id });
};

export const updateRole = async (id, { nombre, descripcion }) => {
  if (await isSystemRole(id)) {
    throw Object.assign(new Error('No se puede editar un rol del sistema'), { status: 400 });
  }
  await models.Rol.update(
    { ...(nombre ? { nombre } : {}), ...(descripcion !== undefined ? { descripcion } : {}) },
    { where: { id } }
  );
  return getRoleById(id);
};

export const deleteRole = async (id) => {
  if (await isSystemRole(id)) {
    throw Object.assign(new Error('No se puede eliminar un rol del sistema'), { status: 400 });
  }
  const used = await models.UserRol.count({ where: { rol_id: id }});
  if (used > 0) {
    throw Object.assign(new Error('El rol tiene usuarios asignados'), { status: 400 });
  }
  await models.RolPermiso.destroy({ where: { rol_id: id }});
  await models.Rol.destroy({ where: { id }});
  return { ok: true };
};
