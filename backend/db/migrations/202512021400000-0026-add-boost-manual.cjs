'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Tarea', 'boost_manual', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Boost de prioridad aplicado manualmente por responsables (0 o 300)'
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Tarea', 'boost_manual');
    }
};
