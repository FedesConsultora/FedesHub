// backend/src/modules/comercial/controllers/lead.controller.js
import * as leadSvc from '../services/lead.service.js';
import { svcImportLeads } from '../services/import.service.js';

export const listLeads = async (req, res) => {
    try {
        const data = await leadSvc.svcListLeads(req.query);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getLead = async (req, res) => {
    try {
        const data = await leadSvc.svcGetLead(req.params.id);
        if (!data) return res.status(404).json({ error: 'Lead no encontrado' });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const createLead = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await leadSvc.svcCreateLead(req.body, userId);
        res.status(201).json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateLead = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await leadSvc.svcUpdateLead(req.params.id, req.body, userId);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteLead = async (req, res) => {
    try {
        const userId = req.user.id;
        await leadSvc.svcDeleteLead(req.params.id, userId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const listTrash = async (req, res) => {
    try {
        const data = await leadSvc.svcListTrash();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const restoreLead = async (req, res) => {
    try {
        const userId = req.user.id;
        await leadSvc.svcRestoreLead(req.params.id, userId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const addNota = async (req, res) => {
    try {
        const userId = req.user.id;
        const { contenido } = req.body;
        const files = req.files || []; // Viene de multer .any() o .array()
        const data = await leadSvc.svcAddNota(req.params.id, contenido, userId, files);
        res.status(201).json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const winNegotiation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { ruta, onboardingData } = req.body;
        const data = await leadSvc.svcNegociacionGanada(req.params.id, ruta, onboardingData, userId);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const loseNegotiation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { motivo_id, comentario } = req.body;
        const data = await leadSvc.svcNegociacionPerdida(req.params.id, motivo_id, comentario, userId);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const resolveOnboarding = async (req, res) => {
    try {
        const userId = req.user.id;
        const { decision, data } = req.body;
        const result = await leadSvc.svcResolveOnboardingVencido(req.params.id, decision, data, userId);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const importLeads = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
        const userId = req.user.id;

        let mapping = null;
        if (req.body.mapping) {
            try {
                mapping = JSON.parse(req.body.mapping);
            } catch (e) {
                console.error("Error parsing import mapping:", e);
            }
        }

        const result = await svcImportLeads(req.file.buffer, userId, mapping);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getCatalogs = async (req, res) => {
    try {
        const catalogs = await leadSvc.svcGetCatalogs();
        res.json(catalogs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const listOnboarding = async (req, res) => {
    try {
        const data = await leadSvc.svcListOnboarding(req.query);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
