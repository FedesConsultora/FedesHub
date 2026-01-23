'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        await queryInterface.bulkInsert('ComercialLeadFuente', [
            { codigo: 'meta_ads', nombre: 'Meta Ads', created_at: now, updated_at: now },
            { codigo: 'google_ads', nombre: 'Google Ads', created_at: now, updated_at: now },
            { codigo: 'unaje', nombre: 'UNAJE', created_at: now, updated_at: now },
            { codigo: 'medios_tradicionales', nombre: 'Medios tradicionales', created_at: now, updated_at: now }
        ], {});
    },

    async down(queryInterface, Sequelize) {
        const { Op } = Sequelize;
        await queryInterface.bulkDelete('ComercialLeadFuente', {
            codigo: { [Op.in]: ['meta_ads', 'google_ads', 'unaje', 'medios_tradicionales'] }
        }, {});
    }
};
