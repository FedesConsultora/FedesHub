'use strict';

module.exports = {
    async up(qi) {
        const now = new Date();

        // 1. Asegurar Modulo comercial y Acciones necesarias
        let [[mod]] = await qi.sequelize.query(`SELECT id FROM "Modulo" WHERE codigo='comercial' LIMIT 1`);
        if (!mod) {
            await qi.bulkInsert('Modulo', [{ codigo: 'comercial', nombre: 'Comercial', created_at: now, updated_at: now }]);
            [[mod]] = await qi.sequelize.query(`SELECT id FROM "Modulo" WHERE codigo='comercial' LIMIT 1`);
        }

        const actions = ['read', 'create', 'update', 'delete', 'manage'];
        const actIds = {};
        for (const actCode of actions) {
            let [[act]] = await qi.sequelize.query(`SELECT id FROM "Accion" WHERE codigo=:actCode LIMIT 1`, { replacements: { actCode } });
            if (!act) {
                await qi.bulkInsert('Accion', [{ codigo: actCode, nombre: actCode.charAt(0).toUpperCase() + actCode.slice(1), created_at: now, updated_at: now }]);
                [[act]] = await qi.sequelize.query(`SELECT id FROM "Accion" WHERE codigo=:actCode LIMIT 1`, { replacements: { actCode } });
            }
            actIds[actCode] = act.id;
        }

        // 2. Asegurar Permisos (comercial.read, comercial.create, etc.)
        const permIds = {};
        for (const actCode of actions) {
            let [[perm]] = await qi.sequelize.query(`SELECT id FROM "Permiso" WHERE modulo_id=:mid AND accion_id=:aid LIMIT 1`, {
                replacements: { mid: mod.id, aid: actIds[actCode] }
            });
            if (!perm) {
                await qi.bulkInsert('Permiso', [{
                    modulo_id: mod.id,
                    accion_id: actIds[actCode],
                    nombre: `comercial.${actCode}`,
                    descripcion: `Acceso comercial: ${actCode}`,
                    created_at: now, updated_at: now
                }]);
                [[perm]] = await qi.sequelize.query(`SELECT id FROM "Permiso" WHERE modulo_id=:mid AND accion_id=:aid LIMIT 1`, {
                    replacements: { mid: mod.id, aid: actIds[actCode] }
                });
            }
            permIds[actCode] = perm.id;
        }

        // 3. Crear Rol Comercial
        let [[rtSystem]] = await qi.sequelize.query(`SELECT id FROM "RolTipo" WHERE codigo='system' LIMIT 1`);
        if (!rtSystem) {
            [[rtSystem]] = await qi.sequelize.query(`SELECT id FROM "RolTipo" LIMIT 1`);
        }

        let [[rolComercial]] = await qi.sequelize.query(`SELECT id FROM "Rol" WHERE nombre='Comercial' LIMIT 1`);
        if (!rolComercial) {
            await qi.bulkInsert('Rol', [{
                nombre: 'Comercial',
                descripcion: 'Gestión Comercial y Leads',
                rol_tipo_id: rtSystem.id,
                created_at: now, updated_at: now
            }]);
            [[rolComercial]] = await qi.sequelize.query(`SELECT id FROM "Rol" WHERE nombre='Comercial' LIMIT 1`);
        }

        // 4. Asignar permisos al Rol Comercial
        const rpComercial = Object.values(permIds).map(pid => ({
            rol_id: rolComercial.id,
            permiso_id: pid,
            created_at: now
        }));
        await qi.bulkInsert('RolPermiso', rpComercial, { ignoreDuplicates: true });

        // 5. Asignar permisos a NivelA (Administrador), NivelB (Líder) y RRHH
        const adminRoles = ['NivelA', 'NivelB', 'RRHH'];
        for (const roleName of adminRoles) {
            let [[rol]] = await qi.sequelize.query(`SELECT id FROM "Rol" WHERE nombre=:roleName LIMIT 1`, { replacements: { roleName } });
            if (rol) {
                const rp = Object.values(permIds).map(pid => ({
                    rol_id: rol.id,
                    permiso_id: pid,
                    created_at: now
                }));
                await qi.bulkInsert('RolPermiso', rp, { ignoreDuplicates: true });
            }
        }
    },

    async down(qi) {
        // No destructivo
    }
};
