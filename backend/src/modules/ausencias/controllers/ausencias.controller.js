// /backend/src/modules/ausencias/controllers/ausencias.controller.js
import {
  catalogQuery, tiposListQuery, tipoCreateSchema, tipoUpdateSchema,
  cuotaAssignSchema, cuotaAssignBatchSchema, cuotasListQuery, saldoQuery,
  ausListQuery, ausenciaCreateSchema, ausenciaDecisionSchema, ausenciaRechazoSchema,
  asignacionSolicitudCreate, asignacionSolicitudList
} from '../validators.js';

import {
  catUnidades, catEstados, catMitadDia, tiposList, tipoCreate, tipoUpdate,
  cuotaAssign, cuotaAssignBatch, cuotasList, cuotaDelete, saldoTipos,
  ausList, ausDetail, ausCreate, ausApprove, ausReject, ausCancel, ausUpdateSvc, ausReset,
  asignacionSolicitudCreateSvc, asignacionSolicitudListSvc,
  asignacionSolicitudApproveSvc, asignacionSolicitudDenySvc, asignacionSolicitudCancelSvc,
  meFeder, svcGetCounts
} from '../services/ausencias.service.js';
import { saveUploadedFiles } from '../../../infra/storage/index.js';

// Health
export const health = (_req, res) => res.json({ module: 'ausencias', ok: true });

// ==== Catálogos
export const getUnidades = async (_req, res, next) => { try { res.json(await catUnidades()); } catch (e) { next(e); } };
export const getEstados = async (_req, res, next) => { try { res.json(await catEstados()); } catch (e) { next(e); } };
export const getMitadDia = async (_req, res, next) => { try { res.json(await catMitadDia()); } catch (e) { next(e); } };

export const getTipos = async (req, res, next) => {
  try { res.json(await tiposList(tiposListQuery.parse(req.query))); } catch (e) { next(e); }
};
export const postTipo = async (req, res, next) => {
  try { res.status(201).json(await tipoCreate(tipoCreateSchema.parse(req.body))); } catch (e) { next(e); }
};
export const patchTipo = async (req, res, next) => {
  try { res.json(await tipoUpdate(Number(req.params.id), tipoUpdateSchema.parse(req.body))); } catch (e) { next(e); }
};

// ==== Cuotas y Saldos
export const postCuota = async (req, res, next) => {
  try { res.status(201).json(await cuotaAssign(cuotaAssignSchema.parse(req.body), req.user.id)); } catch (e) { next(e); }
};
export const postCuotaBatch = async (req, res, next) => {
  try { res.status(201).json(await cuotaAssignBatch(cuotaAssignBatchSchema.parse(req.body), req.user.id)); } catch (e) { next(e); }
};
export const getCuotas = async (req, res, next) => {
  try { res.json(await cuotasList(cuotasListQuery.parse(req.query))); } catch (e) { next(e); }
};
export const deleteCuota = async (req, res, next) => {
  try { res.json(await cuotaDelete(Number(req.params.id))); } catch (e) { next(e); }
};
export const getSaldoPorTipo = async (req, res, next) => {
  try { res.json(await saldoTipos(saldoQuery.parse(req.query))); } catch (e) { next(e); }
};
export const getSaldoMe = async (req, res, next) => {
  try {
    const me = await meFeder(req.user.id);
    const q = saldoQuery.parse({ ...req.query, feder_id: me.id });
    res.json(await saldoTipos(q));
  } catch (e) { next(e); }
};

// ==== Ausencias (solicitudes)
export const listAus = async (req, res, next) => {
  try { res.json(await ausList(ausListQuery.parse(req.query))); } catch (e) { next(e); }
};
export const detailAus = async (req, res, next) => {
  try { res.json(await ausDetail(Number(req.params.id))); } catch (e) { next(e); }
};
export const createAus = async (req, res, next) => {
  try { res.status(201).json(await ausCreate(ausenciaCreateSchema.parse(req.body), req.user.id)); } catch (e) { next(e); }
};
export const meCreateAus = async (req, res, next) => {
  try { res.status(201).json(await ausCreate(ausenciaCreateSchema.parse(req.body), req.user.id)); } catch (e) { next(e); }
};
export const approveAus = async (req, res, next) => {
  try { res.json(await ausApprove(Number(req.params.id), req.user.id)); } catch (e) { next(e); }
};
export const rejectAus = async (req, res, next) => {
  try { res.json(await ausReject(Number(req.params.id), ausenciaRechazoSchema.parse(req.body))); } catch (e) { next(e); }
};
export const cancelAus = async (req, res, next) => {
  try { res.json(await ausCancel(Number(req.params.id))); } catch (e) { next(e); }
};
export const updateAus = async (req, res, next) => {
  try { res.json(await ausUpdateSvc(Number(req.params.id), req.body)); } catch (e) { next(e); }
};

export const resetAus = async (req, res, next) => {
  try { res.json(await ausReset(Number(req.params.id))); } catch (e) { next(e); }
};

export const getCounts = async (req, res, next) => {
  try { res.json(await svcGetCounts()); } catch (e) { next(e); }
};

// ==== Solicitudes de Asignación (cupo extra)
export const createAsignacionSolicitud = async (req, res, next) => {
  try { res.status(201).json(await asignacionSolicitudCreateSvc(asignacionSolicitudCreate.parse(req.body), req.user.id)); } catch (e) { next(e); }
};
export const listAsignacionSolicitud = async (req, res, next) => {
  try { res.json(await asignacionSolicitudListSvc(asignacionSolicitudList.parse(req.query))); } catch (e) { next(e); }
};
export const approveAsignacionSolicitud = async (req, res, next) => {
  try { res.json(await asignacionSolicitudApproveSvc(Number(req.params.id), req.user.id)); } catch (e) { next(e); }
};
export const denyAsignacionSolicitud = async (req, res, next) => {
  try { res.json(await asignacionSolicitudDenySvc(Number(req.params.id), ausenciaDecisionSchema.parse(req.body))); } catch (e) { next(e); }
};
export const cancelAsignacionSolicitud = async (req, res, next) => {
  try { res.json(await asignacionSolicitudCancelSvc(Number(req.params.id))); } catch (e) { next(e); }
};

export const postUpload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const saved = await saveUploadedFiles([req.file], ['ausencias', 'adjuntos']);
    const f = saved[0];
    const url = f.webViewLink || f.publicUrl || f.url || f.drive_url || null;
    res.json({ url });
  } catch (e) { next(e); }
};
