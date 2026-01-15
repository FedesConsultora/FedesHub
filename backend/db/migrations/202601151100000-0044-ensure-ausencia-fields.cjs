'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Aseguramos que las columnas existan (aunque deberían estar, por si acaso)
        // Sequelize no da error si ya existen si usamos una lógica defensiva o simplemente las agregamos
        // En este caso, el usuario lo solicitó para seguir el estándar.
        const table = await queryInterface.describeTable('Ausencia');

        if (!table.motivo) {
            await queryInterface.addColumn('Ausencia', 'motivo', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }
        if (!table.comentario_admin) {
            await queryInterface.addColumn('Ausencia', 'comentario_admin', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }
    },

    async down(queryInterface, Sequelize) {
        // No solemos borrar columnas en el revert de fixes menores por seguridad de datos
    }
};
