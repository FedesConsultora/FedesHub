'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const stages = [
            { codigo: 'contacto', color: '#94a3b8' },
            { codigo: 'reunion', color: '#6366f1' },
            { codigo: 'presupuesto', color: '#f59e0b' },
            { codigo: 'negociacion', color: '#3b82f6' },
            { codigo: 'cierre', color: '#10b981' }
        ];

        for (const s of stages) {
            await queryInterface.sequelize.query(
                `UPDATE "ComercialLeadEtapa" SET color = '${s.color}' WHERE codigo = '${s.codigo}'`
            );
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`UPDATE "ComercialLeadEtapa" SET color = NULL`);
    }
};
