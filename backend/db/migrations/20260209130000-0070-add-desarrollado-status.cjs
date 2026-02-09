'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();
        await queryInterface.bulkInsert('TareaEstado', [
            {
                codigo: 'desarrollado',
                nombre: 'Desarrollado',
                descripcion: 'La funcionalidad ha sido desarrollada y está lista para revisión o despliegue.',
                created_at: now,
                updated_at: now
            }
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('TareaEstado', { codigo: 'desarrollado' });
    }
};
