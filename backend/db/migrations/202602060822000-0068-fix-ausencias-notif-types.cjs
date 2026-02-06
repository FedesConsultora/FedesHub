
'use strict';

module.exports = {
  async up(queryInterface) {
    // 1. Eliminar la vieja si ya existe la nueva para evitar conflicto de unicidad
    await queryInterface.sequelize.query(`
            DELETE FROM "NotificacionTipo" WHERE codigo = 'ausencia_denegada' 
            AND EXISTS (SELECT 1 FROM "NotificacionTipo" WHERE codigo = 'ausencia_rechazada');
        `);

    // 2. Renombrar si aún existe (por si no existía la nueva)
    await queryInterface.sequelize.query(`
            UPDATE "NotificacionTipo" 
            SET codigo = 'ausencia_rechazada', nombre = 'Ausencia rechazada'
            WHERE codigo = 'ausencia_denegada';
        `);

    // 3. Crear si ninguna de las anteriores funcionó ( fallback idempotente )
    await queryInterface.sequelize.query(`
            INSERT INTO "NotificacionTipo" (codigo, nombre, buzon_id, canales_default_json, created_at, updated_at)
            SELECT 'ausencia_rechazada', 'Ausencia rechazada', id, '["in_app", "email"]'::jsonb, NOW(), NOW()
            FROM "BuzonTipo" WHERE codigo = 'tareas'
            ON CONFLICT (codigo) DO NOTHING;
        `);

    // 4. Asegurar que ambas (aprobada y rechazada) tengan email por defecto
    await queryInterface.sequelize.query(`
            UPDATE "NotificacionTipo"
            SET canales_default_json = '["in_app", "email"]'::jsonb
            WHERE codigo IN ('ausencia_aprobada', 'ausencia_rechazada');
        `);
  },

  async down(queryInterface) {
    // No revertimos para no romper la lógica de negocio actual que ya usa 'rechazada'
  }
};
