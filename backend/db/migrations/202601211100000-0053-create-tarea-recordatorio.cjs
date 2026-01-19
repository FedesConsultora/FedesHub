'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('TareaRecordatorio', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            tarea_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Tarea', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'User', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            fecha_recordatorio: {
                type: Sequelize.DATE,
                allowNull: false
            },
            enviado: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            tipo: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'hub' // 'hub', 'email', 'both'
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Indexes
        await queryInterface.addIndex('TareaRecordatorio', ['tarea_id']);
        await queryInterface.addIndex('TareaRecordatorio', ['user_id']);
        await queryInterface.addIndex('TareaRecordatorio', ['fecha_recordatorio', 'enviado']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('TareaRecordatorio');
    }
};
