// backend/src/modules/tareas/helpers/historial.helper.js
// Helper centralizado para registrar cambios en el historial de tareas

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

/**
 * Tipos de cambios soportados
 * Extendible: solo agregar nuevos tipos aquí
 */
export const TIPO_CAMBIO = {
    CREACION: 'creacion',
    ESTADO: 'estado',
    RESPONSABLE: 'responsable',
    COLABORADOR: 'colaborador',
    DEADLINE: 'deadline',
    FECHA_INICIO: 'fecha_inicio',
    APROBACION: 'aprobacion',
    CLIENTE: 'cliente',
    HITO: 'hito',
    TITULO: 'titulo',
    DESCRIPCION: 'descripcion',
    IMPACTO: 'impacto',
    URGENCIA: 'urgencia',
    ETIQUETA: 'etiqueta',
    PROGRESO: 'progreso',
    ARCHIVADO: 'archivado',
    PRIORIDAD: 'prioridad',
    ADJUNTO: 'adjunto',
    RELACION: 'relacion',
    TC_DETALLE: 'tc_detalle',
    TC_REDES: 'tc_redes',
    TC_FORMATOS: 'tc_formatos'
};

/**
 * Acciones posibles
 */
export const ACCION = {
    CREATED: 'created',
    UPDATED: 'updated',
    DELETED: 'deleted',
    ADDED: 'added',
    REMOVED: 'removed'
};

/**
 * Registra un cambio en el historial de una tarea
 * 
 * @param {Object} params
 * @param {number} params.tarea_id - ID de la tarea
 * @param {number} params.feder_id - ID del feder que hizo el cambio
 * @param {string} params.tipo_cambio - Tipo de cambio (usar TIPO_CAMBIO)
 * @param {string} params.accion - Acción realizada (usar ACCION)
 * @param {*} params.valor_anterior - Valor anterior (opcional)
 * @param {*} params.valor_nuevo - Valor nuevo
 * @param {string} params.campo - Campo específico modificado (opcional)
 * @param {string} params.descripcion - Descripción legible (opcional)
 * @param {Transaction} params.transaction - Transacción de Sequelize (opcional)
 * @returns {Promise<Object>} Entrada de historial creada
 */
export const registrarCambio = async ({
    tarea_id,
    feder_id,
    tipo_cambio,
    accion,
    valor_anterior = null,
    valor_nuevo = null,
    campo = null,
    descripcion = null,
    transaction = null
}) => {
    return models.TareaHistorial.create({
        tarea_id,
        feder_id,
        tipo_cambio,
        accion,
        valor_anterior,
        valor_nuevo,
        campo,
        descripcion
    }, { transaction });
};

/**
 * Obtiene el historial de una tarea con datos enriquecidos del autor
 * Incluye paginación
 * 
 * @param {number} tarea_id - ID de la tarea
 * @param {Object} options - Opciones de paginación y filtrado
 * @param {number} options.limit - Cantidad de resultados por página (default: 50)
 * @param {number} options.offset - Offset para paginación (default: 0)
 * @param {string} options.tipo_cambio - Filtrar por tipo de cambio (opcional)
 * @returns {Promise<Array>} Lista de cambios con datos del autor
 */
export const obtenerHistorial = async (tarea_id, { limit = 50, offset = 0, tipo_cambio = null } = {}) => {
    const repl = { tarea_id, limit, offset };
    let whereClause = 'WHERE h.tarea_id = :tarea_id';

    if (tipo_cambio) {
        whereClause += ' AND h.tipo_cambio = :tipo_cambio';
        repl.tipo_cambio = tipo_cambio;
    }

    return sequelize.query(`
    SELECT 
      h.id,
      h.tarea_id,
      h.feder_id,
      h.tipo_cambio,
      h.accion,
      h.valor_anterior,
      h.valor_nuevo,
      h.campo,
      h.descripcion,
      h.created_at,
      f.nombre AS feder_nombre,
      f.apellido AS feder_apellido,
      f.avatar_url AS feder_avatar
    FROM "TareaHistorial" h
    JOIN "Feder" f ON f.id = h.feder_id
    ${whereClause}
    ORDER BY h.created_at DESC
    LIMIT :limit OFFSET :offset
  `, {
        type: QueryTypes.SELECT,
        replacements: repl
    });
};

/**
 * Cuenta el total de entradas de historial para una tarea
 * Útil para paginación
 * 
 * @param {number} tarea_id - ID de la tarea
 * @param {string} tipo_cambio - Filtrar por tipo (opcional)
 * @returns {Promise<number>} Total de entradas
 */
export const contarHistorial = async (tarea_id, tipo_cambio = null) => {
    const where = { tarea_id };
    if (tipo_cambio) where.tipo_cambio = tipo_cambio;

    return models.TareaHistorial.count({ where });
};

/**
 * Helper para formatear fechas en descripciones
 */
export const formatearFecha = (fecha) => {
    if (!fecha) return 'sin fecha';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};
