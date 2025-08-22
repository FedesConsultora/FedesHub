// backend/src/modules/asistencia/services/asistencia.service.js
import {
  listOrigenes, listCierreMotivos, getOrigenBy, getCierreMotivoBy,
  listRegistros, countRegistros, getRegistroById, getOpenByFeder,
  createCheckIn, updateCheckOut, adjustRegistro, forceCloseOpenForFeder,
  toggleForFeder, resumenPorPeriodo, ensureFederExists, getFederByUser,
  getModalidadBy
} from '../repositories/asistencia.repo.js';

const resolveModalidadId = async ({ modalidad_id, modalidad_codigo }) => {
  if (modalidad_id) return modalidad_id;
  if (modalidad_codigo) {
    const m = await getModalidadBy({ codigo: modalidad_codigo });
    if (!m) throw Object.assign(new Error('modalidad_codigo inválido'), { status: 400 });
    return m.id;
  }
  return null;
};

// Catálogos
export const svcCatalogOrigenes = () => listOrigenes();
export const svcCatalogCierreMotivos = () => listCierreMotivos();

// Listado / Detalle
export const svcList = async (q) => {
  const rows = await listRegistros(q);
  const total = await countRegistros(q);
  return { total, rows };
};
export const svcGet = async (id) => {
  const r = await getRegistroById(id);
  if (!r) throw Object.assign(new Error('Registro no encontrado'), { status: 404 });
  return r;
};

export const svcGetOpen = (feder_id) => getOpenByFeder(feder_id);

// Check-in / Check-out
export const svcCheckIn = async ({ feder_id, at, origen_id, origen_codigo, comentario, modalidad_id, modalidad_codigo }) => {
  if (!feder_id) throw Object.assign(new Error('feder_id es requerido'), { status: 400 });
  await ensureFederExists(feder_id);
  const open = await getOpenByFeder(feder_id);
  if (open) throw Object.assign(new Error('Ya existe un registro abierto para este feder'), { status: 409 });

  let origenId = origen_id;
  if (!origenId && origen_codigo) {
    const o = await getOrigenBy({ codigo: origen_codigo });
    if (!o) throw Object.assign(new Error('origen_codigo inválido'), { status: 400 });
    origenId = o.id;
  }
  const modId = await resolveModalidadId({ modalidad_id, modalidad_codigo });
  const when = at ?? new Date().toISOString();

  return createCheckIn({ feder_id, check_in_at: when, check_in_origen_id: origenId, comentario, modalidad_id: modId });
};

export const svcCheckOut = async (id, { at, origen_id, origen_codigo, cierre_motivo_id, cierre_motivo_codigo, comentario }) => {
  let origenId = origen_id;
  if (!origenId && origen_codigo) {
    const o = await getOrigenBy({ codigo: origen_codigo });
    if (!o) throw Object.assign(new Error('origen_codigo inválido'), { status: 400 });
    origenId = o.id;
  }
  let motivoId = cierre_motivo_id;
  if (!motivoId && cierre_motivo_codigo) {
    const m = await getCierreMotivoBy({ codigo: cierre_motivo_codigo });
    if (!m) throw Object.assign(new Error('cierre_motivo_codigo inválido'), { status: 400 });
    motivoId = m.id;
  }
  const when = at ?? new Date().toISOString();
  return updateCheckOut(id, { check_out_at: when, check_out_origen_id: origenId, cierre_motivo_id: motivoId, comentario });
};

export const svcAdjust = async (id, patch) => {
  const modId = await resolveModalidadId(patch);
  const next = { ...patch };
  if (modId) next.modalidad_id = modId;
  delete next.modalidad_codigo;
  return adjustRegistro(id, next);
};

export const svcForceCloseOpen = async (feder_id, { at, cierre_motivo_id, cierre_motivo_codigo, origen_id, origen_codigo, comentario }) => {
  let motivoId = cierre_motivo_id;
  if (!motivoId && cierre_motivo_codigo) {
    const m = await getCierreMotivoBy({ codigo: cierre_motivo_codigo });
    if (!m) throw Object.assign(new Error('cierre_motivo_codigo inválido'), { status: 400 });
    motivoId = m.id;
  }
  let origenId = origen_id;
  if (!origenId && origen_codigo) {
    const o = await getOrigenBy({ codigo: origen_codigo });
    if (!o) throw Object.assign(new Error('origen_codigo inválido'), { status: 400 });
    origenId = o.id;
  }
  if (!motivoId) throw Object.assign(new Error('cierre_motivo_id/codigo es requerido'), { status: 400 });
  const when = at ?? new Date().toISOString();
  return forceCloseOpenForFeder(feder_id, { check_out_at: when, cierre_motivo_id: motivoId, check_out_origen_id: origenId, comentario });
};

// Toggle (Odoo-like)
export const svcToggle = async ({ feder_id, at, origen_id, origen_codigo, modalidad_id, modalidad_codigo }) => {
  const when = at ?? new Date().toISOString();
  const origenId = origen_id || (origen_codigo ? (await getOrigenBy({ codigo: origen_codigo }))?.id : null);
  if (origen_codigo && !origenId) throw Object.assign(new Error('origen_codigo inválido'), { status: 400 });
  const modId = await resolveModalidadId({ modalidad_id, modalidad_codigo });
  return toggleForFeder({ feder_id, at: when, origen_id: origenId, modalidad_id: modId });
};

// Conveniencias "me"
export const svcGetMyFeder = async (user_id) => {
  const f = await getFederByUser(user_id);
  if (!f) throw Object.assign(new Error('El usuario no tiene un Feder activo vinculado'), { status: 404 });
  return f;
};

// Reportes
export const svcResumenPeriodo = (q) => resumenPorPeriodo(q);
