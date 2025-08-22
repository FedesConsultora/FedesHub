// /backend/src/modules/ausencias/services/ausencias.service.js
import {
  listUnidades, listEstados, listMitadDia,
  listTipos, createTipo, updateTipo, getTipoBy,
  assignCuota, listCuotas, saldoPorTipo,
  listAusencias, getAusenciaById, createAusencia, updateAusencia,
  aprobarAusenciaConConsumo, getEstadoByCodigo, getFederByUser, ensureFeder
} from './repositories/ausencias.repo.js';

const WORKDAY_HOURS = Number(process.env.WORKDAY_HOURS ?? 8);

const parseDaysInclusive = (d1, d2) => {
  const a = new Date(`${d1}T00:00:00Z`);
  const b = new Date(`${d2}T00:00:00Z`);
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / 86400000) + 1; // inclusive
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

export const cuotasList = (q) => listCuotas(q);
export const saldoTipos = (q) => saldoPorTipo(q);

// ===== Ausencias =====
export const ausList = (q) => listAusencias(q);
export const ausDetail = (id) => getAusenciaById(id);

const buildPayloadSolicitud = async ({ feder_id, tipo_id, tipo_codigo, fecha_desde, fecha_hasta, es_medio_dia, mitad_dia_id, duracion_horas, motivo }) => {
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
      const days = parseDaysInclusive(fecha_desde, fecha_hasta);
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

  // Calcular requerido
  let requerido = 0;
  if (row.unidad_codigo === 'dia') {
    const days = parseDaysInclusive(row.fecha_desde, row.fecha_hasta);
    requerido = row.es_medio_dia ? 0.5 : days;
  } else { // 'hora'
    requerido = Number(row.duracion_horas ?? 0);
    if (requerido <= 0) requerido = WORKDAY_HOURS; // fallback
  }

  return aprobarAusenciaConConsumo({
    ausencia_id: id,
    aprobado_por_user_id: user_id,
    requerido,
    unidad_codigo: row.unidad_codigo
  });
};

export const ausReject = async (id, { denegado_motivo, comentario_admin }) => {
  const row = await ausDetail(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo ausencias pendientes pueden rechazarse'), { status: 409 });
  const den = await getEstadoByCodigo('denegada');
  return updateAusencia(id, { estado_id: den.id, denegado_motivo: denegado_motivo ?? null, comentario_admin: comentario_admin ?? null });
};

export const ausCancel = async (id) => {
  const row = await ausDetail(id);
  if (!row) throw Object.assign(new Error('Ausencia no encontrada'), { status: 404 });
  const pend = await getEstadoByCodigo('pendiente');
  if (row.estado_id !== pend.id) throw Object.assign(new Error('Sólo ausencias pendientes pueden cancelarse'), { status: 409 });
  const can = await getEstadoByCodigo('cancelada');
  return updateAusencia(id, { estado_id: can.id });
};

// ===== Solicitud de Asignación (cuota extra) =====
export const asignacionSolicitudCreateSvc = async (body, meUserId) => {
  const { feder_id, tipo_id, tipo_codigo, unidad_id, unidad_codigo, cantidad_solicitada, vigencia_desde, vigencia_hasta, motivo } = body;
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

  const row = await (await initModels()).AusenciaAsignacionSolicitud.create({
    feder_id: fid,
    tipo_id: tipo.id,
    unidad_id: unidad.id,
    cantidad_solicitada,
    vigencia_desde,
    vigencia_hasta,
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
    SELECT s.*, e.codigo AS estado_codigo, t.nombre AS tipo_nombre, u.codigo AS unidad_codigo
    FROM "AusenciaAsignacionSolicitud" s
    JOIN "AusenciaEstado" e ON e.id = s.estado_id
    JOIN "AusenciaTipo" t ON t.id = s.tipo_id
    JOIN "AusenciaUnidadTipo" u ON u.id = s.unidad_id
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
