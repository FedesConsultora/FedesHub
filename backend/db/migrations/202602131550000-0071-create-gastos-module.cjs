'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = Sequelize.fn('now');
        const idPK = { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true };
        const tsCols = {
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
        };

        // ========== Tabla Gasto ==========
        await queryInterface.createTable('Gasto', {
            id: idPK,
            feder_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Feder', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            descripcion: { type: Sequelize.TEXT, allowNull: false },
            monto: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
            moneda: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'ARS' },
            fecha: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
            estado: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'pendiente' // pendiente, aprobado, rechazado, reintegrado
            },
            aprobado_por_user_id: {
                type: Sequelize.INTEGER,
                references: { model: 'User', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            aprobado_at: Sequelize.DATE,
            rechazado_por_user_id: {
                type: Sequelize.INTEGER,
                references: { model: 'User', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            rechazado_at: Sequelize.DATE,
            rechazo_motivo: Sequelize.TEXT,
            reintegrado_por_user_id: {
                type: Sequelize.INTEGER,
                references: { model: 'User', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            reintegrado_at: Sequelize.DATE,
            ...tsCols
        });

        // ========== Tabla GastoAdjunto ==========
        await queryInterface.createTable('GastoAdjunto', {
            id: idPK,
            gasto_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Gasto', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            nombre: { type: Sequelize.STRING(255) },
            mime_type: { type: Sequelize.STRING(120) },
            size: { type: Sequelize.BIGINT },
            url: { type: Sequelize.STRING(512) },
            drive_file_id: { type: Sequelize.STRING(255) },
            subido_por_feder_id: {
                type: Sequelize.INTEGER,
                references: { model: 'Feder', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'SET NULL'
            },
            ...tsCols
        });

        // ========== Tabla GastoHistorial ==========
        await queryInterface.createTable('GastoHistorial', {
            id: idPK,
            gasto_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Gasto', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'User', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            tipo_cambio: { type: Sequelize.STRING(50), allowNull: false },
            accion: { type: Sequelize.STRING(20), allowNull: false },
            valor_anterior: { type: Sequelize.JSONB },
            valor_nuevo: { type: Sequelize.JSONB },
            campo: { type: Sequelize.STRING(100) },
            descripcion: { type: Sequelize.TEXT },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
        });

        // ========== Índices ==========
        await queryInterface.addIndex('Gasto', ['feder_id']);
        await queryInterface.addIndex('Gasto', ['estado']);
        await queryInterface.addIndex('GastoAdjunto', ['gasto_id']);
        await queryInterface.addIndex('GastoHistorial', ['gasto_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('GastoHistorial');
        await queryInterface.dropTable('GastoAdjunto');
        await queryInterface.dropTable('Gasto');
    }
};
