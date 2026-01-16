// backend/src/modules/status/controllers/status.controller.js
import * as service from '../services/status.service.js';
import * as repo from '../repositories/status.repo.js';

export async function getMyCustomStatuses(req, res) {
    try {
        const statuses = await repo.getCustomStatuses(req.user.id);
        res.json(statuses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function addCustomStatus(req, res) {
    try {
        const status = await service.createCustomStatus(req.user.id, req.body);
        res.status(201).json(status);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function editCustomStatus(req, res) {
    try {
        await repo.updateCustomStatus(req.params.id, req.user.id, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function removeCustomStatus(req, res) {
    try {
        await repo.deleteCustomStatus(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function setCurrentStatus(req, res) {
    try {
        await service.setStatus(req.user.id, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getFederStatus(req, res) {
    try {
        const status = await service.getEffectiveStatus(req.params.feder_id);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
