import { sequelize } from './src/core/db.js';
import { QueryTypes } from 'sequelize';

async function test() {
  const users = await sequelize.query(`
    SELECT u.email, r.nombre as rol
    FROM "User" u
    JOIN "UserRol" ur ON ur.user_id = u.id
    JOIN "Rol" r ON r.id = ur.rol_id
    WHERE u.email IN ('florencia@fedesconsultora.com', 'romina@fedesconsultora.com', 'epinotti@fedesconsultora.com')
  `, { type: QueryTypes.SELECT });

  console.log('Users and Roles:', JSON.stringify(users, null, 2));

  const perms = await sequelize.query(`
    SELECT r.nombre as rol, m.codigo as mod, a.codigo as act
    FROM "RolPermiso" rp
    JOIN "Rol" r ON r.id = rp.rol_id
    JOIN "Permiso" p ON p.id = rp.permiso_id
    JOIN "Modulo" m ON m.id = p.modulo_id
    JOIN "Accion" a ON a.id = p.accion_id
    WHERE r.nombre = 'RRHH' AND m.codigo = 'rrhh'
  `, { type: QueryTypes.SELECT });

  console.log('RRHH permissions:', JSON.stringify(perms, null, 2));

  const sistemasPerms = await sequelize.query(`
    SELECT m.codigo as mod, a.codigo as act
    FROM "UserRol" ur
    JOIN "RolPermiso" rp ON rp.rol_id = ur.rol_id
    JOIN "Permiso" p ON p.id = rp.permiso_id
    JOIN "Modulo" m ON m.id = p.modulo_id
    JOIN "Accion" a ON a.id = p.accion_id
    WHERE ur.user_id = 1 AND m.codigo = 'rrhh'
  `, { type: QueryTypes.SELECT });

  console.log('Sistemas (User 1) RRHH permissions:', JSON.stringify(sistemasPerms, null, 2));

  process.exit(0);
}

test();
