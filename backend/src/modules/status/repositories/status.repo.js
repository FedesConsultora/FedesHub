// backend/src/modules/status/repositories/status.repo.js
import { initModels } from '../../../models/registry.js';
import { Op } from 'sequelize';

const m = await initModels();

export async function getCustomStatuses(user_id) {
    return await m.UserStatusPersonalizado.findAll({
        where: { user_id },
        order: [['created_at', 'ASC']]
    });
}

export async function countCustomStatuses(user_id) {
    return await m.UserStatusPersonalizado.count({ where: { user_id } });
}

export async function createCustomStatus(data) {
    return await m.UserStatusPersonalizado.create(data);
}

export async function updateCustomStatus(id, user_id, data) {
    return await m.UserStatusPersonalizado.update(data, { where: { id, user_id } });
}

export async function deleteCustomStatus(id, user_id) {
    return await m.UserStatusPersonalizado.destroy({ where: { id, user_id } });
}

export async function getFederWithStatus(feder_id) {
    return await m.Feder.findByPk(feder_id, {
        include: [
            { model: m.UserStatusPersonalizado, as: 'currentStatusCustom' },
            {
                model: m.User,
                as: 'user',
                attributes: ['id', 'email']
            }
        ]
    });
}

export async function updateFederStatus(user_id, statusData) {
    return await m.Feder.update(statusData, { where: { user_id } });
}

export async function getActiveAbsence(feder_id) {
    const now = new Date();
    // Buscamos el ID del estado 'aprobada' para no hardcodearlo
    const approvedState = await m.AusenciaEstado.findOne({ where: { codigo: 'aprobada' } });
    if (!approvedState) return null;

    return await m.Ausencia.findOne({
        where: {
            feder_id,
            estado_id: approvedState.id,
            fecha_desde: { [Op.lte]: now },
            fecha_hasta: { [Op.gte]: now }
        },
        include: [{ model: m.AusenciaTipo, as: 'tipo' }]
    });
}
