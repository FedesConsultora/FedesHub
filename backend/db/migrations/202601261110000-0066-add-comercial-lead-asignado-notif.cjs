'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const [buzones] = await queryInterface.sequelize.query(
            "SELECT id FROM \"BuzonTipo\" WHERE codigo = 'tareas' LIMIT 1"
        );
        const buzonId = buzones[0]?.id || 1;

        await queryInterface.bulkInsert('NotificacionTipo', [{
            codigo: 'comercial_lead_asignado',
            nombre: 'Lead asignado',
            descripcion: 'Se envía cuando se asigna un nuevo responsable a un lead',
            canales_default_json: JSON.stringify(['in_app', 'push', 'email']),
            buzon_id: buzonId,
            created_at: new Date(),
            updated_at: new Date()
        }]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('NotificacionTipo', {
            codigo: 'comercial_lead_asignado'
        });
    }
};
