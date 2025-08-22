// /backend/src/modules/ausencias/controllers/ausencias.controller.js
import {
  catalogQuery, tiposListQuery, tipoCreateSchema, tipoUpdateSchema,
  cuotaAssignSchema, cuotasListQuery, saldoQuery,
  ausListQuery, ausenciaCreateSchema, ausenciaDecisionSchema, ausenciaRechazoSchema,
  asignacionSolicitudCreate, asignacionSolicitudList
} from '../ausencias/validators.js';

import {
  catUnidades, catEstados, catMitadDia, tiposList, tipoCreate, tipoUpdate,
  cuotaAssign, cuotasList, saldoTipos,
  ausList, ausDetail, ausCreate, ausApprove, ausReject, ausCancel,
  asignacionSolicitudCreateSvc, asignacionSolicitudListSvc,
  asignacionSolicitudApproveSvc, asignacionSolicitudDenySvc, asignacionSolicitudCancelSvc,
  meFeder
} from '../ausencias/services/ausencias.service.js';

// Health
export const health = (_req, res) => res.json({ module: 'ausencias', ok: true });

// ==== Catálogos
export const getUnidades = async (_req, res, next) => { try { res.json(await catUnidades()); } catch (e) { next(e); } };
export const getEstados  = async (_req, res, next) => { try { res.json(await catEstados()); } catch (e) { next(e); } };
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
export const getCuotas = async (req, res, next) => {
  try { res.json(await cuotasList(cuotasListQuery.parse(req.query))); } catch (e) { next(e); }
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
