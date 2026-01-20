// backend/db/migrations/202601211100000-0054-add-tarea-recordatorio-type.cjs
'use strict';

module.exports = {
    async up(queryInterface) {
        const now = new Date();
        const [[bzTareas]] = await queryInterface.sequelize.query(`SELECT id FROM "BuzonTipo" WHERE codigo='tareas' LIMIT 1`);

        if (bzTareas) {
            await queryInterface.sequelize.query(`
        INSERT INTO "NotificacionTipo"(codigo, nombre, buzon_id, canales_default_json, created_at, updated_at)
        VALUES ('tarea_recordatorio', 'Recordatorio de tarea', :buzon_id, '["in_app", "push", "email"]'::jsonb, :now, :now)
        ON CONFLICT (codigo) DO UPDATE
        SET nombre = EXCLUDED.nombre,
            buzon_id = EXCLUDED.buzon_id,
            canales_default_json = EXCLUDED.canales_default_json,
            updated_at = EXCLUDED.updated_at;
      `, {
                replacements: {
                    buzon_id: bzTareas.id,
                    now
                }
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`DELETE FROM "NotificacionTipo" WHERE codigo='tarea_recordatorio'`);
    }
};
