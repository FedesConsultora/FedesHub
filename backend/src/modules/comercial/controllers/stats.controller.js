// backend/src/modules/comercial/controllers/stats.controller.js
import * as statsSvc from '../services/stats.service.js';

export const getDashboardStats = async (req, res) => {
    try {
        const stats = await statsSvc.svcGetDashboardStats(req.query);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getEeccStats = async (req, res) => {
    try {
        const stats = await statsSvc.svcGetEeccStats(req.params.id);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
