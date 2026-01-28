'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('ComercialLead', 'eecc_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'ComercialEECC', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        await queryInterface.addIndex('ComercialLead', ['eecc_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('ComercialLead', 'eecc_id');
    }
};
