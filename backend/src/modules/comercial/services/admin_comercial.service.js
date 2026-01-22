// backend/src/modules/comercial/services/admin_comercial.service.js
import * as repo from '../repositories/admin_comercial.repo.js';

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

    return repo.upsertObjetivoMes({
        ...data,
        precio_onb_mercado_snapshot: precioOnb,
        precio_plan_prom_snapshot: precioPlanProm,
        total_objetivo_ars: total
    });
};

export const svcUpsertDescuentoCap = (data) => repo.upsertDescuentoCap(data);
