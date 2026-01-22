'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // 1. Asegurar que el modulo 'comercial' existe
        const [modulos] = await queryInterface.sequelize.query(
            "SELECT id FROM \"Modulo\" WHERE codigo = 'comercial'"
        );
        let moduloId;
        if (modulos.length === 0) {
            const [newMod] = await queryInterface.sequelize.query(
                `INSERT INTO "Modulo" (codigo, nombre, descripcion, created_at, updated_at) 
                 VALUES ('comercial', 'Comercial', 'Módulo de ventas y leads', NOW(), NOW()) 
                 RETURNING id`
            );
            moduloId = newMod[0].id;
        } else {
            moduloId = modulos[0].id;
        }

        // 2. Asegurar que las acciones existen
        const acciones = ['read', 'create', 'update', 'delete', 'admin', 'import'];
        const accionIds = {};
        for (const code of acciones) {
            const [accs] = await queryInterface.sequelize.query(
                `SELECT id FROM "Accion" WHERE codigo = '${code}'`
            );
            if (accs.length === 0) {
                const [newAcc] = await queryInterface.sequelize.query(
                    `INSERT INTO "Accion" (codigo, nombre, created_at, updated_at) 
                     VALUES ('${code}', '${code.charAt(0).toUpperCase() + code.slice(1)}', NOW(), NOW()) 
                     RETURNING id`
                );
                accionIds[code] = newAcc[0].id;
            } else {
                accionIds[code] = accs[0].id;
            }
        }

        // 3. Crear permisos
        for (const code of acciones) {
            const [perms] = await queryInterface.sequelize.query(
                `SELECT id FROM "Permiso" WHERE modulo_id = ${moduloId} AND accion_id = ${accionIds[code]}`
            );
            if (perms.length === 0) {
                await queryInterface.sequelize.query(
                    `INSERT INTO "Permiso" (modulo_id, accion_id, nombre, created_at, updated_at) 
                     VALUES (${moduloId}, ${accionIds[code]}, 'comercial:${code}', NOW(), NOW())`
                );
            }
        }

        // 4. Asignar todos los permisos de comercial a roles administrativos (NivelA, Admin, etc.)
        const [roles] = await queryInterface.sequelize.query(
            "SELECT id FROM \"Rol\" WHERE nombre IN ('NivelA', 'Admin', 'Sistemas')"
        );

        for (const rol of roles) {
            const [permsOfMod] = await queryInterface.sequelize.query(
                `SELECT id FROM "Permiso" WHERE modulo_id = ${moduloId}`
            );
            for (const p of permsOfMod) {
                const [exists] = await queryInterface.sequelize.query(
                    `SELECT id FROM "RolPermiso" WHERE rol_id = ${rol.id} AND permiso_id = ${p.id}`
                );
                if (exists.length === 0) {
                    await queryInterface.sequelize.query(
                        `INSERT INTO "RolPermiso" (rol_id, permiso_id, created_at) 
                         VALUES (${rol.id}, ${p.id}, NOW())`
                    );
                }
            }
        }
    },

    async down(queryInterface, Sequelize) {
        // No destructivo por seguridad
    }
};
