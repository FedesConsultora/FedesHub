import * as repo from '../repositories/admin_comercial.repo.js';
import { getFiscalStatus, getCalendarMonthsOfQuarter } from '../utils/fiscal.js';

// EECC
export const svcListEECC = () => repo.listEECC();
export const svcCreateEECC = (data) => repo.createEECC(data);
export const svcUpdateEECC = (id, data) => repo.updateEECC(id, data);
export const svcDeleteEECC = (id) => repo.deleteEECC(id);

// Products
export const svcListProductos = () => repo.listProductos();
export const svcCreateProducto = (data) => repo.createProducto(data);
export const svcUpdateProducto = (id, data) => repo.updateProducto(id, data);
export const svcDeleteProducto = (id) => repo.deleteProducto(id);

// Discounts
export const svcListDescuentos = () => repo.listDescuentos();
export const svcCreateDescuento = (data) => repo.createDescuento(data);
export const svcUpdateDescuento = (id, data) => repo.updateDescuento(id, data);
export const svcDeleteDescuento = (id) => repo.deleteDescuento(id);

// Objectives
export const svcListObjetivos = async (eecc_id) => {
    const q = await repo.listObjetivosQ(eecc_id);
    const mes = await repo.listObjetivosMes(eecc_id);
    const caps = await repo.listDescuentoCaps(eecc_id);
    return { q, mes, caps };
};

export const svcUpsertObjetivoQ = (data) => repo.upsertObjetivoQ(data);

export const svcUpsertObjetivoMes = async (data) => {
    // Buscar productos para snapshots
    const products = await repo.listProductos();
    const onbProd = products.find(p => p.es_onboarding_objetivo);
    const plans = products.filter(p => p.tipo === 'plan');

    const precioOnb = onbProd ? parseFloat(onbProd.precio_actual) : 0;
    const precioPlanProm = plans.length > 0
        ? plans.reduce((acc, p) => acc + parseFloat(p.precio_actual), 0) / plans.length
        : 0;

    const qtyOnb = parseFloat(data.qty_onb_mercado || 0);
    const qtyPlan = parseFloat(data.qty_plan_prom || 0);

    const total = (qtyOnb * precioOnb) + (qtyPlan * precioPlanProm);

    await repo.upsertObjetivoMes({
        ...data,
        precio_onb_mercado_snapshot: precioOnb,
        precio_plan_prom_snapshot: precioPlanProm,
        total_objetivo_ars: total
    });

    // Recalcular objetivos de TODOS los Q y caps para este ejercicio
    const eecc = await repo.getEECCById(data.eecc_id);
    if (eecc) {
        const startMonth = new Date(eecc.start_at).getUTCMonth() + 1;
        // Recalculamos los 4 Qs para que todo esté sincronizado
        await Promise.all([1, 2, 3, 4].map(q => recalculateQObjectives(data.eecc_id, q, startMonth)));
    }

    return true;
};

async function recalculateQObjectives(eecc_id, qNum, startMonth) {
    const months = getCalendarMonthsOfQuarter(qNum, startMonth);

    const allMonthly = await repo.listObjetivosMes(eecc_id);
    const qMonthly = allMonthly.filter(m => months.includes(Number(m.mes_calendario)));

    // El usuario pide base: "unidades de onboarding de todo el Q multiplicado por 3"
    const totalOnboardingQ = qMonthly.reduce((acc, m) => {
        const montoOnb = parseFloat(m.qty_onb_mercado || 0) * parseFloat(m.precio_onb_mercado_snapshot || 0);
        return acc + montoOnb;
    }, 0);

    // Presupuestación Proyectada = Onboarding del Q * 3
    const proyectado = (totalOnboardingQ || 0) * 3;

    // Tope de Descuento = 20% del Proyectado
    const cap = proyectado * 0.2;

    await Promise.all([
        repo.upsertObjetivoQ({
            eecc_id,
            q: qNum,
            monto_presupuestacion_ars: isNaN(proyectado) ? 0 : proyectado
        }),
        repo.upsertDescuentoCap({
            eecc_id,
            q: qNum,
            monto_maximo_ars: isNaN(cap) ? 0 : cap
        })
    ]);
}

export const svcUpsertDescuentoCap = (data) => repo.upsertDescuentoCap(data);
