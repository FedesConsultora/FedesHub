'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Agregar columna deleted_at
        await queryInterface.addColumn('Tarea', 'deleted_at', {
            type: Sequelize.DATE,
            allowNull: true
        });

        // 2. Agregar índice para optimizar consultas de soft-delete
        await queryInterface.addIndex('Tarea', ['deleted_at'], {
            name: 'tarea_deleted_at_idx'
        });
    },

    async down(queryInterface, Sequelize) {
        // 1. Quitar índice
        await queryInterface.removeIndex('Tarea', 'tarea_deleted_at_idx');

        // 2. Quitar columna
        await queryInterface.removeColumn('Tarea', 'deleted_at');
    }
};
