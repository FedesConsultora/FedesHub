'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();
        await queryInterface.bulkInsert('ComercialLeadMotivoPerdida', [
            {
                codigo: 'otro',
                nombre: 'Otro / Error de entrada',
                created_at: now,
                updated_at: now
            }
        ], {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('ComercialLeadMotivoPerdida', { codigo: 'otro' }, {});
    }
};
