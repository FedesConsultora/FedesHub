'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Ausencia', 'archivo_url', {
            type: Sequelize.TEXT,
            allowNull: true
        });
        await queryInterface.addColumn('AusenciaAsignacionSolicitud', 'archivo_url', {
            type: Sequelize.TEXT,
            allowNull: true
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Ausencia', 'archivo_url');
        await queryInterface.removeColumn('AusenciaAsignacionSolicitud', 'archivo_url');
    }
};
