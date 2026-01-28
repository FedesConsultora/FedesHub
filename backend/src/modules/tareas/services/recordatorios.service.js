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

                // Definir canales según el tipo
                const canales = [];
                if (rec.tipo === 'hub' || rec.tipo === 'both') canales.push('in_app', 'push');
                if (rec.tipo === 'email' || rec.tipo === 'both') canales.push('email');

                // Base URL para el link (necesario para emails)
                const baseUrl = (process.env.PUBLIC_BASE_URL || 'https://hub.fedesconsultora.com').replace(/\/+$/, '');
                const linkUrl = `${baseUrl}/tareas?open=${tarea.id}`;

                // Crear notificación centralizada (esto maneja Hub, Push y Email automáticamente)
                await notifCreate({
                    tipo_codigo: 'tarea_recordatorio',
                    titulo: `Recordatorio: ${tarea.titulo}`,
                    mensaje: `Tenés un recordatorio para la tarea: ${tarea.titulo}`,
                    data: { tarea_id: tarea.id },
                    link_url: linkUrl,
                    tarea_id: tarea.id,
                    destinos: [{ user_id: user.id }],
                    canales: canales
                }, { id: null, system: true });

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