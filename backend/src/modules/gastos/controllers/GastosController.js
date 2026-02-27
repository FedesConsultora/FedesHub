import { GastosService } from '../services/GastosService.js';

const getRoles = (user) => user.roles || [];
const isDirectivo = (user) => getRoles(user).some(r => ['NivelA', 'NivelB', 'Directivo', 'RRHH'].includes(r));
const isGastoManager = (user) => {
    const p = user.perms || user.permisos || [];
    console.log('[DEBUG-GASTOS] User perms:', p);
    console.log('[DEBUG-GASTOS] User roles:', user.roles);
    return p.includes('gastos.manage') || p.includes('*.*');
};

export const getGastos = async (req, res) => {
    try {
        const { user } = req;
        const filters = req.query;
        console.log('[DEBUG-GASTOS] Req query:', filters);
        const isManager = isGastoManager(user);
        console.log('[DEBUG-GASTOS] isManager:', isManager);
        const list = await GastosService.list({
            feder_id: user.feder_id,
            isDirectivo: isManager, // Solo el Manager ve todo
            filters
        });
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getGastoById = async (req, res) => {
    try {
        const { id } = req.params;
        const { user } = req;
        const isManager = isGastoManager(user);
        const gasto = await GastosService.getById(id, {
            feder_id: user.feder_id,
            isDirectivo: isManager // Solo el Manager ve detalles ajenos
        });
        res.json(gasto);
    } catch (error) {
        res.status(error.message === 'Gasto no encontrado' ? 404 : 403).json({ error: error.message });
    }
};

export const createGasto = async (req, res) => {
    try {
        const { user } = req;
        if (!user.feder_id) return res.status(400).json({ error: 'El usuario no tiene un Feder asociado' });

        const files = req.files || [];
        const gasto = await GastosService.create(req.body, user.id, user.feder_id, files);
        res.status(201).json(gasto);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateGasto = async (req, res) => {
    try {
        const { id } = req.params;
        const { user } = req;
        const isManager = isGastoManager(user);
        const gasto = await GastosService.update(id, req.body, user.id, {
            feder_id: user.feder_id,
            isDirectivo: isManager,
            isGastoManager: isManager
        });
        res.json(gasto);
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
};

export const deleteGasto = async (req, res) => {
    try {
        const { id } = req.params;
        const { user } = req;
        const isManager = isGastoManager(user);
        await GastosService.delete(id, {
            feder_id: user.feder_id,
            isDirectivo: isManager,
            isGastoManager: isManager
        });
        res.status(204).send();
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
};

export const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, motivo } = req.body;
        const { user } = req;

        if (!isGastoManager(user)) {
            return res.status(403).json({ error: 'Solo el Responsable de Gastos puede cambiar el estado' });
        }

        const gasto = await GastosService.updateStatus(id, { estado, motivo }, user.id);
        res.json(gasto);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getSummary = async (req, res) => {
    try {
        const { user } = req;
        const isManager = isGastoManager(user);
        const federId = isManager && req.query.feder_id ? req.query.feder_id : user.feder_id;
        const summary = await GastosService.getSummary({
            feder_id: federId,
            isDirectivo: isManager && !req.query.feder_id
        });
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const requestReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const { user } = req;

        if (!isGastoManager(user)) {
            return res.status(403).json({ error: 'Solo el Responsable de Gastos puede solicitar comprobantes' });
        }

        const gasto = await GastosService.requestReceipt(id, user.id);
        res.json(gasto);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
