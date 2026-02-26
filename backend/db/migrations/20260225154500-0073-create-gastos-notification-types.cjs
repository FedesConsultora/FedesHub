'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();
        const buzonId = 7; // Notificaciones del sistema

        const notificationTypes = [
            {
                codigo: 'gasto_creado',
                nombre: 'Nuevo gasto registrado',
                descripcion: 'Se notifica a los administradores cuando un usuario registra un nuevo gasto.',
                buzon_id: buzonId,
                canales_default_json: JSON.stringify(['email', 'push']),
                created_at: now,
                updated_at: now
            },
            {
                codigo: 'gasto_aprobado',
                nombre: 'Gasto aprobado',
                descripcion: 'Se notifica al usuario cuando su gasto ha sido aprobado.',
                buzon_id: buzonId,
                canales_default_json: JSON.stringify(['email', 'push']),
                created_at: now,
                updated_at: now
            },
            {
                codigo: 'gasto_rechazado',
                nombre: 'Gasto rechazado',
                descripcion: 'Se notifica al usuario cuando su gasto ha sido rechazado.',
                buzon_id: buzonId,
                canales_default_json: JSON.stringify(['email', 'push']),
                created_at: now,
                updated_at: now
            },
            {
                codigo: 'gasto_reintegrado',
                nombre: 'Gasto reintegrado',
                descripcion: 'Se notifica al usuario cuando su gasto ha sido reintegrado.',
                buzon_id: buzonId,
                canales_default_json: JSON.stringify(['email', 'push']),
                created_at: now,
                updated_at: now
            }
        ];

        await queryInterface.bulkInsert('NotificacionTipo', notificationTypes, { ignoreDuplicates: true });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('NotificacionTipo', {
            codigo: ['gasto_creado', 'gasto_aprobado', 'gasto_rechazado', 'gasto_reintegrado']
        });
    }
};
