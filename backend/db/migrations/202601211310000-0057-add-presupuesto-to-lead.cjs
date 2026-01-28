'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('ComercialLead', 'presupuesto_ars', {
            type: Sequelize.DECIMAL(15, 2),
            allowNull: true
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('ComercialLead', 'presupuesto_ars');
    }
};
