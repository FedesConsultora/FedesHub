'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('ComercialLeadAdjunto', 'nota_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'ComercialLeadNota', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        await queryInterface.addIndex('ComercialLeadAdjunto', ['nota_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('ComercialLeadAdjunto', 'nota_id');
    }
};
