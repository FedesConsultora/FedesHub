// backend/src/modules/comercial/controllers/admin_comercial.controller.js
import * as service from '../services/admin_comercial.service.js';

// EECC
export const listEECC = async (req, res) => {
    try { res.json(await service.svcListEECC()); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const createEECC = async (req, res) => {
    try { res.json(await service.svcCreateEECC(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const updateEECC = async (req, res) => {
    try { res.json(await service.svcUpdateEECC(req.params.id, req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const deleteEECC = async (req, res) => {
    try { res.json(await service.svcDeleteEECC(req.params.id)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

// Products
export const listProductos = async (req, res) => {
    try { res.json(await service.svcListProductos()); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const createProducto = async (req, res) => {
    try { res.json(await service.svcCreateProducto(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const updateProducto = async (req, res) => {
    try { res.json(await service.svcUpdateProducto(req.params.id, req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const deleteProducto = async (req, res) => {
    try { res.json(await service.svcDeleteProducto(req.params.id)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

// Discounts
export const listDescuentos = async (req, res) => {
    try { res.json(await service.svcListDescuentos()); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const createDescuento = async (req, res) => {
    try { res.json(await service.svcCreateDescuento(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const updateDescuento = async (req, res) => {
    try { res.json(await service.svcUpdateDescuento(req.params.id, req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const deleteDescuento = async (req, res) => {
    try { res.json(await service.svcDeleteDescuento(req.params.id)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

// Objectives
export const listObjetivos = async (req, res) => {
    try { res.json(await service.svcListObjetivos(req.params.eecc_id)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const upsertObjetivoQ = async (req, res) => {
    try { res.json(await service.svcUpsertObjetivoQ(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const upsertObjetivoMes = async (req, res) => {
    try { res.json(await service.svcUpsertObjetivoMes(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

export const upsertDescuentoCap = async (req, res) => {
    try { res.json(await service.svcUpsertDescuentoCap(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
};
