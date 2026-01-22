'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('ComercialProducto', 'max_descuento_porc', {
            type: Sequelize.DECIMAL(5, 2),
            defaultValue: 0,
            allowNull: false
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('ComercialProducto', 'max_descuento_porc');
    }
};
