// backend/src/modules/comercial/services/lead.service.js
import * as leadRepo from '../repositories/lead.repo.js';
import * as adminRepo from '../repositories/admin_comercial.repo.js';
import { svcCreate as svcCreateCliente } from '../../clientes/services/clientes.service.js';
import { createNotificacionGlobal } from '../../notificaciones/services/notificaciones.service.js';
import { addDays, format } from 'date-fns';
import { getFiscalStatus } from '../utils/fiscal.js';

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
    if (!oldLead) throw new Error('Lead no encontrado');

    await leadRepo.updateLead(id, data);

    // Notificación si cambia el responsable
    if (data.responsable_feder_id && Number(data.responsable_feder_id) !== Number(oldLead.responsable_feder_id)) {
        await createNotificacionGlobal({
            tipo_codigo: 'comercial_lead_asignado',
            buzon_id: 2, // Tareas/Comercial
            destinos: [data.responsable_feder_id],
            titulo: 'Nuevo Lead Asignado',
            descripcion: `Se te ha asignado el lead "${oldLead.empresa || oldLead.nombre}".`,
            tarea_id: null,
            lead_id: id
        });

        await leadRepo.addHistorial({
            lead_id: id,
            user_id: userId,
            tipo_evento: 'cambio_responsable',
            descripcion: `Responsable cambiado a Feder ID: ${data.responsable_feder_id}`,
            data_json: { old: oldLead.responsable_feder_id, next: data.responsable_feder_id }
        });
    }

    // Registrar cambios importantes en historial
    if (data.status_id && Number(data.status_id) !== Number(oldLead.status_id)) {
        const statuses = await leadRepo.listStatuses();
        const oldStatus = statuses.find(s => Number(s.id) === Number(oldLead.status_id))?.nombre || oldLead.status_id;
        const newStatus = statuses.find(s => Number(s.id) === Number(data.status_id))?.nombre || data.status_id;

        await leadRepo.addHistorial({
            lead_id: id,
            user_id: userId,
            tipo_evento: 'cambio_estado',
            descripcion: `Estado cambiado de "${oldStatus}" a "${newStatus}"`,
            data_json: { old: oldLead.status_id, next: data.status_id }
        });
    }

    if (data.etapa_id && Number(data.etapa_id) !== Number(oldLead.etapa_id)) {
        const etapas = await leadRepo.listEtapas();
        const oldEtapa = etapas.find(e => Number(e.id) === Number(oldLead.etapa_id))?.nombre || oldLead.etapa_id;
        const newEtapaObj = etapas.find(e => Number(e.id) === Number(data.etapa_id));
        const newEtapa = newEtapaObj?.nombre || data.etapa_id;

        // Validar presupuesto_ars si pasa a etapa 'presupuesto'
        if (newEtapaObj?.codigo === 'presupuesto' && !data.presupuesto_ars && !oldLead.presupuesto_ars) {
            throw new Error('Debe ingresar un monto de presupuesto para pasar a esta etapa.');
        }

        await leadRepo.addHistorial({
            lead_id: id,
            user_id: userId,
            tipo_evento: 'cambio_etapa',
            descripcion: `Etapa cambiada de "${oldEtapa}" a "${newEtapa}"`,
            data_json: { old: oldLead.etapa_id, next: data.etapa_id }
        });
    }

    if (data.presupuesto_ars && Number(data.presupuesto_ars) !== Number(oldLead.presupuesto_ars)) {
        await leadRepo.addHistorial({
            lead_id: id,
            user_id: userId,
            tipo_evento: 'presupuesto_actualizado',
            descripcion: `Monto de presupuesto actualizado: $${data.presupuesto_ars}`,
            data_json: { old: oldLead.presupuesto_ars, next: data.presupuesto_ars }
        });
    }

    return leadRepo.getLeadById(id);
};

import { saveUploadedFiles } from '../../../infra/storage/index.js';

export const svcAddNota = async (leadId, contenido, userId, files = []) => {
    const nota = await leadRepo.addNota({ lead_id: leadId, contenido, autor_user_id: userId });

    if (files && files.length > 0) {
        // Guardar archivos en storage (usamos dominio 'default' o 'tareas' si queremos Drive explícito)
        // El pathParts ayuda a organizar en Drive: Comercial / Leads / {leadId}
        const pathParts = ['Comercial', 'Leads', String(leadId)];
        const saved = await saveUploadedFiles(files, pathParts, 'tareas');

        for (const f of saved) {
            await leadRepo.addAdjunto({
                lead_id: leadId,
                nota_id: nota.id,
                autor_user_id: userId,
                nombre_original: f.name,
                mimetype: f.mime,
                size: f.size,
                key: f.drive_file_id || f.key || f.name,
                url: f.webViewLink || f.url
            });
        }
    }

    await leadRepo.addHistorial({
        lead_id: leadId,
        user_id: userId,
        tipo_evento: 'nota_agregada',
        descripcion: 'Se agregó una nota' + (files?.length ? ` con ${files.length} adjuntos` : '')
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

    const activeEECC = await adminRepo.getActiveEECC();
    if (!activeEECC) throw new Error('No hay un Ejercicio Contable (EECC) activo para registrar la venta.');

    // Calcular Q y Mes Fiscal usando el utilitario
    const { fiscalQ, fiscalMonth } = getFiscalStatus(new Date(), activeEECC.start_at);

    const statuses = await leadRepo.listStatuses();
    const etapas = await leadRepo.listEtapas();

    const update = {
        status_id: statuses.find(s => s.codigo === 'cerrado')?.id,
        etapa_id: etapas.find(e => e.codigo === 'cierre')?.id || lead.etapa_id,
        ruta_post_negociacion: ruta,
        eecc_id: activeEECC.id,
        updated_at: new Date()
    };

    if (ruta === 'onboarding') {
        update.onboarding_tipo = onboardingData.tipo;
        update.onboarding_start_at = onboardingData.start_at || new Date();
        update.onboarding_due_at = addDays(new Date(update.onboarding_start_at), 60);
        update.onboarding_status = 'activo';
    }

    await leadRepo.updateLead(id, update);

    // Registro de Venta vNext
    if (onboardingData?.producto_id) {
        const producto = await adminRepo.getProductoById(onboardingData.producto_id);
        if (producto) {
            const bruto = parseFloat(producto.precio_actual);
            let bonificado = parseFloat(onboardingData.bonificado_ars || 0);

            // Si se pasa un precio_final explícito, recalculamos el bonificado
            if (onboardingData.precio_final != null) {
                const final = parseFloat(onboardingData.precio_final);
                bonificado = bruto - final;
            }

            // 1. Validar Descuento Máximo por Producto
            const maxDescPorc = parseFloat(producto.max_descuento_porc || 0);
            if (maxDescPorc > 0) {
                const actualDescPorc = (bonificado / bruto) * 100;
                if (actualDescPorc > maxDescPorc) {
                    throw new Error(`El descuento solicitado (${actualDescPorc.toFixed(1)}%) supera el máximo permitido para este producto (${maxDescPorc}%).`);
                }
            }

            // 2. Validar Tope de Descuento Trimestral (Q Cap)
            if (bonificado > 0) {
                const qCaps = await adminRepo.listDescuentoCaps(activeEECC.id);
                const qCap = qCaps.find(c => c.q === fiscalQ)?.monto_maximo_ars || 0;
                const consumido = await leadRepo.getSumBonificadoByQ(activeEECC.id, fiscalQ);

                if (consumido + bonificado > qCap) {
                    throw new Error(`El descuento excede el presupuesto trimestral (Presupuesto Q${fiscalQ}: $${parseFloat(qCap).toLocaleString()}, Consumido: $${parseFloat(consumido).toLocaleString()})`);
                }
            }

            const venta = await leadRepo.createVenta({
                lead_id: id,
                eecc_id: activeEECC.id,
                q: fiscalQ,
                mes_fiscal: fiscalMonth,
                fecha_venta: new Date()
            });

            const neto = bruto - bonificado;

            await leadRepo.createVentaLinea({
                venta_id: venta.id,
                producto_id: producto.id,
                producto_nombre_snapshot: producto.nombre,
                precio_bruto_snapshot: bruto,
                bonificado_ars: bonificado > 0 ? bonificado : 0,
                precio_neto_snapshot: neto
            });
        }
    }

    await leadRepo.addHistorial({
        lead_id: id,
        user_id: userId,
        tipo_evento: 'negociacion_ganada',
        descripcion: `Negociación ganada con ruta: ${ruta}`,
        data_json: { ruta, onboardingData, fiscalQ, fiscalMonth }
    });

    if (ruta === 'alta_directa') {
        return svcConvertToCliente(id, userId);
    }

    return leadRepo.getLeadById(id);
};

export const svcNegociacionPerdida = async (id, motivoId, comentario, userId) => {
    const statuses = await leadRepo.listStatuses();
    const etapas = await leadRepo.listEtapas();

    await leadRepo.updateLead(id, {
        status_id: statuses.find(s => s.codigo === 'perdido')?.id,
        etapa_id: etapas.find(e => e.codigo === 'cierre')?.id,
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
export const svcDeleteLead = async (id, userId) => {
    const lead = await leadRepo.getLeadById(id);
    if (!lead) throw new Error('Lead no encontrado');

    await leadRepo.deleteLead(id);

    await leadRepo.addHistorial({
        lead_id: id,
        user_id: userId,
        tipo_evento: 'lead_eliminado',
        descripcion: 'Lead movido a la papelera'
    });
};

export const svcListTrash = async () => {
    return leadRepo.listTrash();
};

export const svcRestoreLead = async (id, userId) => {
    await leadRepo.restoreLead(id);
    await leadRepo.addHistorial({
        lead_id: id,
        user_id: userId,
        tipo_evento: 'lead_restaurado',
        descripcion: 'Lead restaurado de la papelera'
    });
};

export const svcListOnboarding = () => leadRepo.listOnboardingLeads();
