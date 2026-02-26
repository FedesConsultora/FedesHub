'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // 1. Ensure 'gastos' module exists
        const [modulos] = await queryInterface.sequelize.query(
            `SELECT id FROM "Modulo" WHERE codigo = 'gastos' LIMIT 1`
        );
        let moduloId;
        if (modulos.length === 0) {
            await queryInterface.bulkInsert('Modulo', [{
                codigo: 'gastos',
                nombre: 'Gastos',
                descripcion: 'Módulo de rendición de gastos',
                created_at: now,
                updated_at: now
            }]);
            const [newModulos] = await queryInterface.sequelize.query(
                `SELECT id FROM "Modulo" WHERE codigo = 'gastos' LIMIT 1`
            );
            moduloId = newModulos[0].id;
        } else {
            moduloId = modulos[0].id;
        }

        // 2. Ensure 'manage' action exists
        const [acciones] = await queryInterface.sequelize.query(
            `SELECT id FROM "Accion" WHERE codigo = 'manage' LIMIT 1`
        );
        let accionId;
        if (acciones.length === 0) {
            await queryInterface.bulkInsert('Accion', [{
                codigo: 'manage',
                nombre: 'Manage',
                descripcion: 'Administrar',
                created_at: now,
                updated_at: now
            }]);
            const [newAcciones] = await queryInterface.sequelize.query(
                `SELECT id FROM "Accion" WHERE codigo = 'manage' LIMIT 1`
            );
            accionId = newAcciones[0].id;
        } else {
            accionId = acciones[0].id;
        }

        // 3. Ensure 'gastos.manage' permission exists
        const [permisos] = await queryInterface.sequelize.query(
            `SELECT id FROM "Permiso" WHERE modulo_id = :moduloId AND accion_id = :accionId LIMIT 1`,
            { replacements: { moduloId, accionId } }
        );
        let permisoId;
        if (permisos.length === 0) {
            await queryInterface.bulkInsert('Permiso', [{
                modulo_id: moduloId,
                accion_id: accionId,
                nombre: 'Administrar Gastos',
                descripcion: 'Permite aprobar, rechazar o reintegrar rendiciones de gastos',
                created_at: now,
                updated_at: now
            }]);
            const [newPermisos] = await queryInterface.sequelize.query(
                `SELECT id FROM "Permiso" WHERE modulo_id = :moduloId AND accion_id = :accionId LIMIT 1`,
                { replacements: { moduloId, accionId } }
            );
            permisoId = newPermisos[0].id;
        } else {
            permisoId = permisos[0].id;
        }

        // 4. Get 'system' RolTipo ID
        const [rolTipos] = await queryInterface.sequelize.query(
            `SELECT id FROM "RolTipo" WHERE codigo = 'system' LIMIT 1`
        );
        const systemRolTipoId = rolTipos[0]?.id;

        // 5. Ensure 'GastoManager' role exists
        const [roles] = await queryInterface.sequelize.query(
            `SELECT id FROM "Rol" WHERE nombre = 'GastoManager' LIMIT 1`
        );
        let rolId;
        if (roles.length === 0) {
            await queryInterface.bulkInsert('Rol', [{
                nombre: 'GastoManager',
                descripcion: 'Responsable de administrar y aprobar rendiciones de gastos',
                rol_tipo_id: systemRolTipoId,
                created_at: now,
                updated_at: now
            }]);
            const [newRoles] = await queryInterface.sequelize.query(
                `SELECT id FROM "Rol" WHERE nombre = 'GastoManager' LIMIT 1`
            );
            rolId = newRoles[0].id;
        } else {
            rolId = roles[0].id;
        }

        // 6. Assign 'gastos.manage' to 'GastoManager'
        await queryInterface.bulkInsert('RolPermiso', [{
            rol_id: rolId,
            permiso_id: permisoId,
            created_at: now
        }], { ignoreDuplicates: true });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(
            `DELETE FROM "RolPermiso" WHERE rol_id IN (SELECT id FROM "Rol" WHERE nombre = 'GastoManager')`
        );
        await queryInterface.sequelize.query(
            `DELETE FROM "Rol" WHERE nombre = 'GastoManager'`
        );
    }
};
