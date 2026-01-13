// backend/src/modules/mantenimiento/services/mantenimiento.service.js
import { sequelize } from '../../../core/db.js';
import { QueryTypes } from 'sequelize';
import { initModels } from '../../../models/registry.js';
import { listClientes, getClienteById, createCliente, updateCliente } from '../../clientes/repositories/clientes.repo.js';
import { listTasks, getTaskById, createTask, updateTask } from '../../tareas/repositories/tareas.repo.js';

const models = await initModels();

// --- CLIENTES ---

export const svcExportClientes = async () => {
    const rows = await listClientes({ limit: 99999, estado_id: 'all' });
    const fullRows = await Promise.all(rows.map(r => getClienteById(r.id)));
    return fullRows;
};

export const svcImportClientes = async (data) => {
    if (!Array.isArray(data)) throw new Error('Formato inválido: se esperaba un array de clientes');
    const res = { created: 0, updated: 0, errors: [] };

    for (const item of data) {
        try {
            const { id, contactos, ...payload } = item;
            const exists = id ? await models.Cliente.findByPk(id) : null;

            if (exists) {
                await updateCliente(id, payload);
                res.updated++;
            } else {
                const newCli = await createCliente(payload);
                // Si venía con contactos, intentar crearlos
                if (contactos && Array.isArray(contactos)) {
                    for (const c of contactos) {
                        await models.ClienteContacto.create({ ...c, cliente_id: newCli.id });
                    }
                }
                res.created++;
            }
        } catch (e) {
            res.errors.push({ item: item.nombre || item.id, error: e.message });
        }
    }
    return res;
};

// --- TAREAS ---

export const svcExportTareas = async () => {
    // Exportamos todas las tareas, incluidas archivadas y finalizadas
    const tasks = await listTasks({ limit: 99999, include_archivadas: true, include_finalizadas: true }, { id: 0 }); // Mock user with id 0 for query
    const fullTasks = await Promise.all(tasks.map(t => getTaskById(t.id, { id: 0 })));
    return fullTasks;
};

export const svcImportTareas = async (data) => {
    if (!Array.isArray(data)) throw new Error('Formato inválido: se esperaba un array de tareas');
    const res = { created: 0, updated: 0, errors: [] };

    // Usar transacción para asegurar consistencia
    return sequelize.transaction(async (t) => {
        for (const item of data) {
            try {
                const {
                    id, responsables, colaboradores, etiquetas, checklist, comentarios, adjuntos, relaciones,
                    estado_codigo, impacto_puntos, urgencia_puntos, ...payload
                } = item;

                // Limpiar payload de campos calculados o nulos que molestan en el create
                delete payload.created_at;
                delete payload.updated_at;
                delete payload.is_favorita;
                delete payload.is_seguidor;

                const exists = id ? await models.Tarea.findByPk(id, { transaction: t }) : null;

                if (exists) {
                    await exists.update(payload, { transaction: t });
                    res.updated++;
                } else {
                    // Nota: El repo de tareas requiere un feder_id para 'creado_por_feder_id'
                    // Usamos el del item si existe, o un fallback
                    const federId = item.creado_por_feder_id || 1;
                    const tarea = await models.Tarea.create({ ...payload, creado_por_feder_id: federId }, { transaction: t });

                    // Re-vincular todo
                    if (responsables?.length) {
                        await models.TareaResponsable.bulkCreate(
                            responsables.map(r => ({ tarea_id: tarea.id, feder_id: r.feder_id, es_lider: r.es_lider })),
                            { transaction: t }
                        );
                    }
                    if (colaboradores?.length) {
                        await models.TareaColaborador.bulkCreate(
                            colaboradores.map(c => ({ tarea_id: tarea.id, feder_id: c.feder_id, rol: c.rol })),
                            { transaction: t }
                        );
                    }
                    if (etiquetas?.length) {
                        await models.TareaEtiquetaAsig.bulkCreate(
                            etiquetas.map(e => ({ tarea_id: tarea.id, etiqueta_id: e.id })),
                            { transaction: t }
                        );
                    }
                    if (checklist?.length) {
                        await models.TareaChecklistItem.bulkCreate(
                            checklist.map(i => ({ tarea_id: tarea.id, titulo: i.titulo, is_done: i.is_done, orden: i.orden })),
                            { transaction: t }
                        );
                    }
                    // Comentarios es más complejo por relaciones, pero sigamos con lo básico principal
                    if (comentarios?.length) {
                        for (const cm of comentarios) {
                            const newCm = await models.TareaComentario.create({
                                tarea_id: tarea.id,
                                feder_id: cm.feder_id,
                                tipo_id: cm.tipo_id,
                                contenido: cm.contenido,
                                created_at: cm.created_at
                            }, { transaction: t });

                            if (cm.menciones?.length) {
                                await models.TareaComentarioMencion.bulkCreate(
                                    cm.menciones.map(fid => ({ comentario_id: newCm.id, feder_id: fid })),
                                    { transaction: t }
                                );
                            }
                        }
                    }
                    res.created++;
                }
            } catch (e) {
                res.errors.push({ item: item.titulo || item.id, error: e.message });
            }
        }
        return res;
    });
};
