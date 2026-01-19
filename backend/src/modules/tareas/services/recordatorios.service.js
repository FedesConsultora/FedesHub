// backend/src/modules/tareas/services/recordatorios.service.js
import { initModels } from '../../../models/registry.js';
import { svcCreate as notifCreate } from '../../notificaciones/services/notificaciones.service.js';
import { Op } from 'sequelize';

const models = await initModels();

export async function procesarRecordatorios() {
    const ahora = new Date();

    try {
        // Buscar recordatorios pendientes cuya fecha ya pasó
        const pendientes = await models.TareaRecordatorio.findAll({
            where: {
                enviado: false,
                fecha_recordatorio: { [Op.lte]: ahora }
            },
            include: [
                { model: models.Tarea, as: 'tarea', attributes: ['id', 'titulo', 'descripcion'] },
                { model: models.User, as: 'user', attributes: ['id', 'email'] }
            ]
        });

        if (pendientes.length === 0) return;

        console.log(`[Recordatorios] Procesando ${pendientes.length} recordatorios...`);

        for (const rec of pendientes) {
            try {
                const tarea = rec.tarea;
                const user = rec.user;

                if (!tarea || !user) {
                    rec.enviado = true;
                    await rec.save();
                    continue;
                }

                // 1. Notificación Hub (in-app / push)
                if (rec.tipo === 'hub' || rec.tipo === 'both') {
                    await notifCreate({
                        tipo_codigo: 'tarea_recordatorio',
                        titulo: `Recordatorio: ${tarea.titulo}`,
                        mensaje: `Tenés un recordatorio para la tarea: ${tarea.titulo}`,
                        data: { tarea_id: tarea.id },
                        link_url: `/tareas?open=${tarea.id}`,
                        tarea_id: tarea.id,
                        destinos: [{ user_id: user.id }],
                        canales: ['in_app', 'push']
                    }, { id: null, system: true }); // Autor sistema
                }

                // 2. Email (si se requiere)
                if (rec.tipo === 'email' || rec.tipo === 'both') {
                    // Aquí integraríamos con su servicio de email existente
                    // Por ahora asumo que hay un mediador o servicio global de correos
                    console.log(`[Recordatorios] Enviando email a ${user.email} para tarea ${tarea.id}`);
                    // await emailService.send(...)
                }

                // Marcar como enviado
                rec.enviado = true;
                await rec.save();

            } catch (err) {
                console.error(`[Recordatorios] Error procesando recordatorio ${rec.id}:`, err);
            }
        }
    } catch (err) {
        console.error('[Recordatorios] Error general en procesarRecordatorios:', err);
    }
}
