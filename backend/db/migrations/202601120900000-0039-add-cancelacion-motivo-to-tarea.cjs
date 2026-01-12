'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Tarea', 'cancelacion_motivo', {
            type: Sequelize.TEXT,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Tarea', 'cancelacion_motivo');
    }
};