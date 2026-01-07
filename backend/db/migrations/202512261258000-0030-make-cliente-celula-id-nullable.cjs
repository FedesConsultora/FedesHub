/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('Cliente', 'celula_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });
    },

    async down(queryInterface, Sequelize) {
        try {
            const table = await queryInterface.describeTable('Cliente');
            if (table.celula_id) {
                // We keep it nullable during undo to avoid errors with existing null data
                // as this column will be dropped later in the rollback chain anyway.
                await queryInterface.changeColumn('Cliente', 'celula_id', {
                    type: Sequelize.INTEGER,
                    allowNull: true
                });
            }
        } catch (e) {
            // Ignore errors
        }
    }
};
