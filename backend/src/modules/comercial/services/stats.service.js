// backend/src/modules/comercial/services/stats.service.js
import * as statsRepo from '../repositories/stats.repo.js';
import * as adminRepo from '../repositories/admin_comercial.repo.js';
import { getFiscalStatus, getCalendarMonthsOfQuarter } from '../utils/fiscal.js';

export const svcGetDashboardStats = async (filters = {}) => {
    const activeEECC = await adminRepo.getActiveEECC();
    if (!activeEECC) {
        // Si no hay EECC activo, devolvemos lo que podamos (pipeline)
        const pipeline = await statsRepo.getPipelineStats(filters);
        return { pipeline, quotedGauge: null, monthlyBilling: [], quarterlySummary: null, historical: [] };
    }

    const { fiscalQ, startMonth } = getFiscalStatus(new Date(), activeEECC.start_at);
    const qMonths = getCalendarMonthsOfQuarter(fiscalQ, startMonth);

    const [pipeline, quotedGauge, monthlyBilling, quarterlySummary, historical] = await Promise.all([
        statsRepo.getPipelineStats(filters),
        statsRepo.getQuotedGauge(activeEECC.id, fiscalQ, filters),
        statsRepo.getMonthlyBillingVsGoal(activeEECC.id, qMonths, filters),
        statsRepo.getQuarterlySummary(activeEECC.id, fiscalQ, filters),
        statsRepo.getHistoricalSales(6)
    ]);

    return {
        eecc: activeEECC,
        fiscalQ,
        pipeline,
        quotedGauge,
        monthlyBilling,
        quarterlySummary,
        historical
    };
};

export const svcGetEeccStats = async (eecc_id) => {
    return statsRepo.getEeccStackedStats(eecc_id);
};
