'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. ComercialLeadStatus
        await queryInterface.createTable('ComercialLeadStatus', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            nombre: { type: Sequelize.STRING(100), allowNull: false },
            color: { type: Sequelize.STRING(20) },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 2. ComercialLeadEtapa
        await queryInterface.createTable('ComercialLeadEtapa', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            nombre: { type: Sequelize.STRING(100), allowNull: false },
            orden: { type: Sequelize.INTEGER, defaultValue: 0 },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 3. ComercialLeadFuente
        await queryInterface.createTable('ComercialLeadFuente', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            nombre: { type: Sequelize.STRING(100), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 4. ComercialLeadMotivoPerdida
        await queryInterface.createTable('ComercialLeadMotivoPerdida', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            nombre: { type: Sequelize.STRING(255), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 5. ComercialLead
        await queryInterface.createTable('ComercialLead', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nombre: { type: Sequelize.STRING(255), allowNull: false },
            apellido: { type: Sequelize.STRING(255) },
            empresa: { type: Sequelize.STRING(255) },
            alias: { type: Sequelize.STRING(255) },
            email: { type: Sequelize.STRING(255) },
            telefono: { type: Sequelize.STRING(100) },
            sitio_web: { type: Sequelize.STRING(255) },
            ubicacion: { type: Sequelize.TEXT },
            fuente_id: {
                type: Sequelize.INTEGER,
                references: { model: 'ComercialLeadFuente', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            responsable_feder_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Feder', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            status_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialLeadStatus', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            etapa_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialLeadEtapa', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            motivo_perdida_id: {
                type: Sequelize.INTEGER,
                references: { model: 'ComercialLeadMotivoPerdida', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            motivo_perdida_comentario: { type: Sequelize.TEXT },

            // Ruta post-negociación
            ruta_post_negociacion: {
                type: Sequelize.ENUM('alta_directa', 'onboarding', 'pendiente'),
                allowNull: true
            },

            // Onboarding
            onboarding_tipo: { type: Sequelize.STRING(100) },
            onboarding_start_at: { type: Sequelize.DATE },
            onboarding_due_at: { type: Sequelize.DATE },
            onboarding_status: {
                type: Sequelize.ENUM('activo', 'vencido', 'revision_pendiente', 'completado', 'cancelado'),
                defaultValue: null
            },

            // Link a cliente (cuando se convierte)
            cliente_id: {
                type: Sequelize.INTEGER,
                references: { model: 'Cliente', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },

            created_by_user_id: {
                type: Sequelize.INTEGER,
                references: { model: 'User', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            deleted_at: { type: Sequelize.DATE }
        });

        await queryInterface.addIndex('ComercialLead', ['responsable_feder_id']);
        await queryInterface.addIndex('ComercialLead', ['status_id']);
        await queryInterface.addIndex('ComercialLead', ['etapa_id']);
        await queryInterface.addIndex('ComercialLead', ['cliente_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('ComercialLead');
        await queryInterface.dropTable('ComercialLeadMotivoPerdida');
        await queryInterface.dropTable('ComercialLeadFuente');
        await queryInterface.dropTable('ComercialLeadEtapa');
        await queryInterface.dropTable('ComercialLeadStatus');
        // Drop the enum types if necessary (Sequelize might handle it depending on dialect, but better be safe)
        // For Postgres: await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ComercialLead_ruta_post_negociacion";');
    }
};
