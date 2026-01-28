'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Consultar si ya existen para no duplicar
        const [existing] = await queryInterface.sequelize.query(
            'SELECT id FROM "ComercialEECC" LIMIT 1'
        );

        if (existing.length === 0) {
            await queryInterface.bulkInsert('ComercialEECC', [
                {
                    nombre: 'EECC N° 1',
                    start_at: '2024-07-01',
                    end_at: '2025-06-30',
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    nombre: 'EECC N° 2',
                    start_at: '2025-07-01',
                    end_at: '2026-06-30',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]);
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('ComercialEECC', null, {});
    }
};
