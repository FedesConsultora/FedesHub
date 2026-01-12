// backend/src/modules/asistencia/jobs/emailAttendanceReminder.js
// Job para enviar recordatorio diario de asistencia
// Se ejecuta a las 9:00 AM para recordar a los feders que activen el punto verde

import { initModels } from '../../../models/registry.js';
import { Op } from 'sequelize';
import { svcCreate as notifCreate } from '../../notificaciones/services/notificaciones.service.js';

const models = await initModels();

const ENV = {
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'https://hub.fedesconsultora.com'
};

/**
 * Envía recordatorio de asistencia a feders que aún no iniciaron su registro del día
 */
export async function sendAttendanceReminders() {
    try {
        console.log('[emailAttendanceReminder] Iniciando job de recordatorio de asistencia...');

        // Obtener todos los feders activos con su user_id
        const federsActivos = await models.Feder.findAll({
            where: { is_activo: true },
            include: [{
                model: models.User,
                as: 'user',
                where: { is_activo: true },
                required: true,
                attributes: ['id', 'email']
            }],
            attributes: ['id', 'nombre', 'apellido', 'user_id']
        });

        if (!federsActivos.length) {
            console.log('[emailAttendanceReminder] No hay feders activos');
            return { sent: 0, skipped: 0 };
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);

        let sent = 0;
        let skipped = 0;

        for (const feder of federsActivos) {
            try {
                // Verificar si ya tiene registro de asistencia hoy
                const registroHoy = await models.AsistenciaRegistro.findOne({
                    where: {
                        feder_id: feder.id,
                        entrada_at: {
                            [Op.gte]: hoy,
                            [Op.lt]: manana
                        }
                    }
                });

                // Si ya registró asistencia, skip
                if (registroHoy) {
                    skipped++;
                    continue;
                }

                // Verificar si ya le enviamos recordatorio hoy (para evitar duplicados)
                const notifHoy = await models.Notificacion.findOne({
                    where: {
                        created_at: {
                            [Op.gte]: hoy,
                            [Op.lt]: manana
                        }
                    },
                    include: [{
                        model: models.NotificacionTipo,
                        as: 'tipo',
                        where: { codigo: 'asistencia_recordatorio' }
                    }, {
                        model: models.NotificacionDestino,
                        as: 'destinos',
                        where: { user_id: feder.user.id },
                        required: true
                    }]
                });

                if (notifHoy) {
                    skipped++;
                    console.log(`[emailAttendanceReminder] Feder ${feder.id} (${feder.nombre}) ya recibió recordatorio hoy`);
                    continue;
                }

                // Crear y env iar notificación de recordatorio
                const linkUrl = `${ENV.PUBLIC_BASE_URL}`;

                await notifCreate({
                    tipo_codigo: 'asistencia_recordatorio',
                    titulo: '🟢 Recordá activar tu asistencia',
                    mensaje: `Hola ${feder.nombre}, recordá iniciar tu registro de asistencia para el día de hoy`,
                    data: {
                        feder: {
                            id: feder.id,
                            nombre: feder.nombre,
                            apellido: feder.apellido
                        }
                    },
                    link_url: linkUrl,
                    destinos: [{
                        user_id: feder.user.id,
                        feder_id: feder.id
                    }],
                    canales: ['email'] // Solo email, no queremos saturar con notificaciones in-app diarias
                });

                sent++;
                console.log(`[emailAttendanceReminder] ✓ Enviado a ${feder.nombre} ${feder.apellido} (${feder.user.email})`);

            } catch (err) {
                console.error(`[emailAttendanceReminder] Error procesando feder ${feder.id}:`, err.message);
                skipped++;
            }
        }

        console.log(`[emailAttendanceReminder] Finalizado. Enviados: ${sent}, Omitidos: ${skipped}`);
        return { sent, skipped, total: federsActivos.length };

    } catch (error) {
        console.error('[emailAttendanceReminder] Error en job:', error);
        throw error;
    }
}

// Si se ejecuta directamente (para testing)
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Ejecutando job de recordatorio de asistencia...');
    sendAttendanceReminders()
        .then(result => {
            console.log('Resultado:', result);
            process.exit(0);
        })
        .catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
}
