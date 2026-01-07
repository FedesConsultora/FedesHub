'use strict';

/**
 * Migración para actualizar el dominio de email de @fedes.ai a @fedesconsultora.com
 * Robustecida para evitar errores de duplicados y FK durante el rollback.
 */
module.exports = {
    async up(qi) {
        const t = await qi.sequelize.transaction();
        try {
            // 1. Actualizar correos de usuarios
            await qi.sequelize.query(`
        UPDATE "User"
        SET email = REPLACE(email, '@fedes.ai', '@fedesconsultora.com')
        WHERE email LIKE '%@fedes.ai'
      `, { transaction: t });

            // 2. Gestionar dominios
            const [fedesAi] = await qi.sequelize.query(`SELECT id FROM "AuthEmailDominio" WHERE dominio = 'fedes.ai' LIMIT 1`, { transaction: t, type: qi.sequelize.QueryTypes.SELECT });
            const [fedesConsultora] = await qi.sequelize.query(`SELECT id FROM "AuthEmailDominio" WHERE dominio = 'fedesconsultora.com' LIMIT 1`, { transaction: t, type: qi.sequelize.QueryTypes.SELECT });

            if (fedesAi && fedesConsultora) {
                // Colisión: Ambos existen. Transferimos usuarios al de fedesconsultora y borramos el de fedes.ai
                await qi.sequelize.query(`UPDATE "User" SET email_dominio_id = :fedesConsultoraId WHERE email_dominio_id = :fedesAiId`, {
                    transaction: t, replacements: { fedesAiId: fedesAi.id, fedesConsultoraId: fedesConsultora.id }
                });
                await qi.sequelize.query(`DELETE FROM "AuthEmailDominio" WHERE id = :fedesAiId`, {
                    transaction: t, replacements: { fedesAiId: fedesAi.id }
                });
            } else if (fedesAi) {
                // Caso normal: Renombrar fedes.ai a fedesconsultora.com
                await qi.sequelize.query(`UPDATE "AuthEmailDominio" SET dominio = 'fedesconsultora.com' WHERE id = :id`, {
                    transaction: t, replacements: { id: fedesAi.id }
                });
            }

            await t.commit();
        } catch (e) {
            await t.rollback();
            throw e;
        }
    },

    async down(qi) {
        const t = await qi.sequelize.transaction();
        try {
            // Revertir correos
            await qi.sequelize.query(`
        UPDATE "User"
        SET email = REPLACE(email, '@fedesconsultora.com', '@fedes.ai')
        WHERE email LIKE '%@fedesconsultora.com'
      `, { transaction: t });

            // Gestionar dominios
            const [fedesAi] = await qi.sequelize.query(`SELECT id FROM "AuthEmailDominio" WHERE dominio = 'fedes.ai' LIMIT 1`, { transaction: t, type: qi.sequelize.QueryTypes.SELECT });
            const [fedesConsultora] = await qi.sequelize.query(`SELECT id FROM "AuthEmailDominio" WHERE dominio = 'fedesconsultora.com' LIMIT 1`, { transaction: t, type: qi.sequelize.QueryTypes.SELECT });

            if (fedesAi && fedesConsultora) {
                // Transferir usuarios de vuelta a fedes.ai y borrar el de fedesconsultora
                await qi.sequelize.query(`UPDATE "User" SET email_dominio_id = :fedesAiId WHERE email_dominio_id = :fedesConsultoraId`, {
                    transaction: t, replacements: { fedesAiId: fedesAi.id, fedesConsultoraId: fedesConsultora.id }
                });
                await qi.sequelize.query(`DELETE FROM "AuthEmailDominio" WHERE id = :fedesConsultoraId`, {
                    transaction: t, replacements: { fedesConsultoraId: fedesConsultora.id }
                });
            } else if (fedesConsultora) {
                // Renombrar de vuelta
                await qi.sequelize.query(`UPDATE "AuthEmailDominio" SET dominio = 'fedes.ai' WHERE id = :id`, {
                    transaction: t, replacements: { id: fedesConsultora.id }
                });
            }

            await t.commit();
        } catch (e) {
            await t.rollback();
            throw e;
        }
    }
};
