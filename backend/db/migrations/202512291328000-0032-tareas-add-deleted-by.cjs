'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('Tarea');
        if (!tableInfo.deleted_by_feder_id) {
            await queryInterface.addColumn('Tarea', 'deleted_by_feder_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'Feder',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Tarea', 'deleted_by_feder_id');
    }
};
