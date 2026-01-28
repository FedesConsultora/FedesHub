'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        const products = [
            // PLANES
            {
                nombre: 'Plan PLATA',
                tipo: 'plan',
                precio_actual: 2500000,
                max_descuento_porc: 10,
                es_onboarding_objetivo: false,
                created_at: now,
                updated_at: now
            },
            {
                nombre: 'Plan ORO',
                tipo: 'plan',
                precio_actual: 4500000,
                max_descuento_porc: 15,
                es_onboarding_objetivo: false,
                created_at: now,
                updated_at: now
            },
            {
                nombre: 'Plan PLATINO',
                tipo: 'plan',
                precio_actual: 8500000,
                max_descuento_porc: 20,
                es_onboarding_objetivo: false,
                created_at: now,
                updated_at: now
            },
            // ONBOARDING
            {
                nombre: 'Onboarding Digital',
                tipo: 'onboarding',
                precio_actual: 3000000,
                es_onboarding_objetivo: true,
                max_descuento_porc: 0,
                created_at: now,
                updated_at: now
            },
            {
                nombre: 'Onboarding Identidad',
                tipo: 'onboarding',
                precio_actual: 4500000,
                es_onboarding_objetivo: true,
                max_descuento_porc: 0,
                created_at: now,
                updated_at: now
            },
            {
                nombre: 'Onboarding Mercado',
                tipo: 'onboarding',
                precio_actual: 9000000,
                es_onboarding_objetivo: true,
                max_descuento_porc: 0,
                created_at: now,
                updated_at: now
            }
        ];

        for (const p of products) {
            const [[exists]] = await queryInterface.sequelize.query(
                `SELECT id FROM "ComercialProducto" WHERE nombre = :nombre LIMIT 1`,
                { replacements: { nombre: p.nombre } }
            );

            if (!exists) {
                await queryInterface.bulkInsert('ComercialProducto', [p]);
            } else {
                await queryInterface.bulkUpdate('ComercialProducto',
                    {
                        precio_actual: p.precio_actual,
                        tipo: p.tipo,
                        max_descuento_porc: p.max_descuento_porc,
                        es_onboarding_objetivo: p.es_onboarding_objetivo,
                        updated_at: now
                    },
                    { id: exists.id }
                );
            }
        }
    },

    async down(queryInterface, Sequelize) {
        // No eliminamos para no romper historial de ventas
    }
};
