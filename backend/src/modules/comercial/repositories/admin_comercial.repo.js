// backend/src/modules/comercial/repositories/admin_comercial.repo.js
import { initModels } from '../../../models/registry.js';
import { Op } from 'sequelize';

const models = await initModels();

// EECC
export const listEECC = async () => models.ComercialEECC.findAll({ order: [['start_at', 'DESC']] });
export const getEECCById = async (id) => models.ComercialEECC.findByPk(id);
export const createEECC = async (data) => models.ComercialEECC.create(data);
export const updateEECC = async (id, data) => models.ComercialEECC.update(data, { where: { id } });
export const deleteEECC = async (id) => models.ComercialEECC.destroy({ where: { id } });

export const getActiveEECC = async (date = new Date()) => {
    return models.ComercialEECC.findOne({
        where: {
            start_at: { [Op.lte]: date },
            end_at: { [Op.gte]: date }
        }
    });
};

// Products
export const listProductos = async () => models.ComercialProducto.findAll({ order: [['nombre', 'ASC']] });
export const getProductoById = async (id) => models.ComercialProducto.findByPk(id);
export const createProducto = async (data) => models.ComercialProducto.create(data);
export const updateProducto = async (id, data) => models.ComercialProducto.update(data, { where: { id } });
export const deleteProducto = async (id) => models.ComercialProducto.destroy({ where: { id } });

// Discounts
export const listDescuentos = async () => models.ComercialDescuento.findAll({ order: [['valor', 'ASC']] });
export const createDescuento = async (data) => models.ComercialDescuento.create(data);
export const updateDescuento = async (id, data) => models.ComercialDescuento.update(data, { where: { id } });
export const deleteDescuento = async (id) => models.ComercialDescuento.destroy({ where: { id } });

// Objectives
export const listObjetivosQ = async (eecc_id) => models.ComercialObjetivoQ.findAll({ where: { eecc_id }, order: [['q', 'ASC']] });
export const upsertObjetivoQ = async (data) => {
    const { eecc_id, q } = data;
    const exists = await models.ComercialObjetivoQ.findOne({ where: { eecc_id, q } });
    if (exists) return exists.update(data);
    return models.ComercialObjetivoQ.create(data);
};

export const listObjetivosMes = async (eecc_id) => models.ComercialObjetivoMes.findAll({ where: { eecc_id }, order: [['mes_calendario', 'ASC']] });
export const upsertObjetivoMes = async (data) => {
    const { eecc_id, mes_calendario } = data;
    const exists = await models.ComercialObjetivoMes.findOne({ where: { eecc_id, mes_calendario } });
    if (exists) return exists.update(data);
    return models.ComercialObjetivoMes.create(data);
};

// Discount Caps
export const listDescuentoCaps = async (eecc_id) => models.ComercialDescuentoCap.findAll({ where: { eecc_id }, order: [['q', 'ASC']] });
export const upsertDescuentoCap = async (data) => {
    const { eecc_id, q } = data;
    const exists = await models.ComercialDescuentoCap.findOne({ where: { eecc_id, q } });
    if (exists) return exists.update(data);
    return models.ComercialDescuentoCap.create(data);
};
