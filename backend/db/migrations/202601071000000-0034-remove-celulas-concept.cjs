'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Remove columns and their associated indices if any
        const tablesWithCelulaId = ['Feder', 'Cliente', 'CalendarioLocal', 'ChatCanal', 'ChatMensajeRef'];
        for (const table of tablesWithCelulaId) {
            const description = await queryInterface.describeTable(table);
            if (description.celula_id) {
                await queryInterface.removeColumn(table, 'celula_id');
            }
        }

        // 2. Drop Célula-related tables (reverse order of dependencies)
        const tablesToDrop = ['CelulaRolAsignacion', 'Celula', 'CelulaRolTipo', 'CelulaEstado'];
        for (const table of tablesToDrop) {
            try {
                await queryInterface.dropTable(table);
            } catch (e) {
                // If table doesn't exist or already dropped, ignore
            }
        }
    },

    async down(queryInterface, Sequelize) {
        // Recreate tables (reverse order) using raw SQL to be more direct
        const tables = ['CelulaEstado', 'CelulaRolTipo', 'Celula', 'CelulaRolAsignacion'];
        for (const t of tables) {
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "${t}" (
                    id SERIAL PRIMARY KEY,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            `).catch(() => { });
        }

        // Restore columns
        const tablesWithCelulaId = ['Feder', 'Cliente', 'CalendarioLocal', 'ChatCanal', 'ChatMensajeRef'];
        for (const table of tablesWithCelulaId) {
            try {
                const description = await queryInterface.describeTable(table);
                if (!description.celula_id) {
                    await queryInterface.addColumn(table, 'celula_id', { type: Sequelize.INTEGER, allowNull: true });
                }
            } catch (e) {
                // Table might not exist yet in undo chain
            }
        }
    }
};
