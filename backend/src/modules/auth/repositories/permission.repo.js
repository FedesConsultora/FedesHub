// backend/src/modules/auth/repositories/permission.repo.js
import { sequelize } from '../../../core/db.js';
import { QueryTypes } from 'sequelize';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

export const listModules = () =>
  models.Modulo.findAll({ attributes: ['id', 'codigo', 'nombre', 'descripcion'], order: [['codigo', 'ASC']] });

export const listActions = () =>
  models.Accion.findAll({ attributes: ['id', 'codigo', 'nombre', 'descripcion'], order: [['codigo', 'ASC']] });

export const listPermissions = async ({ modulo, accion } = {}) => {
  let where = [];
  const repl = {};
  let sql = `
    SELECT p.id, m.codigo AS modulo, a.codigo AS accion, p.nombre, p.descripcion
    FROM "Permiso" p
    JOIN "Modulo" m ON m.id = p.modulo_id
    JOIN "Accion" a ON a.id = p.accion_id
  `;
  if (modulo) { where.push('m.codigo = :modulo'); repl.modulo = modulo; }
  if (accion) { where.push('a.codigo = :accion'); repl.accion = accion; }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY m.codigo, a.codigo';

  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const getRolePermissions = async (rolId) => {
  return sequelize.query(`
    SELECT p.id, m.codigo AS modulo, a.codigo AS accion
    FROM "RolPermiso" rp
    JOIN "Permiso" p ON p.id = rp.permiso_id
    JOIN "Modulo" m ON m.id = p.modulo_id
    JOIN "Accion" a ON a.id = p.accion_id
    WHERE rp.rol_id = :rid
    ORDER BY m.codigo, a.codigo
  `, { type: QueryTypes.SELECT, replacements: { rid: rolId } });
};

export const setRolePermissions = async (rolId, permisoIds) => {
  await models.RolPermiso.destroy({ where: { rol_id: rolId } });
  const rows = permisoIds.map(pid => ({ rol_id: rolId, permiso_id: pid }));
  if (rows.length) await models.RolPermiso.bulkCreate(rows, { ignoreDuplicates: true });
  return getRolePermissions(rolId);
};

export const addRolePermissions = async (rolId, permisoIds) => {
  const rows = permisoIds.map(pid => ({ rol_id: rolId, permiso_id: pid }));
  if (rows.length) await models.RolPermiso.bulkCreate(rows, { ignoreDuplicates: true });
  return getRolePermissions(rolId);
};

export const removeRolePermissions = async (rolId, permisoIds) => {
  if (permisoIds?.length) {
    await models.RolPermiso.destroy({ where: { rol_id: rolId, permiso_id: permisoIds } });
  }
  return getRolePermissions(rolId);
};

export const ensurePermission = async (modulo, accion, nombre, descripcion = null) => {
  const [m] = await models.Modulo.findOrCreate({ where: { codigo: modulo }, defaults: { nombre: modulo } });
  const [a] = await models.Accion.findOrCreate({ where: { codigo: accion }, defaults: { nombre: accion } });

  const [p, created] = await models.Permiso.findOrCreate({
    where: { modulo_id: m.id, accion_id: a.id },
    defaults: { nombre: nombre || `${modulo}.${accion}`, descripcion }
  });

  return p;
};
