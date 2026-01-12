
import { initModels } from './src/models/registry.js';
import { svcCreate } from './src/modules/notificaciones/services/notificaciones.service.js';
import { sendNotificationEmails } from './src/modules/notificaciones/services/email.service.js';

async function main() {
    const models = await initModels();

    // 1. Verificar tipo
    const tipo = await models.NotificacionTipo.findOne({ where: { codigo: 'asistencia_recordatorio' } });
    console.log('TIPO_INFO:', JSON.stringify(tipo));

    const users = [
        { user_id: 3, feder_id: 3, nombre: 'Enzo' },
        { user_id: 14, feder_id: 14, nombre: 'Belen' }
    ];

    for (const u of users) {
        console.log(`Creando notificacion para ${u.nombre}...`);
        const notif = await svcCreate({
            tipo_codigo: 'asistencia_recordatorio',
            titulo: '¡Hola ' + u.nombre + '! ⏰',
            mensaje: '¿Ya activaste tu asistencia hoy?',
            data: { feder: { nombre: u.nombre } },
            link_url: 'https://hub.fedesconsultora.com/asistencia',
            destinos: [{ user_id: u.user_id, feder_id: u.feder_id }],
            canales: ['email']
        }, { id: 1 });

        console.log(`Forzando envío de email para notif_id ${notif.id}...`);
        try {
            const sentCount = await sendNotificationEmails(notif.id);
            console.log(`Emails enviados para ${u.nombre}: ${sentCount}`);
        } catch (err) {
            console.error(`Error enviando email a ${u.nombre}:`, err.message);
        }
    }

    console.log('DONE');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
