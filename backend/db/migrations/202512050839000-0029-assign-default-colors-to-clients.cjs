/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Assign default colors to existing clients that don't have a color
        // Using a palette of professional colors
        const colors = [
            '#3B82F6', // Blue
            '#10B981', // Green
            '#F59E0B', // Amber
            '#EF4444', // Red
            '#8B5CF6', // Purple
            '#EC4899', // Pink
            '#14B8A6', // Teal
            '#F97316', // Orange
        ];

        // Get all clients without a color
        const clients = await queryInterface.sequelize.query(
            'SELECT id FROM "Cliente" WHERE color IS NULL ORDER BY id',
            { type: Sequelize.QueryTypes.SELECT }
        );

        // Assign colors in a round-robin fashion
        for (let i = 0; i < clients.length; i++) {
            const color = colors[i % colors.length];
            await queryInterface.sequelize.query(
                'UPDATE "Cliente" SET color = :color WHERE id = :id',
                {
                    replacements: { color, id: clients[i].id },
                    type: Sequelize.QueryTypes.UPDATE
                }
            );
        }

        console.log(`Assigned colors to ${clients.length} clients`);
    },

    async down(queryInterface, Sequelize) {
        // Revert all colors to NULL
        await queryInterface.sequelize.query(
            'UPDATE "Cliente" SET color = NULL',
            { type: Sequelize.QueryTypes.UPDATE }
        );
    }
};
