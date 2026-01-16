// backend/src/modules/comercial/services/lead.service.js
import * as leadRepo from '../repositories/lead.repo.js';
import { svcCreate as svcCreateCliente } from '../../clientes/services/clientes.service.js';
import { createNotificacionGlobal } from '../../notificaciones/services/notificaciones.service.js';
import { addDays, format } from 'date-fns';

export const svcListLeads = (q) => leadRepo.listLeads(q);
export const svcGetLead = (id) => leadRepo.getLeadById(id);

export const svcCreateLead = async (data, userId) => {
    const lead = await leadRepo.createLead({ ...data, created_by_user_id: userId });
    await leadRepo.addHistorial({
        lead_id: lead.id,
        user_id: userId,
        tipo_evento: 'creacion',
        descripcion: 'Lead creado'
    });
    return lead;
};

export const svcUpdateLead = async (id, data, userId) => {
    const oldLead = await leadRepo.getLeadById(id);
    await leadRepo.updateLead(id, data);

    // Registrar cambios importantes en historial
    if (data.status_id && data.status_id !== oldLead.status_id) {
        await leadRepo.addHistorial({
            lead_id: id,
            user_id: userId,
            tipo_evento: 'cambio_estado',
            descripcion: `Estado cambiado de ${oldLead.status_id} a ${data.status_id}`,
            data_json: { old: oldLead.status_id, next: data.status_id }
        });
    }

    if (data.etapa_id && data.etapa_id !== oldLead.etapa_id) {
        await leadRepo.addHistorial({
            lead_id: id,
            user_id: userId,
            tipo_evento: 'cambio_etapa',
            descripcion: `Etapa cambiada de ${oldLead.etapa_id} a ${data.etapa_id}`,
            data_json: { old: oldLead.etapa_id, next: data.etapa_id }
        });
    }

    return leadRepo.getLeadById(id);
};

export const svcAddNota = async (leadId, contenido, userId) => {
    const nota = await leadRepo.addNota({ lead_id: leadId, contenido, autor_user_id: userId });
    await leadRepo.addHistorial({
        lead_id: leadId,
        user_id: userId,
        tipo_evento: 'nota_agregada',
        descripcion: 'Se agregó una nota'
    });
    return nota;
};

export const svcAddAdjunto = async (leadId, fileData, userId) => {
    const adjunto = await leadRepo.addAdjunto({ ...fileData, lead_id: leadId, autor_user_id: userId });
    await leadRepo.addHistorial({
        lead_id: leadId,
        user_id: userId,
        tipo_evento: 'adjunto_subido',
        descripcion: `Se subió el archivo: ${fileData.nombre_original}`
    });
    return adjunto;
};

export const svcNegociacionGanada = async (id, ruta, onboardingData, userId) => {
    const lead = await leadRepo.getLeadById(id);
    if (!lead) throw new Error('Lead no encontrado');

    const update = {
        status_id: (await leadRepo.listStatuses()).find(s => s.codigo === 'cerrado').id,
        ruta_post_negociacion: ruta,
        updated_at: new Date()
    };

    if (ruta === 'onboarding') {
        update.onboarding_tipo = onboardingData.tipo;
        update.onboarding_start_at = onboardingData.start_at || new Date();
        update.onboarding_due_at = addDays(new Date(update.onboarding_start_at), 60);
        update.onboarding_status = 'activo';
    }

    await leadRepo.updateLead(id, update);
    await leadRepo.addHistorial({
        lead_id: id,
        user_id: userId,
        tipo_evento: 'negociacion_ganada',
        descripcion: `Negociación ganada con ruta: ${ruta}`,
        data_json: { ruta, onboardingData }
    });

    if (ruta === 'alta_directa') {
        return svcConvertToCliente(id, userId);
    }

    return leadRepo.getLeadById(id);
};

export const svcNegociacionPerdida = async (id, motivoId, comentario, userId) => {
    const statusPerdido = (await leadRepo.listStatuses()).find(s => s.codigo === 'perdido').id;
    await leadRepo.updateLead(id, {
        status_id: statusPerdido,
        motivo_perdida_id: motivoId,
        motivo_perdida_comentario: comentario,
        updated_at: new Date()
    });
    await leadRepo.addHistorial({
        lead_id: id,
        user_id: userId,
        tipo_evento: 'negociacion_perdida',
        descripcion: 'Negociación perdida',
        data_json: { motivoId, comentario }
    });
    return leadRepo.getLeadById(id);
};

export const svcConvertToCliente = async (leadId, userId) => {
    const lead = await leadRepo.getLeadById(leadId);
    if (!lead) throw new Error('Lead no encontrado');

    // Crear cliente
    const cliente = await svcCreateCliente({
        nombre: lead.empresa || `${lead.nombre} ${lead.apellido || ''}`.trim(),
        alias: lead.alias,
        email: lead.email,
        telefono: lead.telefono,
        sitio_web: lead.sitio_web,
        descripcion: `Convertido desde Lead ID ${lead.id}. Ubicación: ${lead.ubicacion || 'N/A'}`
    });

    // Vincular lead
    await leadRepo.updateLead(leadId, {
        cliente_id: cliente.id,
        onboarding_status: lead.onboarding_status === 'activo' ? 'completado' : lead.onboarding_status,
        updated_at: new Date()
    });

    await leadRepo.addHistorial({
        lead_id: leadId,
        user_id: userId,
        tipo_evento: 'conversion_cliente',
        descripcion: `Lead convertido a cliente ID: ${cliente.id}`,
        data_json: { cliente_id: cliente.id }
    });

    return { lead: await leadRepo.getLeadById(leadId), cliente };
};

export const svcResolveOnboardingVencido = async (leadId, decision, data, userId) => {
    if (decision === 'si') {
        return svcConvertToCliente(leadId, userId);
    } else if (decision === 'no') {
        return svcNegociacionPerdida(leadId, data.motivoId, data.comentario, userId);
    } else if (decision === 'extender') {
        const newDue = data.new_due_at || addDays(new Date(), 30);
        await leadRepo.updateLead(leadId, {
            onboarding_due_at: newDue,
            onboarding_status: 'activo',
            updated_at: new Date()
        });
        await leadRepo.addHistorial({
            lead_id: leadId,
            user_id: userId,
            tipo_evento: 'onboarding_extension',
            descripcion: `Onboarding extendido hasta ${format(new Date(newDue), 'dd/MM/yyyy')}`,
            data_json: { new_due_at: newDue }
        });
    }
    return leadRepo.getLeadById(leadId);
};

// Catalogs
export const svcGetCatalogs = async () => {
    const [statuses, etapas, fuentes, motivosPerdida] = await Promise.all([
        leadRepo.listStatuses(),
        leadRepo.listEtapas(),
        leadRepo.listFuentes(),
        leadRepo.listMotivosPerdida()
    ]);
    return { statuses, etapas, fuentes, motivosPerdida };
};
