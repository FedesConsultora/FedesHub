// backend/db/migrations/202602061000000-0069-move-ausencias-notif-to-events.cjs
'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Obtener el buzon_id para 'calendario'
        const [buzones] = await queryInterface.sequelize.query(
            `SELECT id FROM "BuzonTipo" WHERE codigo = 'calendario'`
        );

        if (buzones && buzones.length > 0) {
            const buzonId = buzones[0].id;

            // 2. Actualizar tipos de notificación de ausencias
            await queryInterface.sequelize.query(`
        UPDATE "NotificacionTipo"
        SET buzon_id = :buzonId,
            canales_default_json = '["email","in_app"]'
        WHERE codigo IN ('ausencia_aprobada', 'ausencia_rechazada', 'ausencia_solicitada')
      `, {
                replacements: { buzonId }
            });

            // 3. Actualizar notificaciones existentes para que aparezcan en el nuevo buzón
            await queryInterface.sequelize.query(`
        UPDATE "Notificacion"
        SET buzon_id = :buzonId
        WHERE tipo_id IN (
          SELECT id FROM "NotificacionTipo" 
          WHERE codigo IN ('ausencia_aprobada', 'ausencia_rechazada', 'ausencia_solicitada')
        )
      `, {
                replacements: { buzonId }
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Revertir a 'tareas' (id 1) o lo que fuera
        await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET buzon_id = 1
      WHERE codigo IN ('ausencia_aprobada', 'ausencia_rechazada', 'ausencia_solicitada')
    `);
    }
};
