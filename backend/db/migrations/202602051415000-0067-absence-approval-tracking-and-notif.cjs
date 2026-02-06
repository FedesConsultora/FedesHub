'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Agregar campos de rastreo de denegación a la tabla Ausencia (con catch para ignorar si ya existen)
        await queryInterface.addColumn('Ausencia', 'denegado_por_user_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'User', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        }).catch(() => { });

        await queryInterface.addColumn('Ausencia', 'denegado_at', {
            type: Sequelize.DATE,
            allowNull: true
        }).catch(() => { });

        // 2. Insertar nuevos tipos de notificación (con ON CONFLICT)
        const [buzones] = await queryInterface.sequelize.query(
            "SELECT id FROM \"BuzonTipo\" WHERE codigo = 'tareas' LIMIT 1"
        );
        const buzonId = buzones[0]?.id || 1;

        await queryInterface.sequelize.query(`
            INSERT INTO "NotificacionTipo" (codigo, nombre, descripcion, canales_default_json, buzon_id, created_at, updated_at)
            VALUES 
            ('ausencia_aprobada', 'Ausencia aprobada', 'Se envía al solicitante cuando su ausencia es aprobada', '${JSON.stringify(['in_app', 'email'])}', ${buzonId}, NOW(), NOW()),
            ('ausencia_rechazada', 'Ausencia rechazada', 'Se envía al solicitante cuando su ausencia es rechazada', '${JSON.stringify(['in_app', 'email'])}', ${buzonId}, NOW(), NOW())
            ON CONFLICT (codigo) DO NOTHING;
        `);
    },

    async down(queryInterface, Sequelize) {
        // 1. Eliminar tipos de notificación
        await queryInterface.bulkDelete('NotificacionTipo', {
            codigo: ['ausencia_aprobada', 'ausencia_rechazada']
        });

        // 2. Eliminar campos de la tabla Ausencia
        await queryInterface.removeColumn('Ausencia', 'denegado_at');
        await queryInterface.removeColumn('Ausencia', 'denegado_por_user_id');
    }
};
