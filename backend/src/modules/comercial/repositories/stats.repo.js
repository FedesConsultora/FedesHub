// backend/src/modules/comercial/repositories/stats.repo.js
import { initModels } from '../../../models/registry.js';
import { Op, fn, col, literal } from 'sequelize';
import { getCalendarMonthsOfQuarter, getFiscalMonth } from '../utils/fiscal.js';

const models = await initModels();

export const getPipelineStats = async (filters = {}) => {
    const where = { deleted_at: null };
    if (filters.responsable_feder_id) where.responsable_feder_id = filters.responsable_feder_id;

    return models.ComercialLead.findAll({
        attributes: [
            'etapa_id',
            [fn('COUNT', col('ComercialLead.id')), 'count']
        ],
        where,
        include: [{ model: models.ComercialLeadEtapa, as: 'etapa', attributes: ['nombre', 'color', 'orden'] }],
        group: ['etapa_id', 'etapa.id'],
        order: [[col('etapa.orden'), 'ASC']]
    });
};

export const getQuotedGauge = async (eecc_id, q, filters = {}) => {
    // 1. Objetivo de presupuestación del Q
    const objective = await models.ComercialObjetivoQ.findOne({
        where: { eecc_id, q }
    });

    // 2. Suma de presupuesto_ars de leads que pasaron por etapa 'presupuesto'
    // Incluimos presupuesto, negociacion y cerrado para que no se pierda el dato del "presupuestado" al avanzar
    const whereLead = {
        deleted_at: null,
        presupuesto_ars: { [Op.gt]: 0 }
    };
    if (filters.responsable_feder_id) whereLead.responsable_feder_id = filters.responsable_feder_id;

    const etapasRel = await models.ComercialLeadEtapa.findAll({
        where: { codigo: { [Op.in]: ['presupuesto', 'negociacion', 'cierre'] } }
    });
    const etapaIds = etapasRel.map(e => e.id);

    if (etapaIds.length > 0) {
        whereLead.etapa_id = { [Op.in]: etapaIds };
    }

    const actual = await models.ComercialLead.sum('presupuesto_ars', { where: whereLead });

    return {
        objective: parseFloat(objective?.monto_presupuestacion_ars || 0),
        actual: parseFloat(actual || 0)
    };
};

export const getMonthlyBillingVsGoal = async (eecc_id, qMonths, filters = {}) => {
    // Nombres de meses en español
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const eecc = await models.ComercialEECC.findByPk(eecc_id);
    const startMonth = eecc ? new Date(eecc.start_at).getUTCMonth() + 1 : 1;

    const results = await Promise.all(qMonths.map(async (m) => {
        const objective = await models.ComercialObjetivoMes.findOne({
            where: { eecc_id, mes_calendario: m }
        });

        const fMonth = getFiscalMonth(m, startMonth);

        const actualResult = await models.ComercialVentaLinea.findOne({
            attributes: [[fn('SUM', col('precio_neto_snapshot')), 'total']],
            include: [{
                model: models.ComercialVenta,
                as: 'venta',
                attributes: [],
                where: { eecc_id, mes_fiscal: fMonth },
                include: [{
                    model: models.ComercialLead,
                    as: 'lead',
                    attributes: [],
                    where: filters.responsable_feder_id ? { responsable_feder_id: filters.responsable_feder_id } : {}
                }]
            }],
            raw: true
        });

        return {
            month: m,
            label: monthNames[m - 1] || `Mes ${m}`,
            objective: parseFloat(objective?.total_objetivo_ars || 0),
            actual: parseFloat(actualResult?.total || 0)
        };
    }));

    return results;
};

export const getQuarterlySummary = async (eecc_id, q, filters = {}) => {
    const summary = await models.ComercialVentaLinea.findOne({
        attributes: [
            [fn('SUM', col('precio_bruto_snapshot')), 'pac'],
            [fn('SUM', col('bonificado_ars')), 'bon'],
            [fn('SUM', col('precio_neto_snapshot')), 'net']
        ],
        include: [{
            model: models.ComercialVenta,
            as: 'venta',
            attributes: [],
            where: { eecc_id, q },
            include: [{
                model: models.ComercialLead,
                as: 'lead',
                attributes: [],
                where: filters.responsable_feder_id ? { responsable_feder_id: filters.responsable_feder_id } : {}
            }]
        }],
        raw: true
    });

    const eecc = await models.ComercialEECC.findByPk(eecc_id);
    const startMonth = eecc ? new Date(eecc.start_at).getUTCMonth() + 1 : 1;
    const qMonths = getCalendarMonthsOfQuarter(q, startMonth);
    const objectiveQ = await models.ComercialObjetivoMes.sum('total_objetivo_ars', {
        where: { eecc_id, mes_calendario: { [Op.in]: qMonths } }
    });

    const capRow = await models.ComercialDescuentoCap.findOne({
        where: { eecc_id, q }
    });

    return {
        pac: parseFloat(summary?.pac || 0),
        bon: parseFloat(summary?.bon || 0),
        net: parseFloat(summary?.net || 0),
        objective: parseFloat(objectiveQ || 0),
        discount_cap: parseFloat(capRow?.monto_maximo_ars || 0)
    };
};

export const getHistoricalSales = async (limitMonths = 12) => {
    return models.ComercialVentaLinea.findAll({
        attributes: [
            [fn('DATE_TRUNC', 'month', col('venta.fecha_venta')), 'month'],
            [fn('SUM', col('precio_neto_snapshot')), 'total']
        ],
        include: [{ model: models.ComercialVenta, as: 'venta', attributes: [] }],
        group: [literal('DATE_TRUNC(\'month\', "venta"."fecha_venta")')],
        order: [[literal('DATE_TRUNC(\'month\', "venta"."fecha_venta")'), 'DESC']],
        limit: limitMonths
    });
};

export const getEeccStackedStats = async (eecc_id) => {
    const qs = [1, 2, 3, 4];
    const results = await Promise.all(qs.map(async (qNum) => {
        const stats = await models.ComercialVentaLinea.findOne({
            attributes: [
                [fn('SUM', col('precio_neto_snapshot')), 'net'],
                [fn('SUM', col('bonificado_ars')), 'bon']
            ],
            include: [{
                model: models.ComercialVenta,
                as: 'venta',
                where: { eecc_id, q: qNum },
                attributes: []
            }],
            raw: true
        });

        const eecc = await models.ComercialEECC.findByPk(eecc_id);
        const startMonth = eecc ? new Date(eecc.start_at).getUTCMonth() + 1 : 1;
        const qMonths = getCalendarMonthsOfQuarter(qNum, startMonth);

        const objectiveQ = await models.ComercialObjetivoMes.sum('total_objetivo_ars', {
            where: { eecc_id, mes_calendario: { [Op.in]: qMonths } }
        });

        return {
            q: qNum,
            net: parseFloat(stats?.net || 0),
            bon: parseFloat(stats?.bon || 0),
            objective: parseFloat(objectiveQ || 0)
        };
    }));

    return results;
};
