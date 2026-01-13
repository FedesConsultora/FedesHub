'use strict';

module.exports = {
    async up(qi) {
        const now = new Date();

        // 1. Asegurar Modulo rrhh y Accion manage
        let [[mod]] = await qi.sequelize.query(`SELECT id FROM "Modulo" WHERE codigo='rrhh' LIMIT 1`);
        if (!mod) {
            await qi.bulkInsert('Modulo', [{ codigo: 'rrhh', nombre: 'RRHH', created_at: now, updated_at: now }]);
            [[mod]] = await qi.sequelize.query(`SELECT id FROM "Modulo" WHERE codigo='rrhh' LIMIT 1`);
        }

        let [[act]] = await qi.sequelize.query(`SELECT id FROM "Accion" WHERE codigo='manage' LIMIT 1`);
        if (!act) {
            await qi.bulkInsert('Accion', [{ codigo: 'manage', nombre: 'Gestionar', created_at: now, updated_at: now }]);
            [[act]] = await qi.sequelize.query(`SELECT id FROM "Accion" WHERE codigo='manage' LIMIT 1`);
        }

        // 2. Asegurar Permiso rrhh.manage
        let [[perm]] = await qi.sequelize.query(`SELECT id FROM "Permiso" WHERE modulo_id=:mid AND accion_id=:aid LIMIT 1`, {
            replacements: { mid: mod.id, aid: act.id }
        });
        if (!perm) {
            await qi.bulkInsert('Permiso', [{
                modulo_id: mod.id,
                accion_id: act.id,
                nombre: 'rrhh.manage',
                descripcion: 'Administrar RRHH (Ausencias)',
                created_at: now, updated_at: now
            }]);
            [[perm]] = await qi.sequelize.query(`SELECT id FROM "Permiso" WHERE modulo_id=:mid AND accion_id=:aid LIMIT 1`, {
                replacements: { mid: mod.id, aid: act.id }
            });
        }

        // 3. Crear Rol RRHH (tipo custom para que puedan editarlo si quieren)
        let [[rtCustom]] = await qi.sequelize.query(`SELECT id FROM "RolTipo" WHERE codigo='custom' LIMIT 1`);
        if (!rtCustom) {
            // Fallback a system si no existe custom por alguna razón
            [[rtCustom]] = await qi.sequelize.query(`SELECT id FROM "RolTipo" WHERE codigo='system' LIMIT 1`);
        }

        let [[rolRRHH]] = await qi.sequelize.query(`SELECT id FROM "Rol" WHERE nombre='RRHH' LIMIT 1`);
        if (!rolRRHH) {
            await qi.bulkInsert('Rol', [{
                nombre: 'RRHH',
                descripcion: 'Gestión de Recursos Humanos',
                rol_tipo_id: rtCustom.id,
                created_at: now, updated_at: now
            }]);
            [[rolRRHH]] = await qi.sequelize.query(`SELECT id FROM "Rol" WHERE nombre='RRHH' LIMIT 1`);
        }

        // 4. Copiar permisos de NivelB a RRHH + rrhh.manage
        const [[rolB]] = await qi.sequelize.query(`SELECT id FROM "Rol" WHERE nombre='NivelB' LIMIT 1`);
        if (rolB) {
            const [permsB] = await qi.sequelize.query(`SELECT permiso_id FROM "RolPermiso" WHERE rol_id=:rid`, {
                replacements: { rid: rolB.id }
            });

            const rpToInsert = permsB.map(p => ({
                rol_id: rolRRHH.id,
                permiso_id: p.permiso_id,
                created_at: now
            }));

            // Agregar el de rrhh.manage
            if (!rpToInsert.some(x => x.permiso_id === perm.id)) {
                rpToInsert.push({ rol_id: rolRRHH.id, permiso_id: perm.id, created_at: now });
            }

            await qi.bulkInsert('RolPermiso', rpToInsert, { ignoreDuplicates: true });
        }

        // 5. Actualizar mails de Florencia y Romina
        // Buscamos por nombre/apellido para ser precisos
        const [feders] = await qi.sequelize.query(`
      SELECT f.id, f.user_id, f.nombre, f.apellido 
      FROM "Feder" f
      WHERE (LOWER(f.nombre)='florencia' AND LOWER(f.apellido)='marchesotti')
         OR (LOWER(f.nombre)='romina' AND LOWER(f.apellido)='albanesi')
    `);

        for (const f of feders) {
            const newEmail = f.nombre.toLowerCase() === 'florencia'
                ? 'florencia@fedesconsultora.com'
                : 'romina@fedesconsultora.com';

            // Buscar si ya existe otro usuario con ese email
            const [otherUserRows] = await qi.sequelize.query(`SELECT id FROM "User" WHERE email=:e LIMIT 1`, {
                replacements: { e: newEmail }
            });
            const otherUser = otherUserRows[0];

            if (otherUser && otherUser.id !== f.user_id) {
                // Si existe otro usuario con este email, vinculamos el Feder a ESE usuario
                // Y nos aseguramos de que no queden feders huérfanos o duplicados si es necesario, 
                // pero por ahora solo vinculamos el user_id correcto.
                await qi.sequelize.query(`UPDATE "Feder" SET user_id=:uid, updated_at=:now WHERE id=:fid`, {
                    replacements: { uid: otherUser.id, now, fid: f.id }
                });

                // También le asignamos el rol al usuario que ya existe
                await qi.bulkInsert('UserRol', [{
                    user_id: otherUser.id,
                    rol_id: rolRRHH.id,
                    created_at: now
                }], { ignoreDuplicates: true });
            } else {
                // Si no existe o es el mismo, actualizamos el mail del user_id actual
                await qi.sequelize.query(`UPDATE "User" SET email=:e, updated_at=:now WHERE id=:uid`, {
                    replacements: { e: newEmail, now, uid: f.user_id }
                });

                // Asignar el nuevo rol RRHH
                await qi.bulkInsert('UserRol', [{
                    user_id: f.user_id,
                    rol_id: rolRRHH.id,
                    created_at: now
                }], { ignoreDuplicates: true });
            }
        }
    },

    async down(qi) {
        // No solemos deshacer cambios de emails o roles de sistema tan agresivamente
    }
};
