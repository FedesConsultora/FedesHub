/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Cliente', 'color', {
            type: Sequelize.STRING(7),
            allowNull: true,
            defaultValue: null,
            comment: 'Color hexadecimal para personalización visual (ej: #FF5733)'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Cliente', 'color');
    }
};
