// backend/src/modules/mantenimiento/controllers/mantenimiento.controller.js
import {
    svcExportClientes,
    svcImportClientes,
    svcExportTareas,
    svcImportTareas
} from '../services/mantenimiento.service.js';

export const exportClientes = async (req, res, next) => {
    try {
        const data = await svcExportClientes();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=fhub-clientes.json');
        res.send(JSON.stringify(data, null, 2));
    } catch (e) {
        next(e);
    }
};

export const importClientes = async (req, res, next) => {
    try {
        if (!req.file) throw Object.assign(new Error('Falta archivo'), { status: 400 });
        const json = JSON.parse(req.file.buffer.toString());
        const result = await svcImportClientes(json);
        res.json(result);
    } catch (e) {
        next(e);
    }
};

export const exportTareas = async (req, res, next) => {
    try {
        const data = await svcExportTareas();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=fhub-tareas.json');
        res.send(JSON.stringify(data, null, 2));
    } catch (e) {
        next(e);
    }
};

export const importTareas = async (req, res, next) => {
    try {
        if (!req.file) throw Object.assign(new Error('Falta archivo'), { status: 400 });
        const json = JSON.parse(req.file.buffer.toString());
        const result = await svcImportTareas(json);
        res.json(result);
    } catch (e) {
        next(e);
    }
};
