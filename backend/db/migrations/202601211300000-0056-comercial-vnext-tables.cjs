'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. ComercialEECC (Fiscal Periods)
        await queryInterface.createTable('ComercialEECC', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nombre: { type: Sequelize.STRING(50), allowNull: false },
            start_at: { type: Sequelize.DATE, allowNull: false },
            end_at: { type: Sequelize.DATE, allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 2. ComercialProducto (Plans and Onboarding types)
        await queryInterface.createTable('ComercialProducto', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nombre: { type: Sequelize.STRING(100), allowNull: false },
            tipo: { type: Sequelize.ENUM('plan', 'onboarding'), allowNull: false },
            precio_actual: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
            es_onboarding_objetivo: { type: Sequelize.BOOLEAN, defaultValue: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 3. ComercialDescuento (Types of discounts)
        await queryInterface.createTable('ComercialDescuento', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nombre: { type: Sequelize.STRING(100), allowNull: false },
            tipo: { type: Sequelize.ENUM('percentage', 'fixed'), allowNull: false },
            valor: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 4. ComercialDescuentoCap (Limits per Q)
        await queryInterface.createTable('ComercialDescuentoCap', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            eecc_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialEECC', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            q: { type: Sequelize.INTEGER, allowNull: false },
            monto_maximo_ars: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 5. ComercialVenta (Main sale record)
        await queryInterface.createTable('ComercialVenta', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            lead_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialLead', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            eecc_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialEECC', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            q: { type: Sequelize.INTEGER, allowNull: false },
            mes_fiscal: { type: Sequelize.INTEGER, allowNull: false },
            fecha_venta: { type: Sequelize.DATE, allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 6. ComercialVentaLinea (Individual products in a sale)
        await queryInterface.createTable('ComercialVentaLinea', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            venta_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialVenta', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            producto_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialProducto', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            producto_nombre_snapshot: { type: Sequelize.STRING(100), allowNull: false },
            precio_bruto_snapshot: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
            bonificado_ars: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
            precio_neto_snapshot: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 7. ComercialObjetivoQ (Quotation goals)
        await queryInterface.createTable('ComercialObjetivoQ', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            eecc_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialEECC', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            q: { type: Sequelize.INTEGER, allowNull: false },
            monto_presupuestacion_ars: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 8. ComercialObjetivoMes (Billing goals)
        await queryInterface.createTable('ComercialObjetivoMes', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            eecc_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ComercialEECC', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            mes_calendario: { type: Sequelize.INTEGER, allowNull: false },
            qty_onb_mercado: { type: Sequelize.INTEGER, defaultValue: 0 },
            qty_plan_prom: { type: Sequelize.INTEGER, defaultValue: 0 },
            precio_onb_mercado_snapshot: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
            precio_plan_prom_snapshot: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
            total_objetivo_ars: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // Add Indexes
        await queryInterface.addIndex('ComercialDescuentoCap', ['eecc_id', 'q']);
        await queryInterface.addIndex('ComercialVenta', ['lead_id']);
        await queryInterface.addIndex('ComercialVenta', ['eecc_id', 'q', 'mes_fiscal']);
        await queryInterface.addIndex('ComercialObjetivoQ', ['eecc_id', 'q']);
        await queryInterface.addIndex('ComercialObjetivoMes', ['eecc_id', 'mes_calendario']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('ComercialObjetivoMes');
        await queryInterface.dropTable('ComercialObjetivoQ');
        await queryInterface.dropTable('ComercialVentaLinea');
        await queryInterface.dropTable('ComercialVenta');
        await queryInterface.dropTable('ComercialDescuentoCap');
        await queryInterface.dropTable('ComercialDescuento');
        await queryInterface.dropTable('ComercialProducto');
        await queryInterface.dropTable('ComercialEECC');
    }
};
