// backend/db/migrations/202601121500000-add-new-notification-types.cjs
// Añade los nuevos tipos de notificación para tareas y asistencia

'use strict';

module.exports = {
    async up(queryInterface) {
        const t = await queryInterface.sequelize.transaction();

        try {
            // 1. Insertar nuevos tipos de notificación
            await queryInterface.bulkInsert('NotificacionTipo', [
                {
                    codigo: 'tarea_eliminada',
                    nombre: 'Tarea eliminada',
                    descripcion: 'Se envía cuando una tarea es eliminada del sistema',
                    canales_default_json: JSON.stringify(['in_app', 'email']),
                    buzon_id: 1, // Buzón general
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    codigo: 'tarea_cancelada',
                    nombre: 'Tarea cancelada',
                    descripcion: 'Se envía cuando una tarea cambia su estado a cancelada',
                    canales_default_json: JSON.stringify(['in_app', 'email']),
                    buzon_id: 1, // Buzón general
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    codigo: 'asistencia_recordatorio',
                    nombre: 'Recordatorio de asistencia',
                    descripcion: 'Recordatorio diario para activar la asistencia',
                    canales_default_json: JSON.stringify(['email']), // Solo email, no in_app
                    buzon_id: 1, // Buzón general
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ], { transaction: t });

            console.log('✓ Nuevos tipos de notificación creados exitosamente');

            await t.commit();
        } catch (error) {
            await t.rollback();
            console.error('Error en migración de tipos de notificación:', error);
            throw error;
        }
    },

    async down(queryInterface) {
        const t = await queryInterface.sequelize.transaction();

        try {
            // Eliminar los tipos de notificación creados
            await queryInterface.bulkDelete('NotificacionTipo', {
                codigo: ['tarea_eliminada', 'tarea_cancelada', 'asistencia_recordatorio']
            }, { transaction: t });

            console.log('✓ Tipos de notificación eliminados');

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
};
