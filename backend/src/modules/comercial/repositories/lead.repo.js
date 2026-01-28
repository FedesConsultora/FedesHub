// backend/src/modules/comercial/repositories/lead.repo.js
import { sequelize } from '../../../core/db.js';
import { QueryTypes, Op } from 'sequelize';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

export const listLeads = async ({ status_id, etapa_id, responsable_feder_id, q, limit = 50, offset = 0 } = {}) => {
    const where = {};
    if (status_id) where.status_id = status_id;
    if (etapa_id) where.etapa_id = etapa_id;
    if (responsable_feder_id) {
        where.responsable_feder_id = Array.isArray(responsable_feder_id) ? { [Op.in]: responsable_feder_id } : responsable_feder_id;
    }
    if (q) {
        where[Op.or] = [
            { nombre: { [Op.iLike]: `%${q}%` } },
            { apellido: { [Op.iLike]: `%${q}%` } },
            { empresa: { [Op.iLike]: `%${q}%` } },
            { email: { [Op.iLike]: `%${q}%` } }
        ];
    }

    return models.ComercialLead.findAndCountAll({
        where,
        attributes: {
            include: [
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)
                        FROM "Tarea" AS t
                        WHERE t.lead_id = "ComercialLead".id
                        AND t.deleted_at IS NULL
                        AND t.estado_id NOT IN (SELECT id FROM "TareaEstado" WHERE codigo IN ('aprobada', 'cancelada'))
                    )`),
                    'open_tasks_count'
                ]
            ]
        },
        include: [
            { model: models.ComercialLeadStatus, as: 'status' },
            { model: models.ComercialLeadEtapa, as: 'etapa' },
            { model: models.ComercialLeadFuente, as: 'fuente' },
            { model: models.Feder, as: 'responsable' }
        ],
        order: [['updated_at', 'DESC']],
        limit,
        offset
    });
};

export const getLeadById = async (id) => {
    return models.ComercialLead.findByPk(id, {
        include: [
            { model: models.ComercialLeadStatus, as: 'status' },
            { model: models.ComercialLeadEtapa, as: 'etapa' },
            { model: models.ComercialLeadFuente, as: 'fuente' },
            { model: models.ComercialLeadMotivoPerdida, as: 'motivoPerdida' },
            { model: models.Feder, as: 'responsable' },
            { model: models.Cliente, as: 'cliente' },
            {
                model: models.ComercialLeadNota,
                as: 'notas',
                include: [
                    { model: models.User, as: 'autor' },
                    { model: models.ComercialLeadAdjunto, as: 'adjuntos' }
                ],
                order: [['created_at', 'DESC']]
            },
            {
                model: models.ComercialLeadAdjunto,
                as: 'adjuntos',
                include: [{ model: models.User, as: 'autor' }]
            },
            {
                model: models.ComercialLeadHistorial,
                as: 'historial',
                include: [{ model: models.User, as: 'autor' }],
                order: [['created_at', 'DESC']]
            }
        ]
    });
};

export const createLead = async (data) => models.ComercialLead.create(data);

export const updateLead = async (id, data) => models.ComercialLead.update(data, { where: { id } });

export const deleteLead = async (id) => models.ComercialLead.destroy({ where: { id } });

export const listTrash = async () => {
    return models.ComercialLead.findAll({
        where: { deleted_at: { [Op.ne]: null } },
        paranoid: false,
        include: [
            { model: models.ComercialLeadStatus, as: 'status' },
            { model: models.ComercialLeadEtapa, as: 'etapa' },
            { model: models.Feder, as: 'responsable' }
        ],
        order: [['deleted_at', 'DESC']]
    });
};

export const restoreLead = async (id) => {
    return models.ComercialLead.restore({ where: { id } });
};

// Catalogs
export const listStatuses = async () => models.ComercialLeadStatus.findAll({ order: [['id', 'ASC']] });
export const listEtapas = async () => models.ComercialLeadEtapa.findAll({ order: [['orden', 'ASC']] });
export const listFuentes = async () => models.ComercialLeadFuente.findAll({ order: [['nombre', 'ASC']] });
export const listMotivosPerdida = async () => models.ComercialLeadMotivoPerdida.findAll({ order: [['nombre', 'ASC']] });

// Interactions
export const addNota = async (data) => models.ComercialLeadNota.create(data);
export const addAdjunto = async (data) => models.ComercialLeadAdjunto.create(data);
export const addHistorial = async (data) => models.ComercialLeadHistorial.create(data);

export const getLeadByEmail = async (email) => models.ComercialLead.findOne({ where: { email } });
export const getLeadByTelefono = async (telefono) => models.ComercialLead.findOne({ where: { telefono } });

// Sales vNext
export const createVenta = async (data) => models.ComercialVenta.create(data);
export const createVentaLinea = async (data) => models.ComercialVentaLinea.create(data);

export const getSumBonificadoByQ = async (eecc_id, q) => {
    const result = await models.ComercialVentaLinea.sum('bonificado_ars', {
        include: [{
            model: models.ComercialVenta,
            as: 'venta',
            where: { eecc_id, q }
        }]
    });
    return result || 0;
};

// Onboarding Management
export const listOnboardingLeads = async ({ status, responsable_feder_id, q } = {}) => {
    const where = {
        ruta_post_negociacion: 'onboarding'
    };

    if (status) {
        where.onboarding_status = status;
    } else {
        // Por defecto omitir completados/cancelados si no se pide un status específico
        where.onboarding_status = { [Op.notIn]: ['completado', 'cancelado'] };
    }

    if (responsable_feder_id) {
        where.responsable_feder_id = Array.isArray(responsable_feder_id) ? { [Op.in]: responsable_feder_id } : responsable_feder_id;
    }

    if (q) {
        where[Op.or] = [
            { nombre: { [Op.iLike]: `%${q}%` } },
            { apellido: { [Op.iLike]: `%${q}%` } },
            { empresa: { [Op.iLike]: `%${q}%` } }
        ];
    }

    return models.ComercialLead.findAll({
        where,
        include: [
            { model: models.ComercialLeadStatus, as: 'status' },
            { model: models.ComercialLeadEtapa, as: 'etapa' },
            { model: models.ComercialLeadFuente, as: 'fuente' },
            { model: models.Feder, as: 'responsable' }
        ],
        order: [['onboarding_due_at', 'ASC']]
    });
};
