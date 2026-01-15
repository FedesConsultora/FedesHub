'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Feder', 'is_clevel', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Feder', 'is_clevel');
    }
};
