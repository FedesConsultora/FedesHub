import {
  listUnidades, listEstados, listMitadDia,
  listTipos, createTipo, updateTipo, getTipoBy, getUnidadBy,
  assignCuota, listCuotas, deleteCuota, saldoPorTipo,
  listAusencias, getAusenciaById, createAusencia, updateAusencia,
  aprobarAusenciaConConsumo, resetAusenciaRepo, getEstadoByCodigo, getFederByUser, ensureFeder,
  isUserRRHH, isUserDirectivo, isUserFede, getUserById
} from '../repositories/ausencias.repo.js';
import { initModels } from '../../../models/registry.js';
import { sequelize } from '../../../core/db.js';
import { QueryTypes } from 'sequelize';
import { feriadosService } from '../../../lib/feriados.service.js';

const WORKDAY_HOURS = Number(process.env.WORKDAY_HOURS ?? 8);

const parseDaysInclusive = async (d1, d2) => {
  const start = new Date(`${d1}T00:00:00Z`);
  const end = new Date(`${d2}T00:00:00Z`);

  // Obtener feriados para los años involucrados
  const years = new Set([start.getUTCFullYear(), end.getUTCFullYear()]);
  const holidays = new Set();
  for (const year of years) {
    try {
      const yearlyHolidays = await feriadosService.getFeriados(year);
      yearlyHolidays.forEach(h => holidays.add(h.fecha));
    } catch (e) {
      // console.error(`[AusenciasService] Error fetching holidays for ${year}:`, e);
    }
  }

  let count = 0;
  let cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0=Sunday, 6=Saturday
    const dateStr = cur.toISOString().split('T')[0];
    const isHoliday = holidays.has(dateStr);

    if (!isWeekend && !isHoliday) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
};

export const catUnidades = () => listUnidades();
export const catEstados = () => listEstados();
export const catMitadDia = () => listMitadDia();
export const tiposList = (q) => listTipos(q);
export const tipoCreate = (body) => createTipo(body);
export const tipoUpdate = (id, patch) => updateTipo(id, patch);

// ===== Saldos / Cuotas =====
export const cuotaAssign = async ({ feder_id, tipo_id, tipo_codigo, unidad_id, unidad_codigo, ...rest }, user_id) => {
  const tipo = await getTipoBy({ id: tipo_id, codigo: tipo_codigo });
  if (!tipo) throw Object.assign(new Error('Tipo inválido'), { status: 400 });

  const unidad = (unidad_id || unidad_codigo)
    ? unidad_id
    : (await getTipoBy({ id: tipo.id })).unidad_id;

  return assignCuota({
    feder_id,
    tipo_id: tipo.id,
    unidad_id: unidad ?? tipo.unidad_id,
    ...rest,
    asignado_por_user_id: user_id
  });
};

export const cuotaAssignBatch = async ({ feder_ids, tipo_id, tipo_codigo, unidad_id, unidad_codigo, ...rest }, user_id) => {
  const tipo = await getTipoBy({ id: tipo_id, codigo: tipo_codigo });
  if (!tipo) throw Object.assign(new Error('Tipo inválido'), { status: 400 });

  const uniId = (unidad_id || unidad_codigo)
    ? unidad_id
    : (await getTipoBy({ id: tipo.id })).unidad_id;

  const results = [];
  for (const fid of feder_ids) {
    results.push(await assignCuota({
      feder_id: fid,
      tipo_id: tipo.id,
      unidad_id: uniId ?? tipo.unidad_id,
      ...rest,
      asignado_por_user_id: user_id
    }));
  }
  return results;
};

export const cuotasList = (q) => listCuotas(q);
export const cuotaDelete = (id) => deleteCuota(id);
export const saldoTipos = (q) => saldoPorTipo(q);

// ===== Ausencias =====
export const ausList = (q) => listAusencias(q);
export const ausDetail = (id) => getAusenciaById(id);

const buildPayloadSolicitud = async ({ feder_id, tipo_id, tipo_codigo, fecha_desde, fecha_hasta, es_medio_dia, mitad_dia_id, duracion_horas, archivo_url, motivo }) => {
  const tipo = await getTipoBy({ id: tipo_id, codigo: tipo_codigo });
  if (!tipo) throw Object.assign(new Error('Tipo inválido'), { status: 400 });

  // Validaciones de fechas
  if (new Date(fecha_hasta) < new Date(fecha_desde)) {
    throw Object.assign(new Error('fecha_hasta no puede ser anterior a fecha_desde'), { status: 400 });
  }

  const estadoPend = await getEstadoByCodigo('pendiente');

  const payload = {
    feder_id,
    tipo_id: tipo.id,
    estado_id: estadoPend.id,
    fecha_desde, fecha_hasta,
    es_medio_dia: !!es_medio_dia,
    mitad_dia_id: es_medio_dia ? (mitad_dia_id ?? null) : null,
    duracion_horas: null,
    archivo_url: archivo_url ?? null,
    motivo: motivo ?? null,
    comentario_admin: null,
    aprobado_por_user_id: null,
    aprobado_at: null,
    denegado_motivo: null,
    creado_at: new Date(),
    actualizado_at: new Date()
  };

  if (tipo.unidad_id && tipo.permite_medio_dia === false && es_medio_dia) {
    throw Object.assign(new Error('Este tipo no permite medio día'), { status: 400 });
  }

  // Unidades
  const unidad = tipo.unidad_id;
  // Buscar código de unidad: 'dia'|'hora'
  // (traemos al vuelo para no propagar la tabla)
  // Como ya usamos cat en list, acá resolvemos con una consulta rápida:
  // Nota: esto no falla si no está, porque el seed lo cargó.
  // eslint-disable-next-line no-unused-vars
  const u = await (async () => {
    const rows = await listUnidades();
    return rows.find(x => x.id === unidad);
  })();

  if (u?.codigo === 'hora') {
    if (!duracion_horas && !es_medio_dia) {
      // Si no pasan horas, calculamos (días * WORKDAY_HOURS).
      const days = await parseDaysInclusive(fecha_desde, fecha_hasta);
      payload.duracion_horas = days * WORKDAY_HOURS;
    } else if (duracion_horas) {
      payload.duracion_horas = Number(duracion_horas);
    } else if (es_medio_dia) {
      // medio día expresado en horas
      payload.duracion_horas = WORKDAY_HOURS / 2;
    }
  }

  return { payload, tipo, unidad_codigo: u?.codigo ?? 'dia' };
};

export const ausCreate = async (body, meUserId) => {
  if (!body.feder_id) {
    const me = await getFederByUser(meUserId);
    if (!me) throw Object.assign(new Error('El usuario no tiene Feder activo'), { status: 404 });
    body.feder_id = me.id;
  }
  await ensureFeder(body.feder_id);

  const { payload } = await buildPayloadSolicitud(body);
  const created = await createAusencia(payload);
  return ausDetail(created.id);
};

export const ausApprove = async (id, user_id) => {
  const row = await ausDetail(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });

  // 🛡️ Reglas de Seguridad
  if (row.user_id === user_id) {
    throw Object.assign(new Error('No puedes aprobar tu propia ausencia'), { status: 403 });
  }

  const requesterIsFede = await isUserFede(row.user_id);
  const approverIsDirectivo = await isUserDirectivo(user_id);
  const approverIsFede = await isUserFede(user_id);

  if (requesterIsFede) {
    // A Fede solo lo pueden aprobar otros Directivos
    if (!approverIsDirectivo) {
      throw Object.assign(new Error('Las ausencias de Federico Chironi sólo pueden ser aprobadas por otros Directivos'), { status: 403 });
    }
  } else {
    const requesterIsRRHH = await isUserRRHH(row.user_id);
    if (requesterIsRRHH) {
      // Al resto de RRHH solo lo aprueba Fede
      if (!approverIsFede) {
        throw Object.assign(new Error('Las ausencias de RRHH sólo pueden ser aprobadas por Federico Chironi'), { status: 403 });
      }
    }
  }

  // Calcular requerido
  let requerido = 0;
  if (row.unidad_codigo === 'dia') {
    const days = await parseDaysInclusive(row.fecha_desde, row.fecha_hasta);
    requerido = row.es_medio_dia ? 0.5 : days;
  } else { // 'hora'
    requerido = Number(row.duracion_horas ?? 0);
    if (requerido <= 0) requerido = WORKDAY_HOURS; // fallback
  }

  const result = await aprobarAusenciaConConsumo({
    ausencia_id: id,
    aprobado_por_user_id: user_id,
    requerido,
    unidad_codigo: row.unidad_codigo
  });

  // 🔔 Notificar
  try {
    const { svcCreate } = await import('../../notificaciones/services/notificaciones.service.js');
    await svcCreate({
      tipo_codigo: 'ausencia_aprobada',
      destinos: [row.user_id],
      data: {
        ausencia_id: id,
        aprobador_id: user_id,
        fecha_desde: row.fecha_desde,
        fecha_hasta: row.fecha_hasta,
        tipo_nombre: row.tipo_nombre,
        unidad_codigo: row.unidad_codigo,
        duracion_horas: row.duracion_horas,
        es_medio_dia: row.es_medio_dia,
        mitad_dia_id: row.mitad_dia_id
      },
      link_url: `/ausencias?date=${row.fecha_desde}`
    }, { id: user_id });
  } catch (e) {
    console.error('Error enviando notificación de ausencia aprobada:', e);
  }

  return result;
};

export const ausReject = async (id, { denegado_motivo, comentario_admin }, user_id) => {
  const row = await ausDetail(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });

  // 🛡️ Reglas de Seguridad (mismas que aprobacion)
  const requesterIsFede = await isUserFede(row.user_id);
  const approverIsDirectivo = await isUserDirectivo(user_id);
  const approverIsFede = await isUserFede(user_id);

  if (requesterIsFede) {
    if (!approverIsDirectivo) {
      throw Object.assign(new Error('Las ausencias de Federico Chironi sólo pueden ser rechazadas por otros Directivos'), { status: 403 });
    }
  } else {
    const requesterIsRRHH = await isUserRRHH(row.user_id);
    if (requesterIsRRHH) {
      if (!approverIsFede) {
        throw Object.assign(new Error('Las ausencias de RRHH sólo pueden ser rechazadas por Federico Chironi'), { status: 403 });
      }
    }
  }

  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo ausencias pendientes pueden rechazarse'), { status: 409 });

  const den = await getEstadoByCodigo('denegada');
  const result = await updateAusencia(id, {
    estado_id: den.id,
    denegado_motivo: denegado_motivo ?? null,
    comentario_admin: comentario_admin ?? null,
    denegado_por_user_id: user_id,
    denegado_at: new Date()
  });

  // 🔔 Notificar
  try {
    const { svcCreate } = await import('../../notificaciones/services/notificaciones.service.js');
    await svcCreate({
      tipo_codigo: 'ausencia_rechazada',
      destinos: [row.user_id],
      data: {
        ausencia_id: id,
        rechazador_id: user_id,
        fecha_desde: row.fecha_desde,
        fecha_hasta: row.fecha_hasta,
        tipo_nombre: row.tipo_nombre,
        motivo: denegado_motivo,
        unidad_codigo: row.unidad_codigo,
        duracion_horas: row.duracion_horas,
        es_medio_dia: row.es_medio_dia,
        mitad_dia_id: row.mitad_dia_id
      },
      link_url: `/ausencias?date=${row.fecha_desde}`
    }, { id: user_id });
  } catch (e) {
    console.error('Error enviando notificación de ausencia rechazada:', e);
  }

  return result;
};

export const ausCancel = async (id) => {
  const row = await ausDetail(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo ausencias pendientes pueden cancelarse'), { status: 409 });
  const can = await getEstadoByCodigo('cancelada');
  return updateAusencia(id, { estado_id: can.id });
};

export const ausUpdateSvc = async (id, body) => {
  const row = await ausDetail(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });

  // Si sólo se está subiendo un archivo, permitimos hacerlo aunque no esté pendiente
  const isOnlyFile = Object.keys(body).length === 1 && body.archivo_url !== undefined;

  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id && !isOnlyFile) {
    throw Object.assign(new Error('Sólo ausencias pendientes pueden editarse por completo'), { status: 409 });
  }

  if (isOnlyFile) {
    return updateAusencia(id, { archivo_url: body.archivo_url });
  }

  const { payload } = await buildPayloadSolicitud({ ...row, ...body });
  return updateAusencia(id, payload);
};

export const ausReset = async (id) => {
  await resetAusenciaRepo(id);
  return ausDetail(id);
};

// ===== Solicitud de Asignación (cuota extra) =====
export const asignacionSolicitudCreateSvc = async (body, meUserId) => {
  const { feder_id, tipo_id, tipo_codigo, unidad_id, unidad_codigo, cantidad_solicitada, vigencia_desde, vigencia_hasta, motivo, archivo_url } = body;
  const fid = feder_id ?? (await (async () => {
    const me = await getFederByUser(meUserId);
    if (!me) throw Object.assign(new Error('El usuario no tiene Feder activo'), { status: 404 });
    return me.id;
  })());
  await ensureFeder(fid);

  const tipo = await getTipoBy({ id: tipo_id, codigo: tipo_codigo });
  if (!tipo) throw Object.assign(new Error('Tipo inválido'), { status: 400 });

  const unidad = await (async () => {
    if (unidad_id || unidad_codigo) return getUnidadBy({ id: unidad_id, codigo: unidad_codigo });
    const rows = await listUnidades();
    return rows.find(x => x.id === tipo.unidad_id);
  })();
  if (!unidad) throw Object.assign(new Error('Unidad inválida'), { status: 400 });

  const pend = await getEstadoByCodigo('pendiente');

  // Si no vienen fechas, default al año actual
  const currentYear = new Date().getFullYear();
  const vDesde = vigencia_desde || `${currentYear}-01-01`;
  const vHasta = vigencia_hasta || `${currentYear}-12-31`;

  const row = await (await initModels()).AusenciaAsignacionSolicitud.create({
    feder_id: fid,
    tipo_id: tipo.id,
    unidad_id: unidad.id,
    cantidad_solicitada,
    vigencia_desde: vDesde,
    vigencia_hasta: vHasta,
    archivo_url: archivo_url ?? null,
    motivo: motivo ?? null,
    estado_id: pend.id
  });

  return row.toJSON();
};

export const asignacionSolicitudListSvc = async ({ feder_id, estado_codigo }) => {
  const repl = {};
  const where = [];
  if (feder_id) { where.push('s.feder_id = :fid'); repl.fid = feder_id; }
  if (estado_codigo) { where.push('e.codigo = :ec'); repl.ec = estado_codigo; }
  const sql = `
    SELECT s.*, e.codigo AS estado_codigo, t.nombre AS tipo_nombre, u.codigo AS unidad_codigo,
           f.nombre AS solicitante_nombre, f.apellido AS solicitante_apellido, f.avatar_url AS solicitante_avatar_url,
           usr.email AS solicitante_email
    FROM "AusenciaAsignacionSolicitud" s
    JOIN "AsignacionSolicitudEstado" e ON e.id = s.estado_id
    JOIN "AusenciaTipo" t ON t.id = s.tipo_id
    JOIN "AusenciaUnidadTipo" u ON u.id = s.unidad_id
    JOIN "Feder" f ON f.id = s.feder_id
    JOIN "User" usr ON usr.id = f.user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY s.created_at DESC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const asignacionSolicitudApproveSvc = async (id, user_id) => {
  const S = (await initModels()).AusenciaAsignacionSolicitud;
  const row = await S.findByPk(id);
  if (!row) throw Object.assign(new Error('Solicitud no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo pendientes pueden aprobarse'), { status: 409 });
  const apr = await getEstadoByCodigo('aprobada');

  await assignCuota({
    feder_id: row.feder_id,
    tipo_id: row.tipo_id,
    unidad_id: row.unidad_id,
    cantidad_total: row.cantidad_solicitada,
    vigencia_desde: row.vigencia_desde,
    vigencia_hasta: row.vigencia_hasta,
    comentario: 'Aprobación de solicitud',
    asignado_por_user_id: user_id
  });

  await row.update({ estado_id: apr.id, aprobado_por_user_id: user_id, aprobado_at: new Date() });
  return row.toJSON();
};

export const asignacionSolicitudDenySvc = async (id, { comentario_admin }) => {
  const S = (await initModels()).AusenciaAsignacionSolicitud;
  const row = await S.findByPk(id);
  if (!row) throw Object.assign(new Error('Solicitud no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo pendientes pueden denegarse'), { status: 409 });
  const den = await getEstadoByCodigo('denegada');
  await row.update({ estado_id: den.id, comentario_admin: comentario_admin ?? null });
  return row.toJSON();
};

export const asignacionSolicitudCancelSvc = async (id) => {
  const S = (await initModels()).AusenciaAsignacionSolicitud;
  const row = await S.findByPk(id);
  if (!row) throw Object.assign(new Error('Solicitud no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo pendientes pueden cancelarse'), { status: 409 });
  const can = await getEstadoByCodigo('cancelada');
  await row.update({ estado_id: can.id });
  return row.toJSON();
};

// ===== “Me” helpers =====
export const meFeder = async (user_id) => {
  const me = await getFederByUser(user_id);
  if (!me) throw Object.assign(new Error('El usuario no tiene Feder activo'), { status: 404 });
  return me;
};

export const svcGetCounts = async (meUserId) => {
  // Contar ausencias pendientes de OTROS (no las mías)
  const [resAus] = await sequelize.query(`
    SELECT COUNT(*)::int as count 
    FROM "Ausencia" a
    JOIN "AusenciaEstado" e ON e.id = a.estado_id
    JOIN "Feder" f ON f.id = a.feder_id
    WHERE e.codigo = 'pendiente'
      AND f.user_id <> :me
  `, { type: QueryTypes.SELECT, replacements: { me: meUserId } });

  const [resAsig] = await sequelize.query(`
    SELECT COUNT(*)::int as count 
    FROM "AusenciaAsignacionSolicitud" s
    JOIN "AsignacionSolicitudEstado" e ON e.id = s.estado_id
    JOIN "Feder" f ON f.id = s.feder_id
    WHERE e.codigo = 'pendiente'
      AND f.user_id <> :me
  `, { type: QueryTypes.SELECT, replacements: { me: meUserId } });

  const aus = resAus?.count || 0;
  const asig = resAsig?.count || 0;

  return {
    total: aus + asig,
    ausencias: aus,
    asignaciones: asig
  };
};
