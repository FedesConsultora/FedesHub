'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. ComercialLeadNota
        await queryInterface.createTable('ComercialLeadNota', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            lead_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialLead', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            autor_user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'User', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            contenido: { type: Sequelize.TEXT, allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 2. ComercialLeadAdjunto
        await queryInterface.createTable('ComercialLeadAdjunto', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            lead_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialLead', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            autor_user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'User', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            nombre_original: { type: Sequelize.STRING(255), allowNull: false },
            mimetype: { type: Sequelize.STRING(100) },
            size: { type: Sequelize.BIGINT },
            key: { type: Sequelize.STRING(255), allowNull: false },
            url: { type: Sequelize.STRING(512) },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 3. ComercialLeadHistorial
        await queryInterface.createTable('ComercialLeadHistorial', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            lead_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialLead', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'User', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            tipo_evento: { type: Sequelize.STRING(100), allowNull: false }, // ej: cambio_etapa, nota_agregada, onboarding_inicio
            descripcion: { type: Sequelize.TEXT },
            data_json: { type: Sequelize.JSONB },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addIndex('ComercialLeadNota', ['lead_id']);
        await queryInterface.addIndex('ComercialLeadAdjunto', ['lead_id']);
        await queryInterface.addIndex('ComercialLeadHistorial', ['lead_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('ComercialLeadHistorial');
        await queryInterface.dropTable('ComercialLeadAdjunto');
        await queryInterface.dropTable('ComercialLeadNota');
    }
};
