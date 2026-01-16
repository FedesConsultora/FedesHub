'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [buzonGeneral] = await queryInterface.sequelize.query(
      "SELECT id FROM \"BuzonTipo\" WHERE codigo = 'tareas' LIMIT 1"
    );
    const buzonId = buzonGeneral[0]?.id || 1;

    await queryInterface.bulkInsert('NotificacionTipo', [{
      codigo: 'comercial_onboarding',
      nombre: 'Alerta de Onboarding',
      descripcion: 'Notificaciones sobre vencimientos de onboarding comercial',
      canales_default_json: JSON.stringify(['in_app', 'email']),
      buzon_id: buzonId,
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('NotificacionTipo', {
      codigo: 'comercial_onboarding'
    });
  }
};
