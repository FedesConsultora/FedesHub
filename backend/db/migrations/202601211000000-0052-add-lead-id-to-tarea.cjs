'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Add lead_id to Tarea
        await queryInterface.addColumn('Tarea', 'lead_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'ComercialLead',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        // 2. Make cliente_id nullable in Tarea
        await queryInterface.changeColumn('Tarea', 'cliente_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        // 1. Make cliente_id non-nullable again (caution: this might fail if there are nulls)
        await queryInterface.changeColumn('Tarea', 'cliente_id', {
            type: Sequelize.INTEGER,
            allowNull: false
        });

        // 2. Remove lead_id from Tarea
        await queryInterface.removeColumn('Tarea', 'lead_id');
    }
};
