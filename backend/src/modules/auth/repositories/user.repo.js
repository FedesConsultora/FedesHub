// backend/src/modules/auth/repositories/user.repo.js
import { sequelize } from '../../../core/db.js';
import { QueryTypes } from 'sequelize';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

export const getActiveEmailDomain = async (dominio) =>
  models.AuthEmailDominio.findOne({ where: { dominio, is_activo: true } });

export const getUserByEmail = async (email) =>
  models.User.findOne({ where: { email } });

export const getUserById = async (id) => models.User.findByPk(id);

export const createUser = async ({ email, password_hash, email_dominio_id, is_activo }) =>
  models.User.create({ email, password_hash, email_dominio_id, is_activo });

export const setUserPassword = async (userId, password_hash) =>
  models.User.update({ password_hash }, { where: { id: userId } });

export const setUserActive = async (userId, is_activo) =>
  models.User.update({ is_activo }, { where: { id: userId } });

export const deleteUser = async (userId) => {
  return sequelize.transaction(async (t) => {
    // Check if there is a Feder associated
    const feder = await models.Feder.findOne({ where: { user_id: userId }, transaction: t });
    if (feder) {
      // If there's a Feder, we might want to handle their data. 
      // For now, let's just delete the Feder profile first.
      await models.Feder.destroy({ where: { id: feder.id }, transaction: t });
    }
    return models.User.destroy({ where: { id: userId }, transaction: t });
  });
};

export const getUserRoles = async (userId) => {
  return sequelize.query(`
    SELECT r.id, r.nombre
    FROM "UserRol" ur
    JOIN "Rol" r ON r.id = ur.rol_id
    WHERE ur.user_id = :uid
  `, { type: QueryTypes.SELECT, replacements: { uid: userId } });
};

export const assignRoles = async (userId, rolIds) => {
  await models.UserRol.destroy({ where: { user_id: userId } });
  const rows = rolIds.map(rol_id => ({ user_id: userId, rol_id }));
  if (rows.length) await models.UserRol.bulkCreate(rows, { ignoreDuplicates: true });
  return getUserRoles(userId);
};

export const getPermisosByUserId = async (userId) => {
  const rows = await sequelize.query(`
    SELECT md.codigo AS modulo, ac.codigo AS accion
    FROM "UserRol" ur
    JOIN "RolPermiso" rp ON rp.rol_id = ur.rol_id
    JOIN "Permiso" p ON p.id = rp.permiso_id
    JOIN "Modulo" md ON md.id = p.modulo_id
    JOIN "Accion" ac ON ac.id = p.accion_id
    WHERE ur.user_id = :uid
    GROUP BY md.codigo, ac.codigo
  `, { type: QueryTypes.SELECT, replacements: { uid: userId } });
  return rows.map(r => `${r.modulo}.${r.accion}`);
};

// listado admin (con roles)
export const listUsersWithRoles = async ({ limit = 50, offset = 0, q, is_activo } = {}) => {
  const repl = { limit, offset };
  const where = [];

  if (q) {
    where.push(`u.email ILIKE :q`);
    repl.q = `%${q}%`;
  }

  if (is_activo !== undefined) {
    const activeBool = (is_activo === true || is_activo === 'true' || is_activo === 1 || is_activo === '1');
    where.push(`u.is_activo = :is_activo`);
    repl.is_activo = activeBool;
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await sequelize.query(`
    SELECT
      u.id, u.email, u.is_activo,
      COALESCE(
        json_agg(json_build_object('id', r.id, 'nombre', r.nombre)
        ) FILTER (WHERE r.id IS NOT NULL), '[]'
      ) AS roles
    FROM "User" u
    LEFT JOIN "UserRol" ur ON ur.user_id = u.id
    LEFT JOIN "Rol" r ON r.id = ur.rol_id
    ${whereSql}
    GROUP BY u.id
    ORDER BY u.id
    LIMIT :limit OFFSET :offset
  `, { type: QueryTypes.SELECT, replacements: repl });
  return rows;
};
