'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Crear tabla UserStatusPersonalizado
        await queryInterface.createTable('UserStatusPersonalizado', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'User', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            emoji: {
                type: Sequelize.STRING(20),
                allowNull: false
            },
            texto: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // 2. Agregar campos a tabla Feder
        await queryInterface.addColumn('Feder', 'current_status_custom_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'UserStatusPersonalizado', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        await queryInterface.addColumn('Feder', 'status_emoji_override', {
            type: Sequelize.STRING(20),
            allowNull: true
        });

        await queryInterface.addColumn('Feder', 'status_text_override', {
            type: Sequelize.STRING(100),
            allowNull: true
        });

        // Indice para búsquedas rápidas por usuario
        await queryInterface.addIndex('UserStatusPersonalizado', ['user_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Feder', 'status_text_override');
        await queryInterface.removeColumn('Feder', 'status_emoji_override');
        await queryInterface.removeColumn('Feder', 'current_status_custom_id');
        await queryInterface.dropTable('UserStatusPersonalizado');
    }
};
