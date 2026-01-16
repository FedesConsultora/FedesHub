// backend/src/modules/comercial/jobs/onboardingJob.js
import { initModels } from '../../../models/registry.js';
import { differenceInDays, startOfDay } from 'date-fns';
import { createNotificacionGlobal } from '../../notificaciones/services/notificaciones.service.js';
import { logger } from '../../../core/logger.js';

const models = await initModels();

export const checkOnboardingExpirations = async () => {
    const activeLeads = await models.ComercialLead.findAll({
        where: {
            onboarding_status: 'activo',
            ruta_post_negociacion: 'onboarding'
        }
    });

    const today = startOfDay(new Date());

    for (const lead of activeLeads) {
        if (!lead.onboarding_due_at) continue;

        const due = startOfDay(new Date(lead.onboarding_due_at));
        const daysLeft = differenceInDays(due, today);

        try {
            // Milestone: 7 días antes
            if (daysLeft === 7 && !lead.notif_7d_sent_at) {
                await sendNotification(lead, '7 días');
                lead.notif_7d_sent_at = new Date();
                await lead.save();
            }
            // Milestone: 3 días antes
            else if (daysLeft === 3 && !lead.notif_3d_sent_at) {
                await sendNotification(lead, '3 días');
                lead.notif_3d_sent_at = new Date();
                await lead.save();
            }
            // Milestone: Vencido (0 o menos)
            else if (daysLeft <= 0 && !lead.notif_expired_sent_at) {
                await sendNotification(lead, 'vencido');
                lead.notif_expired_sent_at = new Date();
                lead.onboarding_status = 'revision_pendiente';
                await lead.save();
            }
        } catch (err) {
            logger.error({ err, lead_id: lead.id }, 'Error enviando notificación de onboarding');
        }
    }
};

const sendNotification = async (lead, timeLabel) => {
    const responsable = await models.Feder.findByPk(lead.responsable_feder_id);
    if (!responsable) return;

    const msg = timeLabel === 'vencido'
        ? `Onboarding vencido: ${lead.empresa || lead.nombre}. ¿Sigue con nosotros?`
        : `Onboarding por vencer en ${timeLabel} — ${lead.empresa || lead.nombre}`;

    await createNotificacionGlobal({
        tipo_codigo: 'comercial_onboarding',
        titulo: 'Alerta de Onboarding',
        mensaje: msg,
        destinos: [{ feder_id: lead.responsable_feder_id }],
        data: { lead_id: lead.id, type: timeLabel }
    });
};

export const startOnboardingJob = () => {
    const HOURS_6 = 6 * 60 * 60 * 1000;
    const run = async () => {
        try {
            await checkOnboardingExpirations();
        } catch (err) {
            logger.error({ err }, 'Onboarding job error');
        }
    };
    run();
    setInterval(run, HOURS_6);
    logger.info('Onboarding notification job started (runs every 6 hours)');
};
