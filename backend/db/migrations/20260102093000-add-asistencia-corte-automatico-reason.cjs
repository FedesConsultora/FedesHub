'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // Insert if not exists
        const [existing] = await queryInterface.sequelize.query(
            `SELECT id FROM "AsistenciaCierreMotivoTipo" WHERE codigo = 'corte_automatico'`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (!existing) {
            await queryInterface.bulkInsert('AsistenciaCierreMotivoTipo', [{
                codigo: 'corte_automatico',
                nombre: 'Corte Automático',
                descripcion: 'Cerrado automáticamente por el sistema al finalizar la jornada (olvido de pausa)',
                created_at: now,
                updated_at: now
            }]);
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('AsistenciaCierreMotivoTipo', { codigo: 'corte_automatico' });
    }
};
