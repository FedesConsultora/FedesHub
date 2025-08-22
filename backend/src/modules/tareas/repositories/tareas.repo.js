// backend/src/modules/tareas/repositories/tareas.repo.js
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

// ---------- Helpers de existencia / reglas ----------
export const ensureExists = async (model, id, msg='No encontrado') => {
  if (id == null) return null;
  const row = await model.findByPk(id, { attributes: ['id'] });
  if (!row) throw Object.assign(new Error(msg), { status: 404 });
  return row;
};

export const getPuntos = async (impacto_id, urgencia_id) => {
  const [imp, urg] = await Promise.all([
    impacto_id ? models.ImpactoTipo.findByPk(impacto_id, { attributes: ['puntos'] }) : null,
    urgencia_id ? models.UrgenciaTipo.findByPk(urgencia_id, { attributes: ['puntos'] }) : null
  ]);
  return {
    impacto: imp ? imp.puntos : 15,
    urgencia: urg ? urg.puntos : 0
  };
};

export const getClientePonderacion = async (cliente_id) => {
  const row = await sequelize.query(`
    SELECT COALESCE(ct.ponderacion,3) AS ponderacion
    FROM "Cliente" c
    LEFT JOIN "ClienteTipo" ct ON ct.id = c.tipo_id
    WHERE c.id = :id
    LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { id: cliente_id } });
  return row[0]?.ponderacion ?? 3;
};

export const calcPrioridad = (ponderacion, puntosImpacto, puntosUrgencia) =>
  (ponderacion * 100) + (puntosImpacto || 0) + (puntosUrgencia || 0);

// ---- Scoping (básico): si solo_mias=true limita a creador/responsable/colaborador
export const buildListSQL = (params = {}, currentUser) => {
  const {
    q, cliente_id, hito_id, estado_id, responsable_feder_id, colaborador_feder_id,
    etiqueta_id, solo_mias, include_archivadas, vencimiento_from, vencimiento_to,
    orden_by='prioridad', sort='desc', limit=50, offset=0
  } = params;

  const repl = { limit, offset };
  const where = [];

  let sql = `
    SELECT
      t.id, t.titulo, t.descripcion, t.cliente_id, t.hito_id,
      t.estado_id, te.codigo AS estado_codigo, te.nombre AS estado_nombre,
      t.impacto_id, it.puntos AS impacto_puntos, t.urgencia_id, ut.puntos AS urgencia_puntos,
      t.prioridad_num, t.vencimiento, t.fecha_inicio, t.is_archivada,
      t.progreso_pct, t.orden_kanban, t.created_at, t.updated_at,
      c.nombre AS cliente_nombre,
      h.nombre AS hito_nombre,
      (SELECT json_agg(json_build_object('feder_id',tr.feder_id,'es_lider',tr.es_lider))
         FROM "TareaResponsable" tr WHERE tr.tarea_id = t.id) AS responsables,
      (SELECT json_agg(json_build_object('etiqueta_id',tea.etiqueta_id))
         FROM "TareaEtiquetaAsig" tea WHERE tea.tarea_id = t.id) AS etiquetas,
      EXISTS(SELECT 1 FROM "TareaFavorito" tf WHERE tf.tarea_id=t.id AND tf.user_id=:uid) AS is_favorita,
      EXISTS(SELECT 1 FROM "TareaSeguidor" ts WHERE ts.tarea_id=t.id AND ts.user_id=:uid) AS is_seguidor
    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id = t.estado_id
    LEFT JOIN "ImpactoTipo" it ON it.id = t.impacto_id
    LEFT JOIN "UrgenciaTipo" ut ON ut.id = t.urgencia_id
    LEFT JOIN "Cliente" c ON c.id = t.cliente_id
    LEFT JOIN "ClienteHito" h ON h.id = t.hito_id
  `;

  repl.uid = currentUser?.id ?? 0;

  if (q) { where.push(`(t.titulo ILIKE :q OR COALESCE(t.descripcion,'') ILIKE :q)`); repl.q = `%${q}%`; }
  if (cliente_id) { where.push(`t.cliente_id = :cliente_id`); repl.cliente_id = cliente_id; }
  if (hito_id) { where.push(`t.hito_id = :hito_id`); repl.hito_id = hito_id; }
  if (estado_id) { where.push(`t.estado_id = :estado_id`); repl.estado_id = estado_id; }
  if (include_archivadas !== true) where.push(`t.is_archivada = false`);
  if (vencimiento_from) { where.push(`t.vencimiento >= :vfrom`); repl.vfrom = vencimiento_from; }
  if (vencimiento_to) { where.push(`t.vencimiento <= :vto`); repl.vto = vencimiento_to; }
  if (responsable_feder_id) { where.push(`EXISTS (SELECT 1 FROM "TareaResponsable" xr WHERE xr.tarea_id=t.id AND xr.feder_id=:rf)`); repl.rf = responsable_feder_id; }
  if (colaborador_feder_id) { where.push(`EXISTS (SELECT 1 FROM "TareaColaborador" xc WHERE xc.tarea_id=t.id AND xc.feder_id=:cf)`); repl.cf = colaborador_feder_id; }
  if (etiqueta_id) { where.push(`EXISTS (SELECT 1 FROM "TareaEtiquetaAsig" xe WHERE xe.tarea_id=t.id AND xe.etiqueta_id=:et)`); repl.et = etiqueta_id; }

  if (solo_mias === true && currentUser) {
    const fid = currentUser.feder_id || -1;
    repl.fid = fid; repl.uid2 = currentUser.id;
    where.push(`(
      t.creado_por_feder_id = :fid
      OR EXISTS (SELECT 1 FROM "TareaResponsable" xr WHERE xr.tarea_id=t.id AND xr.feder_id=:fid)
      OR EXISTS (SELECT 1 FROM "TareaColaborador" xc WHERE xc.tarea_id=t.id AND xc.feder_id=:fid)
      OR EXISTS (SELECT 1 FROM "TareaSeguidor" xs WHERE xs.tarea_id=t.id AND xs.user_id=:uid2)
    )`);
  }

  if (where.length) sql += ` WHERE ${where.join(' AND ')}\n`;

  const orderCol = orden_by === 'vencimiento' ? 't.vencimiento'
                  : orden_by === 'created_at' ? 't.created_at'
                  : 't.prioridad_num';
  sql += ` ORDER BY ${orderCol} ${sort.toUpperCase()} NULLS LAST, t.id DESC LIMIT :limit OFFSET :offset`;

  return { sql, repl };
};

export const listTasks = async (params, currentUser) => {
  const { sql, repl } = buildListSQL(params, currentUser);
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const countTasks = async (params, currentUser) => {
  const { sql, repl } = buildListSQL({ ...params, limit: 1, offset: 0 }, currentUser);
  const countSql = `SELECT COUNT(*)::int AS cnt FROM (${sql.replace(/LIMIT :limit OFFSET :offset/,'')}) q`;
  const rows = await sequelize.query(countSql, { type: QueryTypes.SELECT, replacements: repl });
  return rows[0]?.cnt ?? 0;
};

export const getTaskById = async (id, currentUser) => {
  const rows = await sequelize.query(`
    SELECT
      t.*,
      te.codigo AS estado_codigo, te.nombre AS estado_nombre,
      it.puntos AS impacto_puntos, ut.puntos AS urgencia_puntos,
      c.id AS cliente_id, c.nombre AS cliente_nombre,
      h.id AS hito_id, h.nombre AS hito_nombre,
      (SELECT json_agg(json_build_object('feder_id',tr.feder_id,'es_lider',tr.es_lider))
         FROM "TareaResponsable" tr WHERE tr.tarea_id=t.id) AS responsables,
      (SELECT json_agg(json_build_object('feder_id',tc.feder_id,'rol',tc.rol,'created_at',tc.created_at))
         FROM "TareaColaborador" tc WHERE tc.tarea_id=t.id) AS colaboradores,
      (SELECT json_agg(json_build_object('id',ti.id,'titulo',ti.titulo,'is_done',ti.is_done,'orden',ti.orden))
         FROM "TareaChecklistItem" ti WHERE ti.tarea_id=t.id ORDER BY ti.orden ASC, ti.id ASC) AS checklist,
      (SELECT json_agg(json_build_object('id',te.id,'codigo',te.codigo,'nombre',te.nombre))
         FROM "TareaEtiquetaAsig" tea
         JOIN "TareaEtiqueta" te ON te.id = tea.etiqueta_id
         WHERE tea.tarea_id=t.id) AS etiquetas,
      (SELECT json_agg(json_build_object(
              'id', cm.id, 'feder_id', cm.feder_id, 'tipo_id', cm.tipo_id, 'contenido', cm.contenido,
              'created_at', cm.created_at, 'updated_at', cm.updated_at,
              'menciones', (SELECT COALESCE(json_agg(m.feder_id), '[]'::json) FROM "TareaComentarioMencion" m WHERE m.comentario_id=cm.id),
              'adjuntos', (SELECT COALESCE(json_agg(json_build_object('id',a.id,'nombre',a.nombre,'mime',a.mime,'drive_url',a.drive_url)), '[]'::json)
                           FROM "TareaAdjunto" a WHERE a.comentario_id=cm.id)
          ))
         FROM "TareaComentario" cm WHERE cm.tarea_id=t.id ORDER BY cm.created_at ASC) AS comentarios,
      (SELECT json_agg(json_build_object('id',a.id,'nombre',a.nombre,'mime',a.mime,'drive_url',a.drive_url,'created_at',a.created_at))
         FROM "TareaAdjunto" a WHERE a.tarea_id=t.id AND a.comentario_id IS NULL) AS adjuntos,
      (SELECT json_agg(json_build_object('id',r.id,'relacionada_id',r.relacionada_id,'tipo_id',r.tipo_id))
         FROM "TareaRelacion" r WHERE r.tarea_id=t.id) AS relaciones,
      EXISTS(SELECT 1 FROM "TareaFavorito" tf WHERE tf.tarea_id=t.id AND tf.user_id=:uid) AS is_favorita,
      EXISTS(SELECT 1 FROM "TareaSeguidor" ts WHERE ts.tarea_id=t.id AND ts.user_id=:uid) AS is_seguidor
    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id=t.estado_id
    LEFT JOIN "ImpactoTipo" it ON it.id=t.impacto_id
    LEFT JOIN "UrgenciaTipo" ut ON ut.id=t.urgencia_id
    LEFT JOIN "Cliente" c ON c.id=t.cliente_id
    LEFT JOIN "ClienteHito" h ON h.id=t.hito_id
    WHERE t.id = :id
    LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { id, uid: currentUser?.id ?? 0 }});
  return rows[0] || null;
};

// ---------- CRUD de Tarea ----------
export const createTask = async (payload, currentFederId) => {
  return sequelize.transaction(async (t) => {
    const {
      cliente_id, hito_id, tarea_padre_id, titulo, descripcion,
      estado_id, requiere_aprobacion=false, impacto_id=2, urgencia_id=4,
      fecha_inicio=null, vencimiento=null
    } = payload;

    await ensureExists(models.Cliente, cliente_id, 'Cliente no encontrado');
    if (hito_id) await ensureExists(models.ClienteHito, hito_id, 'Hito no encontrado');
    if (tarea_padre_id) await ensureExists(models.Tarea, tarea_padre_id, 'Tarea padre no encontrada');

    const [puntos, ponderacion] = await Promise.all([
      getPuntos(impacto_id, urgencia_id),
      getClientePonderacion(cliente_id)
    ]);
    const prioridad_num = calcPrioridad(ponderacion, puntos.impacto, puntos.urgencia);

    // Estado default si no vino: 'pendiente'
    const estado = estado_id || (await models.TareaEstado.findOne({ where: { codigo:'pendiente' }, transaction: t }))?.id;

    const tarea = await models.Tarea.create({
      cliente_id, hito_id, tarea_padre_id, titulo, descripcion,
      estado_id: estado, creado_por_feder_id: currentFederId,
      requiere_aprobacion, aprobacion_estado_id: 1, // no_aplica
      impacto_id, urgencia_id, prioridad_num,
      cliente_ponderacion: ponderacion,
      fecha_inicio, vencimiento
    }, { transaction: t });

    return tarea;
  });
};

export const updateTask = async (id, payload) => {
  return sequelize.transaction(async (t) => {
    const cur = await models.Tarea.findByPk(id, { transaction: t });
    if (!cur) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });

    if (payload.cliente_id) await ensureExists(models.Cliente, payload.cliente_id, 'Cliente no encontrado');
    if (payload.hito_id) await ensureExists(models.ClienteHito, payload.hito_id, 'Hito no encontrado');
    if (payload.tarea_padre_id) await ensureExists(models.Tarea, payload.tarea_padre_id, 'Tarea padre no encontrada');

    // recalcular prioridad si cambian ponderacion/impacto/urgencia/cliente
    let prioridad_num = cur.prioridad_num;
    let cliente_ponderacion = cur.cliente_ponderacion;
    let impacto_id = payload.impacto_id ?? cur.impacto_id;
    let urgencia_id = payload.urgencia_id ?? cur.urgencia_id;

    if (payload.cliente_id || payload.impacto_id || payload.urgencia_id) {
      cliente_ponderacion = await getClientePonderacion(payload.cliente_id ?? cur.cliente_id);
      const pts = await getPuntos(impacto_id, urgencia_id);
      prioridad_num = calcPrioridad(cliente_ponderacion, pts.impacto, pts.urgencia);
    }

    await models.Tarea.update({ ...payload, prioridad_num, cliente_ponderacion }, { where: { id }, transaction: t });
    return models.Tarea.findByPk(id, { transaction: t });
  });
};

export const archiveTask = async (id, archive=true) => {
  await models.Tarea.update({ is_archivada: !!archive }, { where: { id } });
  return { ok: true };
};

// ---------- Responsables / Colaboradores ----------
export const addResponsable = async (tarea_id, feder_id, es_lider=false) => {
  await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada');
  await ensureExists(models.Feder, feder_id, 'Feder no encontrado');
  const row = await models.TareaResponsable.findOrCreate({
    where: { tarea_id, feder_id },
    defaults: { tarea_id, feder_id, es_lider }
  });
  if (!row[0].isNewRecord && row[0].es_lider !== es_lider) {
    row[0].es_lider = es_lider; await row[0].save();
  }
  return row[0];
};

export const removeResponsable = async (tarea_id, feder_id) => {
  await models.TareaResponsable.destroy({ where: { tarea_id, feder_id } });
  return { ok: true };
};

export const addColaborador = async (tarea_id, feder_id, rol=null) => {
  await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada');
  await ensureExists(models.Feder, feder_id, 'Feder no encontrado');
  const [row, created] = await models.TareaColaborador.findOrCreate({
    where: { tarea_id, feder_id },
    defaults: { tarea_id, feder_id, rol }
  });
  if (!created && rol !== undefined) { row.rol = rol; await row.save(); }
  return row;
};

export const removeColaborador = async (tarea_id, feder_id) => {
  await models.TareaColaborador.destroy({ where: { tarea_id, feder_id } });
  return { ok: true };
};

// ---------- Etiquetas ----------
export const assignEtiqueta = async (tarea_id, etiqueta_id) => {
  await Promise.all([
    ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada'),
    ensureExists(models.TareaEtiqueta, etiqueta_id, 'Etiqueta no encontrada')
  ]);
  await models.TareaEtiquetaAsig.findOrCreate({ where: { tarea_id, etiqueta_id }, defaults: { tarea_id, etiqueta_id } });
  return { ok: true };
};

export const unassignEtiqueta = async (tarea_id, etiqueta_id) => {
  await models.TareaEtiquetaAsig.destroy({ where: { tarea_id, etiqueta_id } });
  return { ok: true };
};

// ---------- Checklist ----------
export const listChecklist = (tarea_id) =>
  models.TareaChecklistItem.findAll({ where: { tarea_id }, order: [['orden','ASC'],['id','ASC']] });

export const createChecklistItem = async (tarea_id, titulo) => {
  const max = await models.TareaChecklistItem.max('orden', { where: { tarea_id } });
  return models.TareaChecklistItem.create({ tarea_id, titulo, orden: Number.isFinite(max) ? max + 1 : 1 });
};

export const updateChecklistItem = async (id, patch) => {
  await models.TareaChecklistItem.update(patch, { where: { id } });
  return models.TareaChecklistItem.findByPk(id);
};

export const deleteChecklistItem = async (id) => {
  await models.TareaChecklistItem.destroy({ where: { id } });
  return { ok: true };
};

export const reorderChecklist = async (tarea_id, ordenPairs=[]) =>
  sequelize.transaction(async (t) => {
    for (const { id, orden } of ordenPairs) {
      await models.TareaChecklistItem.update({ orden }, { where: { id, tarea_id }, transaction: t });
    }
    return listChecklist(tarea_id);
  });

// ---------- Comentarios / menciones / adjuntos ----------
export const listComentarios = async (tarea_id) =>
  sequelize.query(`
    SELECT cm.*, f.nombre AS autor_nombre, f.apellido AS autor_apellido, ct.codigo AS tipo_codigo,
           COALESCE((SELECT json_agg(m.feder_id) FROM "TareaComentarioMencion" m WHERE m.comentario_id=cm.id),'[]'::json) AS menciones,
           COALESCE((SELECT json_agg(json_build_object('id',a.id,'nombre',a.nombre,'mime',a.mime,'drive_url',a.drive_url))
                    FROM "TareaAdjunto" a WHERE a.comentario_id=cm.id),'[]'::json) AS adjuntos
    FROM "TareaComentario" cm
    JOIN "Feder" f ON f.id = cm.feder_id
    JOIN "ComentarioTipo" ct ON ct.id = cm.tipo_id
    WHERE cm.tarea_id = :id
    ORDER BY cm.created_at ASC
  `, { type: QueryTypes.SELECT, replacements: { id: tarea_id } });

export const createComentario = async (tarea_id, feder_id, { tipo_id, contenido, menciones=[], adjuntos=[] }) =>
  sequelize.transaction(async (t) => {
    await Promise.all([
      ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada'),
      ensureExists(models.ComentarioTipo, tipo_id, 'Tipo de comentario no encontrado')
    ]);

    const cm = await models.TareaComentario.create({ tarea_id, feder_id, tipo_id, contenido }, { transaction: t });

    if (menciones?.length) {
      const uniq = Array.from(new Set(menciones));
      const rows = uniq.map(feder_id => ({ comentario_id: cm.id, feder_id }));
      await models.TareaComentarioMencion.bulkCreate(rows, { transaction: t, ignoreDuplicates: true });
    }
    if (adjuntos?.length) {
      const rows = adjuntos.map(a => ({ ...a, tarea_id, comentario_id: cm.id, subido_por_feder_id: feder_id }));
      await models.TareaAdjunto.bulkCreate(rows, { transaction: t });
    }
    return cm;
  });

export const addAdjunto = async (tarea_id, feder_id, meta) => {
  await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada');
  return models.TareaAdjunto.create({ ...meta, tarea_id, subido_por_feder_id: feder_id });
};

export const removeAdjunto = async (adjId) => {
  await models.TareaAdjunto.destroy({ where: { id: adjId } });
  return { ok: true };
};

// ---------- Relaciones ----------
export const createRelacion = async (tarea_id, relacionada_id, tipo_id) => {
  await Promise.all([
    ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada'),
    ensureExists(models.Tarea, relacionada_id, 'Tarea relacionada no encontrada'),
    ensureExists(models.TareaRelacionTipo, tipo_id, 'Tipo de relación no encontrado')
  ]);
  const [row] = await models.TareaRelacion.findOrCreate({ where: { tarea_id, relacionada_id, tipo_id }, defaults: { tarea_id, relacionada_id, tipo_id }});
  return row;
};

export const deleteRelacion = async (tarea_id, relId) => {
  await models.TareaRelacion.destroy({ where: { id: relId, tarea_id } });
  return { ok: true };
};

// ---------- Favoritos / Seguidores ----------
export const setFavorito = async (tarea_id, user_id, on) => {
  if (on) await models.TareaFavorito.findOrCreate({ where: { tarea_id, user_id }, defaults: { tarea_id, user_id }});
  else await models.TareaFavorito.destroy({ where: { tarea_id, user_id } });
  return { ok: true };
};

export const setSeguidor = async (tarea_id, user_id, on) => {
  if (on) await models.TareaSeguidor.findOrCreate({ where: { tarea_id, user_id }, defaults: { tarea_id, user_id }});
  else await models.TareaSeguidor.destroy({ where: { tarea_id, user_id } });
  return { ok: true };
};

// ---------- Estado / Aprobación / Kanban ----------
export const setEstado = async (id, estado_id) => {
  await ensureExists(models.TareaEstado, estado_id, 'Estado inválido');
  await models.Tarea.update({ estado_id }, { where: { id } });
  return { ok: true };
};

export const setAprobacion = async (id, aprobacion_estado_id, user_id, rechazo_motivo=null) => {
  await ensureExists(models.TareaAprobacionEstado, aprobacion_estado_id, 'Estado de aprobación inválido');
  const patch = { aprobacion_estado_id, rechazo_motivo: rechazo_motivo ?? null };
  if (aprobacion_estado_id === 3) { patch.aprobado_por_user_id = user_id; patch.aprobado_at = new Date(); }
  if (aprobacion_estado_id === 4) { patch.rechazado_por_user_id = user_id; patch.rechazado_at = new Date(); }
  await models.Tarea.update(patch, { where: { id } });
  return { ok: true };
};

export const moveKanban = async (id, { estado_id, orden_kanban=0 }) => {
  await ensureExists(models.TareaEstado, estado_id, 'Estado inválido');
  await models.Tarea.update({ estado_id, orden_kanban }, { where: { id } });
  return { ok: true };
};
