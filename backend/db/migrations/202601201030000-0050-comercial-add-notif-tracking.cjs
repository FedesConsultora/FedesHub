'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('ComercialLead', 'notif_7d_sent_at', { type: Sequelize.DATE });
        await queryInterface.addColumn('ComercialLead', 'notif_3d_sent_at', { type: Sequelize.DATE });
        await queryInterface.addColumn('ComercialLead', 'notif_expired_sent_at', { type: Sequelize.DATE });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('ComercialLead', 'notif_expired_sent_at');
        await queryInterface.removeColumn('ComercialLead', 'notif_3d_sent_at');
        await queryInterface.removeColumn('ComercialLead', 'notif_7d_sent_at');
    }
};
