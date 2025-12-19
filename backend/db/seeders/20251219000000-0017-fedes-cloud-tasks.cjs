'use strict';

module.exports = {
    async up(queryInterface) {
        const t = await queryInterface.sequelize.transaction();
        try {
            const now = new Date();

            // 1) Buscar Cliente "066 - Fedes Cloud"
            const [cliRows] = await queryInterface.sequelize.query(
                `SELECT c.id, COALESCE((SELECT ct.ponderacion FROM "ClienteTipo" ct WHERE ct.id=c.tipo_id), 3) as ponderacion 
         FROM "Cliente" c WHERE nombre = '066 - Fedes Cloud' LIMIT 1`,
                { transaction: t }
            );
            const cli = cliRows[0];
            if (!cli) {
                console.warn('Cliente "066 - Fedes Cloud" no encontrado.');
                await t.commit();
                return;
            }

            // 2) Buscar Feder "Enzo Pinotti" (Analista de Sistemas) para asignar tareas
            const [enzoRows] = await queryInterface.sequelize.query(
                `SELECT id FROM "Feder" WHERE nombre = 'Enzo' AND apellido = 'Pinotti' LIMIT 1`,
                { transaction: t }
            );
            const enzo = enzoRows[0];
            if (!enzo) {
                console.warn('Feder "Enzo Pinotti" no encontrado.');
                await t.commit();
                return;
            }

            // 3) Catálogos necesarios
            const [estRows] = await queryInterface.sequelize.query(`SELECT id FROM "TareaEstado" WHERE codigo='pendiente' LIMIT 1`, { transaction: t });
            const [impARows] = await queryInterface.sequelize.query(`SELECT id FROM "ImpactoTipo" WHERE codigo='alto' LIMIT 1`, { transaction: t });
            const [impMRows] = await queryInterface.sequelize.query(`SELECT id FROM "ImpactoTipo" WHERE codigo='medio' LIMIT 1`, { transaction: t });
            const [urg7Rows] = await queryInterface.sequelize.query(`SELECT id FROM "UrgenciaTipo" WHERE codigo='lt_7d' LIMIT 1`, { transaction: t });
            const [urg30Rows] = await queryInterface.sequelize.query(`SELECT id FROM "UrgenciaTipo" WHERE codigo='gte_7d' LIMIT 1`, { transaction: t });

            const estadoPend = estRows[0];
            const impactoAlto = impARows[0];
            const impactoMedio = impMRows[0];
            const urg7d = urg7Rows[0];
            const urg30d = urg30Rows[0];

            if (!estadoPend || !impactoAlto || !impactoMedio || !urg7d || !urg30d) {
                console.warn('Faltan catálogos de tareas (estados/impactos/urgencias).');
                await t.commit(); return;
            }

            const ptsImp = { [impactoAlto.id]: 80, [impactoMedio.id]: 50 };
            const ptsUrg = { [urg7d.id]: 40, [urg30d.id]: 20 };
            const calcPrio = (imp, urg) => (cli.ponderacion * 100) + (ptsImp[imp] || 0) + (ptsUrg[urg] || 0);

            const tasksToCreate = [
                {
                    titulo: 'Audit de Infraestructura Cloud',
                    descripcion: 'Revisión mensual de costos, seguridad y escalabilidad de AWS/Google Cloud.',
                    impacto_id: impactoAlto.id,
                    urgencia_id: urg7d.id,
                    vencimiento: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                },
                {
                    titulo: 'Mantenimiento Preventivo de Sistemas',
                    descripcion: 'Actualización de dependencias, auditoría de logs y optimización de base de datos.',
                    impacto_id: impactoMedio.id,
                    urgencia_id: urg30d.id,
                    vencimiento: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
                },
                {
                    titulo: 'Roadmap FedesHub Q1 2026',
                    descripcion: 'Definición estratégica de módulos: CRM Avanzado, Reporting y Automation Engine.',
                    impacto_id: impactoAlto.id,
                    urgencia_id: urg30d.id,
                    vencimiento: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
                }
            ];

            for (const tk of tasksToCreate) {
                // Verificar si existe
                const [[exists]] = await queryInterface.sequelize.query(
                    `SELECT id FROM "Tarea" WHERE cliente_id = :cliId AND titulo = :tit LIMIT 1`,
                    { transaction: t, replacements: { cliId: cli.id, tit: tk.titulo } }
                );
                if (exists) continue;

                const [tidArr] = await queryInterface.bulkInsert('Tarea', [{
                    cliente_id: cli.id,
                    titulo: tk.titulo,
                    descripcion: tk.descripcion,
                    estado_id: estadoPend.id,
                    creado_por_feder_id: enzo.id,
                    impacto_id: tk.impacto_id,
                    urgencia_id: tk.urgencia_id,
                    prioridad_num: calcPrio(tk.impacto_id, tk.urgencia_id),
                    cliente_ponderacion: cli.ponderacion,
                    fecha_inicio: now,
                    vencimiento: tk.vencimiento,
                    requiere_aprobacion: false,
                    aprobacion_estado_id: 1,
                    is_archivada: false,
                    created_at: now, updated_at: now
                }], { transaction: t, returning: true });

                const tid = tidArr[0]?.id || tidArr?.id;

                // Asignar a Enzo como responsable
                await queryInterface.bulkInsert('TareaResponsable', [{
                    tarea_id: tid, feder_id: enzo.id, es_lider: true, asignado_at: now
                }], { transaction: t });
            }

            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    async down(queryInterface) {
        // No hace falta borrar, pero para consistencia:
        await queryInterface.sequelize.query(`
      DELETE FROM "Tarea" WHERE cliente_id IN (SELECT id FROM "Cliente" WHERE nombre = '066 - Fedes Cloud')
    `);
    }
};
