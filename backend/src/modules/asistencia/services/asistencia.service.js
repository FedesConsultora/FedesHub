// backend/src/modules/asistencia/services/asistencia.service.js
import {
  listOrigenes, listCierreMotivos, getOrigenBy, getCierreMotivoBy,
  listRegistros, countRegistros, getRegistroById, getOpenByFeder,
  createCheckIn, updateCheckOut, adjustRegistro, forceCloseOpenForFeder,
  toggleForFeder, resumenPorPeriodo, ensureFederExists, getFederByUser,
  getModalidadBy, getBulkOpenStatus, timelineRangoRepo, getOverdueOpenRecords
} from '../repositories/asistencia.repo.js';
import { startOfDay, endOfDay } from 'date-fns';
import { logger } from '../../../core/logger.js';

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

export const svcTimelineDia = async ({ fecha, celula_id, feder_id, jornada_min = 480 }) => {
  // día completo (UTC o zona de tu DB):
  const desde = new Date(`${fecha}T00:00:00.000Z`).toISOString();
  const hasta = new Date(`${fecha}T23:59:59.999Z`).toISOString();

  // traemos registros del periodo (ya tenés listRegistros)
  const rows = await listRegistros({ desde, hasta, celula_id, feder_id, order: 'asc', limit: 2000 });

  // Agrupar por feder
  const byFeder = new Map();
  for (const r of rows) {
    if (!byFeder.has(r.feder_id)) {
      byFeder.set(r.feder_id, {
        feder_id: r.feder_id,
        feder_nombre: r.feder_nombre,
        feder_apellido: r.feder_apellido,
        bloques: []
      });
    }
    const start = new Date(r.check_in_at);
    const end = r.check_out_at ? new Date(r.check_out_at) : null;

    // recortar al día
    const dayStart = new Date(`${fecha}T00:00:00.000Z`);
    const dayEnd = new Date(`${fecha}T24:00:00.000Z`);
    const s = new Date(Math.max(dayStart.getTime(), start.getTime()));
    const e = new Date(Math.min(dayEnd.getTime(), (end ?? new Date()).getTime()));
    if (e > s) {
      const minutes = Math.round((e - s) / 60000);
      byFeder.get(r.feder_id).bloques.push({
        id: r.id,
        start: s.toISOString(),
        end: e.toISOString(),
        minutes,
        abierto: !r.check_out_at,
        cierre_motivo_codigo: r.cierre_motivo_codigo
      });
    }
  }

  // Resumen por persona (progreso a la jornada objetivo)
  const out = [];
  for (const v of byFeder.values()) {
    const worked = v.bloques.reduce((acc, b) => acc + b.minutes, 0);
    out.push({
      ...v,
      resumen: {
        jornada_min,                // objetivo (default 8h = 480)
        worked_min: worked,
        remaining_min: Math.max(0, jornada_min - worked),
        pct: Math.min(1, worked / jornada_min)
      }
    });
  }

  // Orden por apellido, nombre
  out.sort((a, b) => {
    const A = `${a.feder_apellido} ${a.feder_nombre}`.toLowerCase();
    const B = `${b.feder_apellido} ${b.feder_nombre}`.toLowerCase();
    return A.localeCompare(B);
  });

  return { fecha, jornada_min, items: out };
};

export const svcTimelineRango = async (params) => {
  const desde = startOfDay(new Date(params.desde))
  const hasta = endOfDay(new Date(params.hasta))

  const items = await timelineRangoRepo({
    ...params,
    desde,
    hasta,
  })

  return { items }
}


// Bulk status for attendance badges
export const svcBulkStatus = async (federIds = []) => {
  const rows = await getBulkOpenStatus(federIds);
  // Transform to map: { feder_id: { modalidad_codigo, check_in_at } }
  const result = {};
  for (const r of rows) {
    result[r.feder_id] = {
      modalidad_codigo: r.modalidad_codigo,
      check_in_at: r.check_in_at
    };
  }
  return result;
};

// ================== Auto-close overdue records ==================
/**
 * Cierra automáticamente registros que deberían haberse cerrado (a las 21:00 o 23:59 según el horario de inicio)
 * Se ejecuta periódicamente desde el job
 */
export const svcAutoCloseOverdueRecords = async () => {
  try {
    // Obtener motivo de cierre y origen automático
    const motivo = await getCierreMotivoBy({ codigo: 'corte_automatico' });
    const origen = await getOrigenBy({ codigo: 'auto' });

    if (!motivo) {
      logger.warn('Auto-close: motivo "corte_automatico" no encontrado en catálogo');
      return { closed: 0, errors: 0 };
    }
    if (!origen) {
      logger.warn('Auto-close: origen "auto" no encontrado en catálogo');
      return { closed: 0, errors: 0 };
    }

    // Obtener registros que necesitan cerrarse
    const overdueRecords = await getOverdueOpenRecords();

    if (overdueRecords.length === 0) {
      logger.debug('Auto-close: no hay registros para cerrar');
      return { closed: 0, errors: 0 };
    }

    logger.info({ count: overdueRecords.length }, 'Auto-close: procesando registros vencidos');

    let closed = 0;
    let errors = 0;

    // Cerrar cada registro según su horario de corte (21:00 o 23:59)
    for (const record of overdueRecords) {
      try {
        await updateCheckOut(record.id, {
          check_out_at: record.cutoff_time,
          check_out_origen_id: origen.id,
          cierre_motivo_id: motivo.id,
          comentario: 'Cerrado automáticamente por el sistema'
        });
        closed++;
        logger.debug({
          registro_id: record.id,
          feder_id: record.feder_id,
          check_in_at: record.check_in_at,
          check_out_at: record.cutoff_time
        }, 'Auto-close: registro cerrado');
      } catch (err) {
        errors++;
        logger.error({
          err,
          registro_id: record.id,
          feder_id: record.feder_id
        }, 'Auto-close: error al cerrar registro');
      }
    }

    logger.info({ closed, errors }, 'Auto-close: proceso completado');
    return { closed, errors };
  } catch (err) {
    logger.error({ err }, 'Auto-close: error general en el proceso');
    throw err;
  }
};
