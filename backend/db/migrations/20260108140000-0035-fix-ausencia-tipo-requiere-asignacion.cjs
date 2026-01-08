'use strict';

/**
 * Migration to set requiere_asignacion to false for specific absence types
 * that normally shouldn't require a pre-assigned quota (cupo).
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      UPDATE "AusenciaTipo"
      SET requiere_asignacion = false
      WHERE codigo IN ('personal', 'no_pagado')
    `);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      UPDATE "AusenciaTipo"
      SET requiere_asignacion = true
      WHERE codigo IN ('personal', 'no_pagado')
    `);
    }
};
