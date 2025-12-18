'use strict';

module.exports = {
    async up(qi) {
        const now = new Date();

        // 1. Obtener IDs necesarios
        const [mods] = await qi.sequelize.query(`SELECT id FROM "Modulo" WHERE codigo = 'tareas' LIMIT 1`);
        const [acts] = await qi.sequelize.query(`SELECT id FROM "Accion" WHERE codigo = 'delete' LIMIT 1`);
        const [roles] = await qi.sequelize.query(`SELECT id, nombre FROM "Rol" WHERE nombre IN ('NivelA', 'NivelB')`);

        if (!mods.length || !acts.length) {
            console.log('⚠️ No se encontró el módulo tareas o la acción delete. Saltando seeder.');
            return;
        }

        const modulo_id = mods[0].id;
        const accion_id = acts[0].id;

        // 2. Asegurar que el permiso tareas.delete exista
        await qi.sequelize.query(`
      INSERT INTO "Permiso" (modulo_id, accion_id, nombre, created_at, updated_at)
      VALUES (${modulo_id}, ${accion_id}, 'tareas.delete', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);

        const [perm] = await qi.sequelize.query(`
      SELECT id FROM "Permiso" WHERE modulo_id = ${modulo_id} AND accion_id = ${accion_id} LIMIT 1
    `);

        if (!perm.length) return;
        const permiso_id = perm[0].id;

        // 3. Asignar el permiso a los roles correspondientes
        for (const role of roles) {
            await qi.sequelize.query(`
        INSERT INTO "RolPermiso" (rol_id, permiso_id, created_at)
        VALUES (${role.id}, ${permiso_id}, NOW())
        ON CONFLICT DO NOTHING;
      `);
        }
    },

    async down(qi) {
        // No revertimos para no romper permisos
    }
};
