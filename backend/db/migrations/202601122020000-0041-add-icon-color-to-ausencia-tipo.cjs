'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const t = await queryInterface.sequelize.transaction();

        try {
            // 1. Añadir columnas icon y color if they don't exist
            // Nota: Sequelize no tiene un "addColumnIfNotExists", así que usamos SQL crudo o verificamos antes.
            const tableInfo = await queryInterface.describeTable('AusenciaTipo');

            if (!tableInfo.icon) {
                await queryInterface.addColumn('AusenciaTipo', 'icon', {
                    type: Sequelize.STRING(50),
                    allowNull: true
                }, { transaction: t });
            }

            if (!tableInfo.color) {
                await queryInterface.addColumn('AusenciaTipo', 'color', {
                    type: Sequelize.STRING(20),
                    allowNull: true
                }, { transaction: t });
            }

            // 2. Actualizar tipos existentes con valores por defecto
            const updates = [
                { codigo: 'vacaciones', icon: 'FiSun', color: '#ff9f43' },
                { codigo: 'tristeza', icon: 'FiCloudRain', color: '#54a0ff' },
                { codigo: 'examen', icon: 'FiBookOpen', color: '#1dd1a1' },
                { codigo: 'personal', icon: 'FiUser', color: '#feca57' },
                { codigo: 'no_pagado', icon: 'FiXCircle', color: '#ee5253' },
            ];

            for (const u of updates) {
                await queryInterface.sequelize.query(
                    `UPDATE "AusenciaTipo" SET icon = :icon, color = :color WHERE codigo = :codigo`,
                    { replacements: u, type: Sequelize.QueryTypes.UPDATE, transaction: t }
                );
            }

            // 3. Insertar tipo "Cumpleaños" si no existe
            const [existing] = await queryInterface.sequelize.query(
                `SELECT id FROM "AusenciaTipo" WHERE codigo = 'cumpleaños'`,
                { type: Sequelize.QueryTypes.SELECT, transaction: t }
            );

            if (!existing) {
                const [unit] = await queryInterface.sequelize.query(
                    `SELECT id FROM "AusenciaUnidadTipo" WHERE codigo = 'dia' LIMIT 1`,
                    { type: Sequelize.QueryTypes.SELECT, transaction: t }
                );
                if (unit) {
                    await queryInterface.bulkInsert('AusenciaTipo', [{
                        codigo: 'cumpleaños',
                        nombre: 'Cumpleaños',
                        descripcion: 'Día de descanso por cumpleaños',
                        unidad_id: unit.id,
                        requiere_asignacion: false,
                        icon: 'FiGift',
                        color: '#ff9fcf',
                        created_at: new Date(),
                        updated_at: new Date()
                    }], { transaction: t });
                }
            } else {
                await queryInterface.sequelize.query(
                    `UPDATE "AusenciaTipo" SET icon = 'FiGift', color = '#ff9fcf' WHERE codigo = 'cumpleaños'`,
                    { type: Sequelize.QueryTypes.UPDATE, transaction: t }
                );
            }

            await t.commit();
            console.log('✓ Columnas icon/color añadidas y tipos de ausencia actualizados');
        } catch (error) {
            await t.rollback();
            console.error('Error en migración de tipos de ausencia:', error);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const t = await queryInterface.sequelize.transaction();
        try {
            // Revertir cambios si es necesario (eliminar columnas y el tipo nuevo)
            await queryInterface.removeColumn('AusenciaTipo', 'icon', { transaction: t });
            await queryInterface.removeColumn('AusenciaTipo', 'color', { transaction: t });
            await queryInterface.bulkDelete('AusenciaTipo', { codigo: 'cumpleaños' }, { transaction: t });

            await t.commit();
            console.log('✓ Columnas icon/color eliminadas');
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
};
