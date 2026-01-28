'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('ComercialLeadEtapa', 'color', {
            type: Sequelize.STRING(20),
            allowNull: true
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('ComercialLeadEtapa', 'color');
    }
};
