// backend/src/modules/tareas/services/tareas.service.js
// -----------------------------------------------------------------------------
// Servicio de Tareas (autocontenido):
// - Catálogos / Compose (scoping de clientes por celula del usuario, salvo Admin/CLevel)
// - Listado (SQL extendido con filtros, flags, fechas y prioridad) + conteo
// - CRUD de tarea (con prioridad calculada y aprobaciones por defecto)
// - Responsables / Colaboradores
// - Etiquetas
// - Checklist (con recálculo de progreso_pct)
// - Comentarios / Menciones / Adjuntos (tarea y comentario)
// - Relaciones
// - Favoritos / Seguidores
// - Estado / Aprobación / Kanban (finalizada_at cuando corresponde)
// - Exporta funciones svc* consumidas por el controller
// -------------------------------------

import { QueryTypes, Op } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';
import { registrarCambio, TIPO_CAMBIO, ACCION } from '../helpers/historial.helper.js';

const models = await initModels();

// ---------- Helpers de existencia / reglas ----------
const ensureExists = async (model, id, msg = 'No encontrado') => {
  if (id == null) return null;
  const row = await model.findByPk(id, { attributes: ['id'] });
  if (!row) throw Object.assign(new Error(msg), { status: 404 });
  return row;
};

const validateHierarchy = async (id, newParentId) => {
  if (!newParentId) return;
  if (id && Number(id) === Number(newParentId)) {
    throw Object.assign(new Error('Una tarea no puede ser su propio padre.'), { status: 400 });
  }

  // Verificar loops: el nuevo padre no puede ser un descendiente de la tarea actual
  // O más simplemente: si seguimos los padres del nuevo padre, no deberíamos encontrar la tarea actual.
  let currentParentId = newParentId;
  const visited = new Set();

  while (currentParentId) {
    if (id && Number(currentParentId) === Number(id)) {
      throw Object.assign(new Error('Se ha detectado una dependencia circular en la jerarquía.'), { status: 400 });
    }
    if (visited.has(currentParentId)) break; // Seguridad
    visited.add(currentParentId);

    const p = await models.Tarea.findByPk(currentParentId, { attributes: ['tarea_padre_id'] });
    currentParentId = p?.tarea_padre_id;
  }
};

const getPuntos = async (impacto_id, urgencia_id) => {
  const [imp, urg] = await Promise.all([
    impacto_id ? models.ImpactoTipo.findByPk(impacto_id, { attributes: ['puntos'] }) : null,
    urgencia_id ? models.UrgenciaTipo.findByPk(urgencia_id, { attributes: ['puntos'] }) : null
  ]);
  return {
    impacto: imp ? imp.puntos : 15,
    urgencia: urg ? urg.puntos : 0
  };
};
const setResponsableLeader = async (tarea_id, feder_id) => {
  await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada')
  await ensureExists(models.Feder, feder_id, 'Feder no encontrado')

  return sequelize.transaction(async (t) => {
    // 1) setear todos a false
    await models.TareaResponsable.update(
      { es_lider: false },
      { where: { tarea_id }, transaction: t }
    )

    // 2) asegurar fila del feder y marcar como true
    const [row] = await models.TareaResponsable.findOrCreate({
      where: { tarea_id, feder_id },
      defaults: { tarea_id, feder_id, es_lider: true },
      transaction: t
    })
    if (!row.es_lider) { row.es_lider = true; await row.save({ transaction: t }) }

    return { ok: true }
  })
};
const getClientePonderacion = async (cliente_id) => {
  const row = await sequelize.query(`
    SELECT COALESCE(ct.ponderacion,3) AS ponderacion
    FROM "Cliente" c
    LEFT JOIN "ClienteTipo" ct ON ct.id = c.tipo_id
    WHERE c.id = :id
    LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { id: cliente_id } });
  return row[0]?.ponderacion ?? 3;
};

const calcPrioridad = (ponderacion, puntosImpacto, puntosUrgencia) =>
  (ponderacion * 10) + (puntosImpacto || 0);

// --- Contexto de usuario para compose (roles y celula) ---
const getUserContext = async (user) => {
  if (!user) return { roles: new Set(), feder_id: null };
  const u = await models.User.findByPk(user.id, {
    include: [{ model: models.Rol, as: 'roles', attributes: ['nombre'] }]
  });
  const roles = new Set((u?.roles || []).map(r => r.nombre));
  const feder = await models.Feder.findOne({ where: { user_id: user.id }, attributes: ['id'] });
  return { roles, feder_id: feder?.id ?? null };
};

// Helper para verificar nivel de acceso (3 niveles jerárquicos)
const isNivelA = (roles) => roles.has('NivelA'); // Acceso total
const isNivelB = (roles) => roles.has('NivelB'); // Líder

// ---- Scoping y SQL de listado ----
const buildListSQL = (params = {}, currentUser) => {
  const {
    q,
    // unitarios
    cliente_id, hito_id, estado_id, estado_codigo, responsable_feder_id, colaborador_feder_id,
    tarea_padre_id,
    etiqueta_id, impacto_id, urgencia_id, aprobacion_estado_id,
    tipo, // STD, TC, IT
    // TC specific single
    tc_objetivo_negocio_id, tc_objetivo_marketing_id, tc_estado_publicacion_id, tc_inamovible,
    // múltiples
    cliente_ids = [], estado_ids = [], etiqueta_ids = [],
    feder_ids = [],
    // TC specific multi
    tc_red_social_ids = [], tc_formato_ids = [],
    // flags
    solo_mias, include_archivadas, include_finalizadas, is_favorita, is_seguidor,
    solo_leads,
    lead_id,
    // fechas
    vencimiento_from, vencimiento_to,
    inicio_from, inicio_to,
    created_from, created_to,
    updated_from, updated_to,
    finalizada_from, finalizada_to,
    // prioridad
    prioridad_min, prioridad_max,
    // orden/paginación
    orden_by = 'prioridad', sort = 'desc', limit = 50, offset = 0
  } = params;

  const repl = { limit, offset };
  const where = [];

  let sql = `
    SELECT
      t.id, t.titulo, t.descripcion, t.cliente_id, t.hito_id, t.tarea_padre_id,
      t.estado_id, te.codigo AS estado_codigo, te.nombre AS estado_nombre,
      t.impacto_id, it.puntos AS impacto_puntos, t.urgencia_id, ut.puntos AS urgencia_puntos,
      t.aprobacion_estado_id, t.tipo,
      t.prioridad_num, t.boost_manual, t.vencimiento, t.fecha_inicio, t.finalizada_at, t.is_archivada,
      t.progreso_pct, t.created_at, t.updated_at,
      tkp.stage_code AS kanban_stage, tkp.pos AS kanban_orden,
      c.nombre AS cliente_nombre,
      h.nombre AS hito_nombre,
      fa.nombre AS autor_nombre, fa.apellido AS autor_apellido,
      fa.avatar_url AS autor_avatar_url,
      lead.empresa AS lead_empresa, lead.nombre AS lead_nombre,

      -- Datos específicos de TC (si existen)
      (SELECT json_build_object(
                'objetivo_negocio_id', ttc.objetivo_negocio_id,
                'objetivo_marketing_id', ttc.objetivo_marketing_id,
                'estado_publicacion_id', ttc.estado_publicacion_id,
                'inamovible', ttc.inamovible,
                'redes', COALESCE((SELECT json_agg(json_build_object('id', tr.red_social_id, 'nombre', rs.nombre)) FROM "TareaTCRedSocial" tr JOIN "TCRedSocial" rs ON rs.id = tr.red_social_id WHERE tr.tarea_id = t.id), '[]'::json),
                'formatos', COALESCE((SELECT json_agg(json_build_object('id', tf.formato_id, 'nombre', f.nombre)) FROM "TareaTCFormato" tf JOIN "TCFormato" f ON f.id = tf.formato_id WHERE tf.tarea_id = t.id), '[]'::json)
              )
         FROM "TareaTC" ttc
        WHERE ttc.tarea_id = t.id) AS datos_tc,

      -- Responsables con datos del feder
      (SELECT COALESCE(json_agg(
                json_build_object(
                  'feder_id', tr.feder_id,
                  'es_lider', tr.es_lider,
                  'feder', json_build_object(
                    'id', f.id,
                    'user_id', f.user_id,
                    'nombre', f.nombre,
                    'apellido', f.apellido,
                    'avatar_url', f.avatar_url
                  )
                )
              ), '[]'::json)
         FROM "TareaResponsable" tr
         JOIN "Feder" f ON f.id = tr.feder_id
        WHERE tr.tarea_id = t.id) AS responsables,

      -- Colaboradores con datos del feder
      (SELECT COALESCE(json_agg(
                json_build_object(
                  'feder_id', tc.feder_id,
                  'rol', tc.rol,
                  'feder', json_build_object(
                    'id', f.id,
                    'user_id', f.user_id,
                    'nombre', f.nombre,
                    'apellido', f.apellido,
                    'avatar_url', f.avatar_url
                  )
                )
              ), '[]'::json)
         FROM "TareaColaborador" tc
         JOIN "Feder" f ON f.id = tc.feder_id
        WHERE tc.tarea_id = t.id) AS colaboradores,

      (SELECT json_agg(json_build_object('etiqueta_id',tea.etiqueta_id))
         FROM "TareaEtiquetaAsig" tea
        WHERE tea.tarea_id = t.id) AS etiquetas,

      EXISTS(SELECT 1 FROM "TareaFavorito" tf WHERE tf.tarea_id=t.id AND tf.user_id=:uid) AS is_favorita,
      EXISTS(SELECT 1 FROM "TareaSeguidor" ts WHERE ts.tarea_id=t.id AND ts.user_id=:uid) AS is_seguidor

    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id = t.estado_id
    LEFT JOIN "ImpactoTipo" it ON it.id = t.impacto_id
    LEFT JOIN "UrgenciaTipo" ut ON ut.id = t.urgencia_id
    LEFT JOIN "Cliente" c ON c.id = t.cliente_id
    LEFT JOIN "ComercialLead" lead ON lead.id = t.lead_id
    LEFT JOIN "ClienteHito" h ON h.id = t.hito_id
    LEFT JOIN "Feder" fa ON fa.id = t.creado_por_feder_id
    LEFT JOIN "TareaKanbanPos" tkp ON tkp.tarea_id = t.id AND tkp.user_id = :uid
  `;
  repl.uid = currentUser?.id ?? 0;

  // Helper: IN dinámico con placeholders seguros
  const addIn = (column, values, keyPrefix) => {
    if (!values || !values.length) return;
    const keys = values.map((_, i) => `${keyPrefix}${i}`);
    where.push(`${column} IN (${keys.map(k => ':' + k).join(',')})`);
    keys.forEach((k, i) => { repl[k] = values[i]; });
  };

  // Búsqueda
  if (q) {
    where.push(`(t.titulo ILIKE :q OR COALESCE(t.descripcion,'') ILIKE :q OR c.nombre ILIKE :q OR COALESCE(h.nombre,'') ILIKE :q)`);
    repl.q = `%${q}%`;
  }

  // Filtros simples
  if (cliente_id) { where.push(`t.cliente_id = :cliente_id`); repl.cliente_id = cliente_id; }
  if (hito_id) { where.push(`t.hito_id = :hito_id`); repl.hito_id = hito_id; }
  if (estado_id) { where.push(`t.estado_id = :estado_id`); repl.estado_id = estado_id; }
  if (estado_codigo) { where.push(`te.codigo = :estado_codigo`); repl.estado_codigo = estado_codigo; }
  if (tarea_padre_id) { where.push(`t.tarea_padre_id = :parent_id`); repl.parent_id = tarea_padre_id; }
  if (impacto_id) { where.push(`t.impacto_id = :impacto_id`); repl.impacto_id = impacto_id; }
  if (urgencia_id) { where.push(`t.urgencia_id = :urgencia_id`); repl.urgencia_id = urgencia_id; }
  if (aprobacion_estado_id) { where.push(`t.aprobacion_estado_id = :aprob_id`); repl.aprob_id = aprobacion_estado_id; }
  if (tipo) { where.push(`t.tipo = :tipo`); repl.tipo = tipo; }
  if (lead_id) { where.push(`t.lead_id = :lead_id`); repl.lead_id = lead_id; }

  // Filtros TC específicos
  if (tc_objetivo_negocio_id) { where.push(`EXISTS(SELECT 1 FROM "TareaTC" ttc WHERE ttc.tarea_id=t.id AND ttc.objetivo_negocio_id = :ton_id)`); repl.ton_id = tc_objetivo_negocio_id; }
  if (tc_objetivo_marketing_id) { where.push(`EXISTS(SELECT 1 FROM "TareaTC" ttc WHERE ttc.tarea_id=t.id AND ttc.objetivo_marketing_id = :tom_id)`); repl.tom_id = tc_objetivo_marketing_id; }
  if (tc_estado_publicacion_id) { where.push(`EXISTS(SELECT 1 FROM "TareaTC" ttc WHERE ttc.tarea_id=t.id AND ttc.estado_publicacion_id = :tep_id)`); repl.tep_id = tc_estado_publicacion_id; }
  if (tc_inamovible !== undefined) { where.push(`EXISTS(SELECT 1 FROM "TareaTC" ttc WHERE ttc.tarea_id=t.id AND ttc.inamovible = :inam)`); repl.inam = !!tc_inamovible; }

  // Filtros múltiples
  addIn('t.cliente_id', cliente_ids, 'cids_');
  addIn('t.estado_id', estado_ids, 'eids_');

  // Si no se especifica estado Y NO se pide incluirlas expresamente, excluir por defecto aprobadas y canceladas
  if (!estado_id && !estado_codigo && !estado_ids?.length && !include_finalizadas) {
    where.push(`te.codigo NOT IN ('aprobada', 'cancelada')`);
  }

  if (etiqueta_ids?.length) {
    const keys = etiqueta_ids.map((_, i) => `et${i}`);
    where.push(`EXISTS (SELECT 1 FROM "TareaEtiquetaAsig" xe WHERE xe.tarea_id=t.id AND xe.etiqueta_id IN (${keys.map(k => ':' + k).join(',')}))`);
    keys.forEach((k, i) => { repl[k] = etiqueta_ids[i]; });
  }

  if (etiqueta_id) {
    where.push(`EXISTS (SELECT 1 FROM "TareaEtiquetaAsig" xe WHERE xe.tarea_id=t.id AND xe.etiqueta_id=:et)`);
    repl.et = etiqueta_id;
  }

  // TC Multi
  if (tc_red_social_ids?.length) {
    const keys = tc_red_social_ids.map((_, i) => `tcrs${i}`);
    where.push(`EXISTS (SELECT 1 FROM "TareaTCRedSocial" xrs WHERE xrs.tarea_id=t.id AND xrs.red_social_id IN (${keys.map(k => ':' + k).join(',')}))`);
    keys.forEach((k, i) => { repl[k] = tc_red_social_ids[i]; });
  }
  if (tc_formato_ids?.length) {
    const keys = tc_formato_ids.map((_, i) => `tcf${i}`);
    where.push(`EXISTS (SELECT 1 FROM "TareaTCFormato" xf WHERE xf.tarea_id=t.id AND xf.formato_id IN (${keys.map(k => ':' + k).join(',')}))`);
    keys.forEach((k, i) => { repl[k] = tc_formato_ids[i]; });
  }

  // Flags
  if (include_archivadas !== true) where.push(`t.is_archivada = false`);
  if (is_favorita === true) where.push(`EXISTS(SELECT 1 FROM "TareaFavorito" tf WHERE tf.tarea_id=t.id AND tf.user_id=:uid)`);
  if (is_seguidor === true) where.push(`EXISTS(SELECT 1 FROM "TareaSeguidor" ts WHERE ts.tarea_id=t.id AND ts.user_id=:uid)`);
  if (solo_leads === true || solo_leads === 'true') where.push(`t.lead_id IS NOT NULL`);
  if (solo_leads === false || solo_leads === 'false') where.push(`t.lead_id IS NULL`);

  // Scoping personal
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

  // Relacionales (responsables/colaboradores)
  if (responsable_feder_id) {
    where.push(`EXISTS (SELECT 1 FROM "TareaResponsable" xr WHERE xr.tarea_id=t.id AND xr.feder_id=:rf)`);
    repl.rf = responsable_feder_id;
  }
  if (colaborador_feder_id) {
    where.push(`EXISTS (SELECT 1 FROM "TareaColaborador" xc WHERE xc.tarea_id=t.id AND xc.feder_id=:cf)`);
    repl.cf = colaborador_feder_id;
  }

  if (feder_ids?.length) {
    const keys = feder_ids.map((_, i) => `fidb${i}`);
    where.push(`(
        EXISTS (SELECT 1 FROM "TareaResponsable" xr WHERE xr.tarea_id=t.id AND xr.feder_id IN (${keys.map(k => ':' + k).join(',')}))
        OR EXISTS (SELECT 1 FROM "TareaColaborador" xc WHERE xc.tarea_id=t.id AND xc.feder_id IN (${keys.map(k => ':' + k).join(',')}))
    )`);
    keys.forEach((k, i) => { repl[k] = feder_ids[i]; });
  }

  // Rangos de fechas
  if (vencimiento_from) { where.push(`t.vencimiento >= :vfrom`); repl.vfrom = vencimiento_from; }
  if (vencimiento_to) { where.push(`t.vencimiento <= :vto`); repl.vto = vencimiento_to; }
  if (inicio_from) { where.push(`t.fecha_inicio >= :ifrom`); repl.ifrom = inicio_from; }
  if (inicio_to) { where.push(`t.fecha_inicio <= :ito`); repl.ito = inicio_to; }
  if (created_from) { where.push(`t.created_at >= :cfrom`); repl.cfrom = created_from; }
  if (created_to) { where.push(`t.created_at <= :cto`); repl.cto = created_to; }
  if (updated_from) { where.push(`t.updated_at >= :ufrom`); repl.ufrom = updated_from; }
  if (updated_to) { where.push(`t.updated_at <= :uto`); repl.uto = updated_to; }
  if (finalizada_from) { where.push(`t.finalizada_at >= :ffrom`); repl.ffrom = finalizada_from; }
  if (finalizada_to) { where.push(`t.finalizada_at <= :fto`); repl.fto = finalizada_to; }

  // Prioridad
  if (typeof prioridad_min === 'number') { where.push(`t.prioridad_num >= :pmin`); repl.pmin = prioridad_min; }
  if (typeof prioridad_max === 'number') { where.push(`t.prioridad_num <= :pmax`); repl.pmax = prioridad_max; }

  // Excluir eliminadas por defecto (soft delete)
  where.push(`t.deleted_at IS NULL`);

  if (where.length) sql += ` WHERE ${where.join(' AND ')}\n`;

  // Orden
  const orderCol =
    orden_by === 'vencimiento' ? 't.vencimiento'
      : orden_by === 'fecha_inicio' ? 't.fecha_inicio'
        : orden_by === 'created_at' ? 't.created_at'
          : orden_by === 'updated_at' ? 't.updated_at'
            : orden_by === 'cliente' ? 'cliente_nombre'
              : orden_by === 'titulo' ? 't.titulo'
                : '(t.prioridad_num + t.boost_manual)'; // default con boost

  sql += ` ORDER BY ${orderCol} ${sort.toUpperCase()} NULLS LAST, t.id DESC LIMIT :limit OFFSET :offset`;

  return { sql, repl };
};

const listTasks = async (params, currentUser) => {
  const { sql, repl } = buildListSQL(params, currentUser);
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

const countTasks = async (params, currentUser) => {
  const { sql, repl } = buildListSQL({ ...params, limit: 1, offset: 0 }, currentUser);
  const countSql = `SELECT COUNT(*)::int AS cnt FROM (${sql.replace(/LIMIT :limit OFFSET :offset/, '')}) q`;
  const rows = await sequelize.query(countSql, {
    replacements: repl,
    type: QueryTypes.SELECT,
    // The 'transaction' variable is not defined in this scope.
    // If a transaction is intended, it needs to be passed as a parameter to countTasks.
    // For now, it's commented out to avoid a ReferenceError.
    // transaction
  });
  return rows[0]?.cnt ?? 0;
};

export const getTaskById = async (id, currentUser, transaction = null) => {
  const sql = `
    SELECT
      t.*,
      fa.nombre AS creador_nombre, fa.apellido AS creador_apellido, fa.avatar_url AS creador_avatar,
      te.codigo AS estado_codigo, te.nombre AS estado_nombre,
      it.puntos AS impacto_puntos, ut.puntos AS urgencia_puntos,
      tkp.stage_code AS kanban_stage, tkp.pos AS kanban_orden,
      c.id AS cliente_id, c.nombre AS cliente_nombre, c.color AS cliente_color,
      lead.id AS lead_id, lead.empresa AS lead_empresa, lead.nombre AS lead_nombre,
      h.id AS hito_id, h.nombre AS hito_nombre,
      tp.titulo AS tarea_padre_titulo,

      -- Datos específicos de TC (si existen)
      (SELECT json_build_object(
                'objetivo_negocio_id', ttc.objetivo_negocio_id,
                'objetivo_marketing_id', ttc.objetivo_marketing_id,
                'estado_publicacion_id', ttc.estado_publicacion_id,
                'inamovible', ttc.inamovible,
                'redes', COALESCE((SELECT json_agg(json_build_object('id', tr.red_social_id, 'nombre', rs.nombre)) FROM "TareaTCRedSocial" tr JOIN "TCRedSocial" rs ON rs.id = tr.red_social_id WHERE tr.tarea_id = t.id), '[]'::json),
                'formatos', COALESCE((SELECT json_agg(json_build_object('id', tf.formato_id, 'nombre', f.nombre)) FROM "TareaTCFormato" tf JOIN "TCFormato" f ON f.id = tf.formato_id WHERE tf.tarea_id = t.id), '[]'::json)
              )
         FROM "TareaTC" ttc
        WHERE ttc.tarea_id = t.id) AS datos_tc,

      /* ===== Responsables (con datos del Feder) ===== */
      (SELECT COALESCE(json_agg(
                json_build_object(
                  'feder_id', tr.feder_id,
                  'es_lider', tr.es_lider,
                  'feder', json_build_object(
                    'id', f.id,
                    'user_id', f.user_id,
                    'nombre', f.nombre,
                    'apellido', f.apellido,
                    'avatar_url', f.avatar_url
                  )
                )
              ), '[]'::json)
         FROM "TareaResponsable" tr
         JOIN "Feder" f ON f.id = tr.feder_id
        WHERE tr.tarea_id = t.id) AS responsables,

      /* ===== Colaboradores (con datos del Feder) ===== */
      (SELECT COALESCE(json_agg(
                json_build_object(
                  'feder_id', tc.feder_id,
                  'rol', tc.rol,
                  'created_at', tc.created_at,
                  'feder', json_build_object(
                    'id', f.id,
                    'user_id', f.user_id,
                    'nombre', f.nombre,
                    'apellido', f.apellido,
                    'avatar_url', f.avatar_url
                  )
                )
              ), '[]'::json)
         FROM "TareaColaborador" tc
         JOIN "Feder" f ON f.id = tc.feder_id
        WHERE tc.tarea_id = t.id) AS colaboradores,

      /* ===== Checklist ===== */
      (SELECT json_agg(
                json_build_object('id',ti.id,'titulo',ti.titulo,'is_done',ti.is_done,'orden',ti.orden)
                ORDER BY ti.orden, ti.id
              )
         FROM "TareaChecklistItem" ti
        WHERE ti.tarea_id = t.id) AS checklist,

      /* ===== Etiquetas ===== */
      (SELECT json_agg(json_build_object('id',te.id,'codigo',te.codigo,'nombre',te.nombre))
         FROM "TareaEtiquetaAsig" tea
         JOIN "TareaEtiqueta" te ON te.id = tea.etiqueta_id
        WHERE tea.tarea_id = t.id) AS etiquetas,

      /* ===== Comentarios (con datos del autor, menciones y adjuntos) ===== */
      (SELECT json_agg(
                json_build_object(
                  'id', cm.id,
                  'feder_id', cm.feder_id,
                  'autor_feder_id', f.id,
                  'autor_user_id', f.user_id,
                  'autor_nombre',  f.nombre,
                  'autor_apellido',f.apellido,
                  'autor_avatar_url', f.avatar_url,
                  'tipo_id',   cm.tipo_id,
                  'contenido', cm.contenido,
                  'created_at',cm.created_at,
                  'updated_at',cm.updated_at,
                  'menciones', (
                    SELECT COALESCE(json_agg(m.feder_id), '[]'::json)
                    FROM "TareaComentarioMencion" m
                    WHERE m.comentario_id = cm.id
                  ),
                  'adjuntos', (
                    SELECT COALESCE(json_agg(json_build_object(
                        'id',a.id,'nombre',a.nombre,'mime',a.mime,'drive_url',a.drive_url,'drive_file_id',a.drive_file_id
                    )), '[]'::json)
                    FROM "TareaAdjunto" a
                    WHERE a.comentario_id = cm.id
                  ),
                  /* preview de reply (si corresponde) */
                  'reply_to', CASE WHEN cm.reply_to_id IS NOT NULL THEN json_build_object(
                    'id', p.id,
                    'autor', pf.nombre || ' ' || pf.apellido,
                    'excerpt', left(regexp_replace(p.contenido, E'\\s+', ' ', 'g'), 140)
                  ) ELSE NULL END,
                  'reacciones', (
                    SELECT COALESCE(json_agg(json_build_object(
                      'id', r.id, 'emoji', r.emoji, 'user_id', r.user_id, 'created_at', r.created_at
                    )), '[]'::json)
                    FROM "TareaComentarioReaccion" r
                    WHERE r.comentario_id = cm.id
                  )
                )
                ORDER BY cm.created_at
              )
         FROM "TareaComentario" cm
         JOIN "Feder" f ON f.id = cm.feder_id
         LEFT JOIN "TareaComentario" p ON p.id = cm.reply_to_id
         LEFT JOIN "Feder" pf ON pf.id = p.feder_id
        WHERE cm.tarea_id = t.id) AS comentarios,

      /* ===== Adjuntos a nivel tarea (no comentario) ===== */
      (SELECT json_agg(json_build_object('id',a.id,'nombre',a.nombre,'mime',a.mime,'drive_url',a.drive_url,'drive_file_id',a.drive_file_id,'es_embebido',a.es_embebido,'created_at',a.created_at))
         FROM "TareaAdjunto" a
        WHERE a.tarea_id = t.id AND a.comentario_id IS NULL) AS adjuntos,

      /* ===== Relaciones ===== */
      (SELECT json_agg(json_build_object('id',r.id,'relacionada_id',r.relacionada_id,'tipo_id',r.tipo_id))
         FROM "TareaRelacion" r
        WHERE r.tarea_id = t.id) AS relaciones,

      /* ===== Hijos básicos para preview ===== */
      (SELECT json_agg(
                json_build_object(
                  'id', c.id,
                  'titulo', c.titulo,
                  'estado_codigo', te2.codigo,
                  'estado_nombre', te2.nombre,
                  'cliente_nombre', cl.nombre
                )
                ORDER BY c.created_at DESC
              )
         FROM "Tarea" c
         JOIN "TareaEstado" te2 ON te2.id = c.estado_id
         LEFT JOIN "Cliente" cl ON cl.id = c.cliente_id
        WHERE c.tarea_padre_id = t.id
      ) AS children,

      /* ===== Flags por usuario ===== */
      EXISTS(SELECT 1 FROM "TareaFavorito" tf WHERE tf.tarea_id = t.id AND tf.user_id = :uid) AS is_favorita,
      EXISTS(SELECT 1 FROM "TareaSeguidor" ts WHERE ts.tarea_id = t.id AND ts.user_id = :uid) AS is_seguidor

    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id = t.estado_id
    LEFT JOIN "Feder" fa ON fa.id = t.creado_por_feder_id
    LEFT JOIN "ImpactoTipo" it ON it.id = t.impacto_id
    LEFT JOIN "UrgenciaTipo" ut ON ut.id = t.urgencia_id
    LEFT JOIN "Cliente" c ON c.id = t.cliente_id
    LEFT JOIN "ComercialLead" lead ON lead.id = t.lead_id
    LEFT JOIN "ClienteHito" h ON h.id = t.hito_id
    LEFT JOIN "Tarea" tp ON tp.id = t.tarea_padre_id
    LEFT JOIN "TareaKanbanPos" tkp ON tkp.tarea_id = t.id AND tkp.user_id = :uid
    WHERE t.id = :id AND t.deleted_at IS NULL
    LIMIT 1
  `;

  const replacements = { id: Number(id), uid: currentUser?.id || 0 };
  const rows = await sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
    transaction
  });

  return rows[0] || null;
};

/* Hierarchical Clan Data */
export const svcGetTaskFamily = async (id, currentUser) => {
  // 1. Encontrar el root absoluto (hacia arriba)
  const rootSql = `
    WITH RECURSIVE ancestors AS (
      SELECT id, tarea_padre_id FROM "Tarea" WHERE id = :id
      UNION ALL
      SELECT t.id, t.tarea_padre_id FROM "Tarea" t JOIN ancestors a ON t.id = a.tarea_padre_id
    )
    SELECT id FROM ancestors WHERE tarea_padre_id IS NULL AND id IS NOT NULL LIMIT 1;
  `;
  const rootResult = await sequelize.query(rootSql, {
    replacements: { id: Number(id) },
    type: QueryTypes.SELECT
  });
  const absoluteRootId = rootResult[0]?.id || id;

  // 2. Traer todo el árbol desde ese root (hacia abajo)
  const treeSql = `
    WITH RECURSIVE family_tree AS (
      SELECT 
        t.*,
        te.codigo AS estado_codigo, te.nombre AS estado_nombre,
        it.puntos AS impacto_puntos, ut.puntos AS urgencia_puntos,
        c.nombre AS cliente_nombre, c.color AS cliente_color,
        0 AS depth
      FROM "Tarea" t
      JOIN "TareaEstado" te ON te.id = t.estado_id
      LEFT JOIN "ImpactoTipo" it ON it.id = t.impacto_id
      LEFT JOIN "UrgenciaTipo" ut ON ut.id = t.urgencia_id
      LEFT JOIN "Cliente" c ON c.id = t.cliente_id
      WHERE t.id = :absoluteRootId AND t.deleted_at IS NULL
      
      UNION ALL
      
      SELECT 
        t.*,
        te.codigo AS estado_codigo, te.nombre AS estado_nombre,
        it.puntos AS impacto_puntos, ut.puntos AS urgencia_puntos,
        c.nombre AS cliente_nombre, c.color AS cliente_color,
        ft.depth + 1
      FROM "Tarea" t
      JOIN family_tree ft ON t.tarea_padre_id = ft.id
      JOIN "TareaEstado" te ON te.id = t.estado_id
      LEFT JOIN "ImpactoTipo" it ON it.id = t.impacto_id
      LEFT JOIN "UrgenciaTipo" ut ON ut.id = t.urgencia_id
      LEFT JOIN "Cliente" c ON c.id = t.cliente_id
      WHERE t.deleted_at IS NULL
    )
    SELECT 
      ft.*,
      COALESCE((SELECT json_agg(json_build_object(
        'feder_id', tr.feder_id, 
        'feder', json_build_object('id', f.id, 'nombre', f.nombre, 'apellido', f.apellido, 'avatar_url', f.avatar_url)
      )) FROM "TareaResponsable" tr JOIN "Feder" f ON f.id = tr.feder_id WHERE tr.tarea_id = ft.id), '[]'::json) AS responsables,
      COALESCE((SELECT json_agg(json_build_object(
        'feder_id', tc.feder_id, 
        'feder', json_build_object('id', f.id, 'nombre', f.nombre, 'apellido', f.apellido, 'avatar_url', f.avatar_url)
      )) FROM "TareaColaborador" tc JOIN "Feder" f ON f.id = tc.feder_id WHERE tc.tarea_id = ft.id), '[]'::json) AS colaboradores
    FROM family_tree ft
    ORDER BY ft.depth, ft.id;
  `;

  return sequelize.query(treeSql, {
    replacements: { absoluteRootId: Number(absoluteRootId) },
    type: QueryTypes.SELECT
  });
};




// ---------- CRUD de Tarea ----------
const createTask = async (payload, currentFederId) => {
  return sequelize.transaction(async (t) => {
    const {
      cliente_id,
      lead_id,
      hito_id,
      tarea_padre_id,
      titulo,
      descripcion,
      estado_id,
      requiere_aprobacion = false,
      impacto_id = 2,
      urgencia_id = 4,
      fecha_inicio = null,
      vencimiento = null,
      tipo = 'STD',
      tc = null,
      responsables = [],
      colaboradores = [],
      adjuntos = []
    } = payload;

    if (cliente_id) await ensureExists(models.Cliente, cliente_id, 'Cliente no encontrado');
    if (lead_id) await ensureExists(models.ComercialLead, lead_id, 'Lead no encontrado');
    if (hito_id) await ensureExists(models.ClienteHito, hito_id, 'Hito no encontrado');
    if (tarea_padre_id) {
      await ensureExists(models.Tarea, tarea_padre_id, 'Tarea padre no encontrada');
      await validateHierarchy(null, tarea_padre_id);
    }

    const [puntos, ponderacion] = await Promise.all([
      getPuntos(impacto_id, urgencia_id),
      cliente_id ? getClientePonderacion(cliente_id) : 3 // Default if lead
    ]);
    const prioridad_num = calcPrioridad(ponderacion, puntos.impacto, puntos.urgencia);

    // Estado default si no vino: 'pendiente'
    let estado = estado_id;
    if (!estado) {
      const est = await models.TareaEstado.findOne({ where: { codigo: 'pendiente' }, transaction: t });
      estado = est?.id ?? null;
    }

    // Aprobación por defecto según flag
    const aprobRow = await models.TareaAprobacionEstado.findOne({
      where: { codigo: requiere_aprobacion ? 'pendiente' : 'no_aplica' }, transaction: t
    });
    const aprobacion_estado_id = aprobRow?.id ?? (requiere_aprobacion ? 2 : 1);

    const tarea = await models.Tarea.create({
      cliente_id, lead_id, hito_id, tarea_padre_id, titulo, descripcion,
      estado_id: estado, creado_por_feder_id: currentFederId,
      requiere_aprobacion, aprobacion_estado_id,
      impacto_id, urgencia_id, prioridad_num,
      cliente_ponderacion: ponderacion,
      fecha_inicio, vencimiento,
      tipo // STD, TC, IT
    }, { transaction: t });

    // ===== Registrar creación en historial =====
    await registrarCambio({
      tarea_id: tarea.id,
      feder_id: currentFederId,
      tipo_cambio: TIPO_CAMBIO.CREACION,
      accion: ACCION.CREATED,
      descripcion: 'Creó la tarea',
      transaction: t
    });

    // ===== Datos específicos de TC =====
    if (tipo === 'TC' && tc) {
      const { red_social_ids = [], formato_ids = [], objetivo_negocio_id, objetivo_marketing_id, estado_publicacion_id = 1, inamovible = false } = tc;

      await models.TareaTC.create({
        tarea_id: tarea.id,
        objetivo_negocio_id,
        objetivo_marketing_id,
        estado_publicacion_id,
        inamovible
      }, { transaction: t });

      if (red_social_ids.length) {
        await models.TareaTCRedSocial.bulkCreate(red_social_ids.map(rsid => ({ tarea_id: tarea.id, red_social_id: rsid })), { transaction: t });
      }
      if (formato_ids.length) {
        await models.TareaTCFormato.bulkCreate(formato_ids.map(fid => ({ tarea_id: tarea.id, formato_id: fid })), { transaction: t });
      }
    }

    // ===== Responsables (soporta ids u objetos) =====
    if (Array.isArray(responsables) && responsables.length) {
      // asegurar solo un líder (si llegaron varios marcados)
      let leaderMarked = false;
      for (const r of responsables) {
        const feder_id = typeof r === 'number' ? r : r?.feder_id;
        let es_lider = typeof r === 'object' ? !!r?.es_lider : false;
        if (es_lider) {
          if (leaderMarked) es_lider = false;
          leaderMarked = true;
        }
        if (feder_id) {
          await models.TareaResponsable.findOrCreate({
            where: { tarea_id: tarea.id, feder_id },
            defaults: { tarea_id: tarea.id, feder_id, es_lider },
            transaction: t
          });
        }
      }
    }

    // ===== Colaboradores =====
    if (Array.isArray(colaboradores) && colaboradores.length) {
      for (const c of colaboradores) {
        const feder_id = typeof c === 'number' ? c : c?.feder_id;
        const rol = typeof c === 'object' ? (c?.rol ?? null) : null;
        if (feder_id) {
          const [row, created] = await models.TareaColaborador.findOrCreate({
            where: { tarea_id: tarea.id, feder_id },
            defaults: { tarea_id: tarea.id, feder_id, rol },
            transaction: t
          });
          if (!created && rol !== undefined) { row.rol = rol; await row.save({ transaction: t }); }
        }
      }
    }

    // ===== Adjuntos (meta ya resuelta) =====
    if (Array.isArray(adjuntos) && adjuntos.length) {
      const rows = adjuntos.map(a => ({
        tarea_id: tarea.id,
        comentario_id: null,
        nombre: a.nombre,
        mime: a.mime || null,
        tamano_bytes: a.tamano_bytes ?? null,
        drive_file_id: a.drive_file_id || null,
        drive_url: a.drive_url || null,
        es_embebido: !!a.es_embebido,
        subido_por_feder_id: currentFederId
      }));
      await models.TareaAdjunto.bulkCreate(rows, { transaction: t });
    }

    return tarea;
  });
};


const updateTask = async (id, payload, feder_id = null, currentUser = null) => {
  return sequelize.transaction(async (t) => {
    // 1) Obtener estado actual (antes del cambio) para comparar y registrar historial
    const cur = await models.Tarea.findByPk(id, {
      include: [{ model: models.TareaTC, as: 'datosTC' }],
      transaction: t
    });
    if (!cur) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });

    // REGLA DE NEGOCIO: inamovible (bloqueo de vencimiento)
    if (cur.datosTC?.inamovible && payload.vencimiento !== undefined) {
      const oldD = cur.vencimiento ? new Date(cur.vencimiento).toISOString().split('T')[0] : null;
      const newD = payload.vencimiento ? new Date(payload.vencimiento).toISOString().split('T')[0] : null;
      if (oldD !== newD) {
        throw Object.assign(new Error('Esta tarea es inamovible y no permite cambiar su fecha de publicación.'), { status: 400 });
      }
    }

    // Validaciones de existencia de relaciones
    if (payload.cliente_id) await ensureExists(models.Cliente, payload.cliente_id, 'Cliente no encontrado');
    if (payload.lead_id) await ensureExists(models.ComercialLead, payload.lead_id, 'Lead no encontrado');
    if (payload.hito_id) await ensureExists(models.ClienteHito, payload.hito_id, 'Hito no encontrado');
    if (payload.tarea_padre_id) {
      await ensureExists(models.Tarea, payload.tarea_padre_id, 'Tarea padre no encontrada');
      await validateHierarchy(id, payload.tarea_padre_id);
    }

    // Recalcular prioridad si cambian factores clave
    let prioridad_num = cur.prioridad_num;
    let cliente_ponderacion = cur.cliente_ponderacion;
    if (payload.cliente_id || payload.impacto_id || payload.urgencia_id) {
      cliente_ponderacion = await getClientePonderacion(payload.cliente_id ?? cur.cliente_id);
      const pts = await getPuntos(payload.impacto_id ?? cur.impacto_id, payload.urgencia_id ?? cur.urgencia_id);
      prioridad_num = calcPrioridad(cliente_ponderacion, pts.impacto, pts.urgencia);
    }

    // 2) Clasificar campos por tabla y detectar cambios para el historial
    const fieldsTarea = {};
    const fieldsTC = {};
    const cambiosHistorial = [];
    const { tc, ...basePayload } = payload;

    // Campos de Tarea (Nucleo)
    const mappingTarea = [
      'cliente_id', 'lead_id', 'hito_id', 'tarea_padre_id', 'titulo', 'descripcion',
      'estado_id', 'requiere_aprobacion', 'impacto_id', 'urgencia_id',
      'fecha_inicio', 'vencimiento', 'progreso_pct', 'is_archivada'
    ];

    for (const field of mappingTarea) {
      if (basePayload[field] !== undefined) {
        let oldVal = cur[field];
        let newVal = basePayload[field];

        // Normalización para comparación
        if (oldVal instanceof Date) oldVal = oldVal.toISOString();
        if (newVal instanceof Date) newVal = newVal.toISOString();

        if (String(oldVal) !== String(newVal)) {
          fieldsTarea[field] = basePayload[field];

          // Mapeo robusto de field -> TIPO_CAMBIO
          const lookupKey = field.replace('_id', '').toUpperCase();
          const tipo = TIPO_CAMBIO[lookupKey] || TIPO_CAMBIO[field.toUpperCase()] || 'tarea_detalle';

          cambiosHistorial.push({
            tipo_cambio: tipo,
            accion: ACCION.UPDATED,
            campo: field,
            valor_anterior: cur[field],
            valor_nuevo: basePayload[field],
            descripcion: `Actualizó ${field.replace(/_/g, ' ')}`
          });
        }
      }
    }

    // Agregar campos calculados si hubo cambios
    if (prioridad_num !== cur.prioridad_num) fieldsTarea.prioridad_num = prioridad_num;
    if (cliente_ponderacion !== cur.cliente_ponderacion) fieldsTarea.cliente_ponderacion = cliente_ponderacion;

    // Manejar casos especiales de estado (clausura)
    if (fieldsTarea.estado_id) {
      const { codigo } = await models.TareaEstado.findByPk(fieldsTarea.estado_id, { attributes: ['codigo'], transaction: t });
      if (codigo === 'finalizada') {
        fieldsTarea.finalizada_at = new Date();
        fieldsTarea.progreso_pct = 100;
      } else {
        fieldsTarea.finalizada_at = null;
      }
    }

    // Campos de TareaTC (Extensión)
    if (tc) {
      const tcMapping = ['objetivo_negocio_id', 'objetivo_marketing_id', 'estado_publicacion_id', 'inamovible'];
      const curTC = cur.datosTC || {};

      for (const field of tcMapping) {
        if (tc[field] !== undefined) {
          if (String(tc[field]) !== String(curTC[field])) {

            // REGLA DE NEGOCIO: inamovible
            if (field === 'inamovible') {
              if (curTC.inamovible && tc.inamovible === false) {
                throw Object.assign(new Error('No podés desmarcar una tarea como inamovible una vez establecida.'), { status: 400 });
              }
              if (tc.inamovible === true) {
                const isNivelB = currentUser?.roles?.includes('NivelA') || currentUser?.roles?.includes('NivelB');
                const isResponsible = await models.TareaResponsable.findOne({ where: { tarea_id: id, feder_id: feder_id }, transaction: t });
                if (!isNivelB && !isResponsible) {
                  throw Object.assign(new Error('Solo los directivos o el responsable de la tarea pueden marcarla como inamovible.'), { status: 403 });
                }
              }
            }

            fieldsTC[field] = tc[field];

            cambiosHistorial.push({
              tipo_cambio: TIPO_CAMBIO.TC_DETALLE,
              accion: ACCION.UPDATED,
              campo: field,
              valor_anterior: curTC[field],
              valor_nuevo: tc[field],
              descripcion: `Actualizó campo TC: ${field.replace(/_/g, ' ')}`
            });
          }
        }
      }
    }

    // 3) Ejecutar Raw SQL UPDATES

    // UPDATE Tarea
    if (Object.keys(fieldsTarea).length > 0) {
      const setClause = Object.keys(fieldsTarea).map(k => `"${k}" = :${k}`).join(', ');
      await sequelize.query(`
        UPDATE "Tarea" 
        SET ${setClause}, "updated_at" = NOW()
        WHERE "id" = :id
      `, {
        replacements: { ...fieldsTarea, id },
        type: QueryTypes.UPDATE,
        transaction: t
      });
    }

    // UPDATE TareaTC
    if (Object.keys(fieldsTC).length > 0 || tc) {
      // Asegurar que exista la fila en TareaTC
      const tcExists = !!cur.datosTC;
      if (!tcExists) {
        await sequelize.query(`INSERT INTO "TareaTC" ("tarea_id", "created_at", "updated_at") VALUES (:id, NOW(), NOW())`,
          { replacements: { id }, type: QueryTypes.INSERT, transaction: t });
      }

      if (Object.keys(fieldsTC).length > 0) {
        const setClauseTC = Object.keys(fieldsTC).map(k => `"${k}" = :${k}`).join(', ');
        await sequelize.query(`
          UPDATE "TareaTC" 
          SET ${setClauseTC}, "updated_at" = NOW()
          WHERE "tarea_id" = :id
        `, {
          replacements: { ...fieldsTC, id },
          type: QueryTypes.UPDATE,
          transaction: t
        });
      }
    }

    // 4) Manejar Pivotes (Redes y Formatos)
    if (tc?.red_social_ids !== undefined) {
      await sequelize.query(`DELETE FROM "TareaTCRedSocial" WHERE "tarea_id" = :id`, { replacements: { id }, transaction: t });
      if (tc.red_social_ids?.length) {
        const values = tc.red_social_ids.map(rsid => `(${id}, ${rsid})`).join(',');
        await sequelize.query(`INSERT INTO "TareaTCRedSocial" ("tarea_id", "red_social_id") VALUES ${values}`, { transaction: t });
      }
      cambiosHistorial.push({ tipo_cambio: TIPO_CAMBIO.TC_REDES, accion: ACCION.UPDATED, descripcion: 'Actualizó redes sociales' });
    }

    if (tc?.formato_ids !== undefined) {
      await sequelize.query(`DELETE FROM "TareaTCFormato" WHERE "tarea_id" = :id`, { replacements: { id }, transaction: t });
      if (tc.formato_ids?.length) {
        const values = tc.formato_ids.map(fid => `(${id}, ${fid})`).join(',');
        await sequelize.query(`INSERT INTO "TareaTCFormato" ("tarea_id", "formato_id") VALUES ${values}`, { transaction: t });
      }
      cambiosHistorial.push({ tipo_cambio: TIPO_CAMBIO.TC_FORMATOS, accion: ACCION.UPDATED, descripcion: 'Actualizó formatos' });
    }

    // 5) Persistir Historial
    if (feder_id && cambiosHistorial.length > 0) {
      for (const ch of cambiosHistorial) {
        await registrarCambio({
          tarea_id: id,
          feder_id,
          ...ch,
          transaction: t
        });
      }
    }

    return getTaskById(id, currentUser, t);
  });
};

const archiveTask = async (id, archive = true) => {
  await models.Tarea.update({ is_archivada: !!archive }, { where: { id } });
  return { ok: true };
};

// ---------- Responsables / Colaboradores ----------
const addResponsable = async (tarea_id, feder_id, es_lider = false, changed_by_feder_id = null) => {
  return sequelize.transaction(async (t) => {
    await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada');

    const feder = await models.Feder.findByPk(feder_id, { attributes: ['id', 'nombre', 'apellido'], transaction: t });
    if (!feder) throw Object.assign(new Error('Feder no encontrado'), { status: 404 });

    const [row, created] = await models.TareaResponsable.findOrCreate({
      where: { tarea_id, feder_id },
      defaults: { tarea_id, feder_id, es_lider },
      transaction: t
    });

    if (changed_by_feder_id) {
      await registrarCambio({
        tarea_id,
        feder_id: changed_by_feder_id,
        tipo_cambio: TIPO_CAMBIO.RESPONSABLE,
        accion: created ? ACCION.ADDED : ACCION.UPDATED,
        valor_nuevo: { feder_id, nombre: `${feder.nombre} ${feder.apellido}`, es_lider },
        descripcion: created
          ? `Agregó a ${feder.nombre} ${feder.apellido} como responsable${es_lider ? ' líder' : ''}`
          : `Modificó el responsable ${feder.nombre} ${feder.apellido}`,
        transaction: t
      });
    }

    if (!row.isNewRecord && row.es_lider !== es_lider) {
      row.es_lider = es_lider; await row.save({ transaction: t });
    }
    return row;
  });
};

const removeResponsable = async (tarea_id, feder_id, changed_by_feder_id = null) => {
  return sequelize.transaction(async (t) => {
    const feder = await models.Feder.findByPk(feder_id, { attributes: ['id', 'nombre', 'apellido'], transaction: t });

    await models.TareaResponsable.destroy({ where: { tarea_id, feder_id }, transaction: t });

    if (changed_by_feder_id && feder) {
      await registrarCambio({
        tarea_id,
        feder_id: changed_by_feder_id,
        tipo_cambio: TIPO_CAMBIO.RESPONSABLE,
        accion: ACCION.REMOVED,
        valor_anterior: { feder_id, nombre: `${feder.nombre} ${feder.apellido}` },
        descripcion: `Eliminó a ${feder.nombre} ${feder.apellido} de los responsables`,
        transaction: t
      });
    }
    return { ok: true };
  });
};

const addColaborador = async (tarea_id, feder_id, rol = null, changed_by_feder_id = null) => {
  return sequelize.transaction(async (t) => {
    await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada');

    const feder = await models.Feder.findByPk(feder_id, { attributes: ['id', 'nombre', 'apellido'], transaction: t });
    if (!feder) throw Object.assign(new Error('Feder no encontrado'), { status: 404 });

    const [row, created] = await models.TareaColaborador.findOrCreate({
      where: { tarea_id, feder_id },
      defaults: { tarea_id, feder_id, rol },
      transaction: t
    });

    if (changed_by_feder_id) {
      await registrarCambio({
        tarea_id,
        feder_id: changed_by_feder_id,
        tipo_cambio: TIPO_CAMBIO.COLABORADOR,
        accion: created ? ACCION.ADDED : ACCION.UPDATED,
        valor_nuevo: { feder_id, nombre: `${feder.nombre} ${feder.apellido}`, rol },
        descripcion: created
          ? `Agregó a ${feder.nombre} ${feder.apellido} como colaborador`
          : `Actualizó el rol de colaborador de ${feder.nombre} ${feder.apellido}`,
        transaction: t
      });
    }

    if (!created && rol !== undefined) { row.rol = rol; await row.save({ transaction: t }); }
    return row;
  });
};

const removeColaborador = async (tarea_id, feder_id, changed_by_feder_id = null) => {
  return sequelize.transaction(async (t) => {
    const feder = await models.Feder.findByPk(feder_id, { attributes: ['id', 'nombre', 'apellido'], transaction: t });

    await models.TareaColaborador.destroy({ where: { tarea_id, feder_id }, transaction: t });

    if (changed_by_feder_id && feder) {
      await registrarCambio({
        tarea_id,
        feder_id: changed_by_feder_id,
        tipo_cambio: TIPO_CAMBIO.COLABORADOR,
        accion: ACCION.REMOVED,
        valor_anterior: { feder_id, nombre: `${feder.nombre} ${feder.apellido}` },
        descripcion: `Eliminó a ${feder.nombre} ${feder.apellido} de los colaboradores`,
        transaction: t
      });
    }
    return { ok: true };
  });
};

// ---------- Etiquetas ----------
const assignEtiqueta = async (tarea_id, etiqueta_id) => {
  await Promise.all([
    ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada'),
    ensureExists(models.TareaEtiqueta, etiqueta_id, 'Etiqueta no encontrada')
  ]);
  await models.TareaEtiquetaAsig.findOrCreate({ where: { tarea_id, etiqueta_id }, defaults: { tarea_id, etiqueta_id } });
  return { ok: true };
};

const unassignEtiqueta = async (tarea_id, etiqueta_id) => {
  await models.TareaEtiquetaAsig.destroy({ where: { tarea_id, etiqueta_id } });
  return { ok: true };
};

// ---------- Checklist ----------
const listChecklist = (tarea_id) =>
  models.TareaChecklistItem.findAll({ where: { tarea_id }, order: [['orden', 'ASC'], ['id', 'ASC']] });

const recomputeProgressPct = async (tarea_id, t = null) => {
  const total = await models.TareaChecklistItem.count({ where: { tarea_id }, transaction: t || undefined });
  const done = await models.TareaChecklistItem.count({ where: { tarea_id, is_done: true }, transaction: t || undefined });
  const pct = total ? Math.round((done / total) * 10000) / 100 : 0;
  await models.Tarea.update({ progreso_pct: pct }, { where: { id: tarea_id }, transaction: t || undefined });
};

const createChecklistItem = async (tarea_id, titulo) => {
  return sequelize.transaction(async (t) => {
    const max = await models.TareaChecklistItem.max('orden', { where: { tarea_id }, transaction: t });
    const item = await models.TareaChecklistItem.create({ tarea_id, titulo, orden: Number.isFinite(max) ? max + 1 : 1 }, { transaction: t });
    await recomputeProgressPct(tarea_id, t);
    return item;
  });
};

const updateChecklistItem = async (id, patch) => {
  return sequelize.transaction(async (t) => {
    const item = await models.TareaChecklistItem.findByPk(id, { transaction: t });
    if (!item) throw Object.assign(new Error('Ítem de checklist inexistente'), { status: 404 });
    await models.TareaChecklistItem.update(patch, { where: { id }, transaction: t });
    await recomputeProgressPct(item.tarea_id, t);
    return models.TareaChecklistItem.findByPk(id, { transaction: t });
  });
};

const deleteChecklistItem = async (id) => {
  return sequelize.transaction(async (t) => {
    const item = await models.TareaChecklistItem.findByPk(id, { transaction: t });
    if (!item) return { ok: true };
    await models.TareaChecklistItem.destroy({ where: { id }, transaction: t });
    await recomputeProgressPct(item.tarea_id, t);
    return { ok: true };
  });
};

const reorderChecklist = async (tarea_id, ordenPairs = []) =>
  sequelize.transaction(async (t) => {
    for (const { id, orden } of ordenPairs) {
      await models.TareaChecklistItem.update({ orden }, { where: { id, tarea_id }, transaction: t });
    }
    return listChecklist(tarea_id);
  });

// ---------- Comentarios / menciones / adjuntos (comentario) ----------
const listComentarios = async (tarea_id, currentUser) =>
  sequelize.query(`
    SELECT
      cm.*,
      -- datos del autor (IDs + nombre/apellido)
      f.id       AS autor_feder_id,
      f.user_id  AS autor_user_id,
      f.nombre   AS autor_nombre,
      f.apellido AS autor_apellido,
      f.avatar_url AS autor_avatar_url,
      ct.codigo  AS tipo_codigo,

      -- flag para el cliente (mío si coincide feder_id o user_id)
      (cm.feder_id = :cur_fid OR f.user_id = :uid) AS is_mine,

      -- menciones y adjuntos del comentario
      COALESCE((
        SELECT json_agg(m.feder_id)
        FROM "TareaComentarioMencion" m
        WHERE m.comentario_id = cm.id
      ), '[]'::json) AS menciones,

      COALESCE((
        SELECT json_agg(json_build_object(
          'id', a.id, 'nombre', a.nombre, 'mime', a.mime, 'drive_url', a.drive_url, 'drive_file_id', a.drive_file_id
        ))
        FROM "TareaAdjunto" a
        WHERE a.comentario_id = cm.id
      ), '[]'::json) AS adjuntos,

      -- preview si es reply
      CASE WHEN cm.reply_to_id IS NOT NULL THEN json_build_object(
        'id', p.id,
        'autor', pf.nombre || ' ' || pf.apellido,
        'excerpt', left(regexp_replace(p.contenido, E'\\s+', ' ', 'g'), 140)
      ) ELSE NULL END AS reply_to,

      -- reacciones del comentario
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', r.id, 'emoji', r.emoji, 'user_id', r.user_id, 'created_at', r.created_at
        ))
        FROM "TareaComentarioReaccion" r
        WHERE r.comentario_id = cm.id
      ), '[]'::json) AS reacciones

    FROM "TareaComentario" cm
    JOIN "Feder" f          ON f.id  = cm.feder_id
    JOIN "ComentarioTipo" ct ON ct.id = cm.tipo_id
    LEFT JOIN "TareaComentario" p ON p.id = cm.reply_to_id
    LEFT JOIN "Feder" pf          ON pf.id = p.feder_id

    WHERE cm.tarea_id = :id
    ORDER BY cm.created_at ASC
  `, {
    type: QueryTypes.SELECT,
    replacements: {
      id: tarea_id,
      uid: currentUser?.id ?? 0,
      cur_fid: currentUser?.feder_id ?? 0
    }
  });



const createComentario = async (tarea_id, feder_id, { tipo_id, tipo_codigo, contenido, menciones = [], adjuntos = [], reply_to_id = null }) =>
  sequelize.transaction(async (t) => {
    let resolvedTipoId = tipo_id ?? null;
    if (!resolvedTipoId && tipo_codigo) {
      const tipo = await models.ComentarioTipo.findOne({ where: { codigo: tipo_codigo }, transaction: t });
      if (!tipo) throw Object.assign(new Error('Tipo de comentario no encontrado'), { status: 400 });
      resolvedTipoId = tipo.id;
    }
    await Promise.all([
      ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada'),
      ensureExists(models.ComentarioTipo, resolvedTipoId, 'Tipo de comentario no encontrado')
    ]);

    // si viene reply_to_id, validamos que exista y pertenezca a la misma tarea
    if (reply_to_id) {
      const parent = await models.TareaComentario.findByPk(reply_to_id, { transaction: t })
      if (!parent || parent.tarea_id !== Number(tarea_id)) {
        throw Object.assign(new Error('Comentario padre inválido'), { status: 400 })
      }
    }

    const cm = await models.TareaComentario.create({ tarea_id, feder_id, tipo_id: resolvedTipoId, contenido, reply_to_id: reply_to_id || null }, { transaction: t });

    if (menciones?.length) {
      const uniq = Array.from(new Set(menciones));
      const rows = uniq.map(fid => ({ comentario_id: cm.id, feder_id: fid }));
      await models.TareaComentarioMencion.bulkCreate(rows, { transaction: t, ignoreDuplicates: true });
    }
    if (adjuntos?.length) {
      console.log('[createComentario] Processing', adjuntos.length, 'attachments');
      console.log('[createComentario] Adjuntos:', JSON.stringify(adjuntos, null, 2));

      const news = [];
      const usedIds = [];
      for (const a of adjuntos) {
        if (a.id) {
          console.log('[createComentario] Existing attachment ID:', a.id, typeof a.id);
          usedIds.push(Number(a.id));
        } else {
          console.log('[createComentario] New attachment:', a.nombre);
          news.push({ ...a, tarea_id, comentario_id: cm.id, subido_por_feder_id: feder_id });
        }
      }

      console.log('[createComentario] Distribution:', {
        total: adjuntos.length,
        new: news.length,
        existing: usedIds.length,
        usedIds
      });

      if (news.length) {
        const created = await models.TareaAdjunto.bulkCreate(news, { transaction: t });
        console.log('[createComentario] Created', created.length, 'new attachment records');
      }

      if (usedIds.length) {
        console.log('[createComentario] Attempting to link existing attachments:', usedIds);
        console.log('[createComentario] WHERE clause:', { id: { [Op.in]: usedIds }, tarea_id });

        // Vinculamos los que ya existían (subidos por postAdjuntoUpload)
        const [updateCount] = await models.TareaAdjunto.update(
          { comentario_id: cm.id },
          { where: { id: { [Op.in]: usedIds }, tarea_id }, transaction: t }
        );

        console.log('[createComentario] UPDATE result:', updateCount, 'rows updated');

        if (updateCount !== usedIds.length) {
          console.warn('[createComentario] MISMATCH! Expected:', usedIds.length, 'Updated:', updateCount);

          // Debug: Check which IDs actually exist
          const existing = await models.TareaAdjunto.findAll({
            where: { id: { [Op.in]: usedIds }, tarea_id },
            attributes: ['id', 'comentario_id', 'nombre'],
            transaction: t
          });
          console.log('[createComentario] Existing records found:', existing.map(e => ({ id: e.id, comentario_id: e.comentario_id, nombre: e.nombre })));
        }
      }
    }
    return cm;
  });

// ---------- Adjuntos (a nivel tarea, no comentario) ----------
const addAdjunto = async (tarea_id, feder_id, meta) => {
  return sequelize.transaction(async (t) => {
    await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada');
    const adj = await models.TareaAdjunto.create({ ...meta, tarea_id, subido_por_feder_id: feder_id }, { transaction: t });

    // Historial (opcional, pero pedido)
    // No tenemos un TIPO_CAMBIO.ADJUNTO específico en helper, usaremos 'adjunto' o genérico si no existe.
    // Asumimos que TIPO_CAMBIO.ADJUNTO no existe, lo agregamos como string o extendemos.
    // Revisando helper: no tiene ADJUNTO. Usaremos 'adjunto' raw o agregaremos si fuera necesario.
    // Para consistencia, usaremos string 'adjunto' que el helper aceptará (es enum en DB o string?)
    // El modelo TareaHistorial define tipo_cambio como STRING.
    await registrarCambio({
      tarea_id,
      feder_id,
      tipo_cambio: TIPO_CAMBIO.ADJUNTO,
      accion: ACCION.ADDED,
      valor_nuevo: { id: adj.id, nombre: adj.nombre },
      descripcion: `Subió el adjunto "${adj.nombre}"`,
      transaction: t
    });

    return adj;
  });
};

const removeAdjunto = async (adjId, feder_id) => {
  return sequelize.transaction(async (t) => {
    const adj = await models.TareaAdjunto.findByPk(adjId, { transaction: t });
    if (!adj) return { ok: true };

    await models.TareaAdjunto.destroy({ where: { id: adjId }, transaction: t });

    if (feder_id) {
      await registrarCambio({
        tarea_id: adj.tarea_id,
        feder_id,
        tipo_cambio: TIPO_CAMBIO.ADJUNTO,
        accion: ACCION.REMOVED,
        valor_anterior: { id: adj.id, nombre: adj.nombre },
        descripcion: `Eliminó el adjunto "${adj.nombre}"`,
        transaction: t
      });
    }
    return { ok: true };
  });
};

// ---------- Relaciones ----------
const createRelacion = async (tarea_id, { relacionada_id, tipo_id, tipo_codigo }, feder_id) => {
  return sequelize.transaction(async (t) => {
    let resolvedTipoId = tipo_id ?? null;
    if (!resolvedTipoId && tipo_codigo) {
      const tipo = await models.TareaRelacionTipo.findOne({ where: { codigo: tipo_codigo }, transaction: t });
      if (!tipo) throw Object.assign(new Error('Tipo de relación no encontrado'), { status: 400 });
      resolvedTipoId = tipo.id;
    }
    await Promise.all([
      ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada'),
      ensureExists(models.Tarea, relacionada_id, 'Tarea relacionada no encontrada'),
      ensureExists(models.TareaRelacionTipo, resolvedTipoId, 'Tipo de relación no encontrado')
    ]);

    const [row, created] = await models.TareaRelacion.findOrCreate({
      where: { tarea_id, relacionada_id, tipo_id: resolvedTipoId },
      defaults: { tarea_id, relacionada_id, tipo_id: resolvedTipoId },
      transaction: t
    });

    if (created && feder_id) {
      const relTask = await models.Tarea.findByPk(relacionada_id, { attributes: ['titulo'], transaction: t });
      const tipoRel = await models.TareaRelacionTipo.findByPk(resolvedTipoId, { attributes: ['nombre'], transaction: t });

      await registrarCambio({
        tarea_id,
        feder_id,
        tipo_cambio: TIPO_CAMBIO.RELACION,
        accion: ACCION.ADDED,
        valor_nuevo: { relacionada_id, titulo: relTask?.titulo, tipo: tipoRel?.nombre },
        descripcion: `Agregó relación "${tipoRel?.nombre}" con tarea #${relacionada_id}`,
        transaction: t
      });
    }
    return row;
  });
};

const deleteRelacion = async (tarea_id, relId, feder_id) => {
  return sequelize.transaction(async (t) => {
    const rel = await models.TareaRelacion.findOne({ where: { id: relId, tarea_id }, transaction: t });
    if (!rel) return { ok: true };

    await models.TareaRelacion.destroy({ where: { id: relId, tarea_id }, transaction: t });

    if (feder_id) {
      const relTask = await models.Tarea.findByPk(rel.relacionada_id, { attributes: ['titulo'], transaction: t });
      const tipoRel = await models.TareaRelacionTipo.findByPk(rel.tipo_id, { attributes: ['nombre'], transaction: t });

      await registrarCambio({
        tarea_id,
        feder_id,
        tipo_cambio: TIPO_CAMBIO.RELACION,
        accion: ACCION.REMOVED,
        valor_anterior: { relacionada_id: rel.relacionada_id, titulo: relTask?.titulo, tipo: tipoRel?.nombre },
        descripcion: `Eliminó relación "${tipoRel?.nombre}" con tarea #${rel.relacionada_id}`,
        transaction: t
      });
    }
    return { ok: true };
  });
};

// ---------- Favoritos / Seguidores ----------
const setFavorito = async (tarea_id, user_id, on) => {
  if (on) await models.TareaFavorito.findOrCreate({ where: { tarea_id, user_id }, defaults: { tarea_id, user_id } });
  else await models.TareaFavorito.destroy({ where: { tarea_id, user_id } });
  return { ok: true };
};

const setSeguidor = async (tarea_id, user_id, on) => {
  if (on) await models.TareaSeguidor.findOrCreate({ where: { tarea_id, user_id }, defaults: { tarea_id, user_id } });
  else await models.TareaSeguidor.destroy({ where: { tarea_id, user_id } });
  return { ok: true };
};

// ---------- Estado / Aprobación / Kanban ----------

const setEstado = async (id, estado_id, feder_id, cancelacion_motivo = null) => {
  await ensureExists(models.TareaEstado, estado_id, 'Estado inválido');

  return sequelize.transaction(async (t) => {
    // Obtener tarea y estado actual
    const tarea = await models.Tarea.findByPk(id, {
      include: [{ model: models.TareaEstado, as: 'estado', attributes: ['id', 'codigo', 'nombre'] }],
      transaction: t
    });
    if (!tarea) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });

    const estadoAnterior = tarea.estado_id;
    const estadoAnteriorNombre = tarea.estado?.nombre;

    // ¿a qué estado vamos?
    const nuevoEstado = await models.TareaEstado.findByPk(estado_id, {
      attributes: ['id', 'codigo', 'nombre'],
      transaction: t
    });

    // Solo actualizar y registrar si cambió
    if (estadoAnterior !== estado_id) {
      if (nuevoEstado?.codigo === 'finalizada') {
        // cerrar la tarea: fecha y progreso al 100
        await models.Tarea.update(
          { estado_id, finalizada_at: new Date(), progreso_pct: 100, cancelacion_motivo: null },
          { where: { id }, transaction: t }
        );
      } else {
        // sacamos finalizada: limpiamos finalizada_at y recomputamos progreso real desde checklist
        // Si el estado es 'cancelada', guardamos el motivo, si no lo limpiamos
        const motivo = nuevoEstado?.codigo === 'cancelada' ? (cancelacion_motivo ?? null) : null;
        await models.Tarea.update(
          { estado_id, finalizada_at: null, cancelacion_motivo: motivo },
          { where: { id }, transaction: t }
        );
        await recomputeProgressPct(id, t);
      }

      // REGISTRAR EN HISTORIAL
      if (feder_id) {
        await registrarCambio({
          tarea_id: id,
          feder_id,
          tipo_cambio: TIPO_CAMBIO.ESTADO,
          accion: ACCION.UPDATED,
          valor_anterior: { id: estadoAnterior, nombre: estadoAnteriorNombre },
          valor_nuevo: { id: estado_id, nombre: nuevoEstado?.nombre, cancelacion_motivo },
          descripcion: cancelacion_motivo
            ? `Cambió el estado de "${estadoAnteriorNombre}" a "${nuevoEstado?.nombre}" con motivo: "${cancelacion_motivo}"`
            : `Cambió el estado de "${estadoAnteriorNombre}" a "${nuevoEstado?.nombre}"`,
          transaction: t
        });
      }
    }

    return { ok: true };
  });
};

const setAprobacion = async (id, aprobacion_estado_id, user_id, rechazo_motivo = null, feder_id = null) => {
  await ensureExists(models.TareaAprobacionEstado, aprobacion_estado_id, 'Estado de aprobación inválido');

  return sequelize.transaction(async (t) => {
    const tarea = await models.Tarea.findByPk(id, { transaction: t });
    if (!tarea) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });

    const estadoAnterior = tarea.aprobacion_estado_id;

    // Si no cambia, no hacemos nada
    if (estadoAnterior === aprobacion_estado_id) return { ok: true };

    const patch = { aprobacion_estado_id, rechazo_motivo: rechazo_motivo ?? null };
    if (aprobacion_estado_id === 3) { patch.aprobado_por_user_id = user_id; patch.aprobado_at = new Date(); }
    if (aprobacion_estado_id === 4) { patch.rechazado_por_user_id = user_id; patch.rechazado_at = new Date(); }

    await models.Tarea.update(patch, { where: { id }, transaction: t });

    if (feder_id) {
      const nuevoEstado = await models.TareaAprobacionEstado.findByPk(aprobacion_estado_id, { transaction: t });
      const anteriorEstado = await models.TareaAprobacionEstado.findByPk(estadoAnterior, { transaction: t });

      await registrarCambio({
        tarea_id: id,
        feder_id,
        tipo_cambio: TIPO_CAMBIO.APROBACION,
        accion: ACCION.UPDATED,
        valor_anterior: { id: estadoAnterior, nombre: anteriorEstado?.nombre },
        valor_nuevo: { id: aprobacion_estado_id, nombre: nuevoEstado?.nombre },
        descripcion: `Cambió el estado de aprobación de "${anteriorEstado?.nombre}" a "${nuevoEstado?.nombre}"`,
        transaction: t
      });
    }

    return { ok: true };
  });
};

const moveKanban = async (tarea_id, user_id, { stage, orden = 0 }) => {
  if (!user_id) {
    throw Object.assign(new Error('Usuario no autenticado'), { status: 401 });
  }

  await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada');

  const now = new Date();
  const [row, created] = await models.TareaKanbanPos.findOrCreate({
    where: { tarea_id, user_id },
    defaults: {
      tarea_id,
      user_id,
      stage_code: stage,
      pos: orden,
      updated_at: now
    }
  });

  if (!created) {
    row.stage_code = stage;
    row.pos = orden;
    row.updated_at = now;
    await row.save();
  }

  return { ok: true };
};

// Wrapper usado por el controller: recibe userId numérico
export const svcMoveKanban = (id, userId, body) => moveKanban(id, userId, body);




// ---------- Catálogos y Compose ----------
const listCatalogos = async (customModels = models, scope = {}) => {
  const [
    estados,
    aprobacion_estados,
    impactos,
    urgencias,
    etiquetas,
    comentario_tipos,
    relacion_tipos,
    clientes,
    // TC Catalogs
    tc_redes,
    tc_formatos,
    tc_obj_negocio,
    tc_obj_marketing,
    tc_estados_pub
  ] = await Promise.all([
    customModels.TareaEstado.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['id', 'ASC']] }),
    customModels.TareaAprobacionEstado.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['id', 'ASC']] }),
    customModels.ImpactoTipo.findAll({ attributes: ['id', 'codigo', 'nombre', 'puntos'], order: [['id', 'ASC']] }),
    customModels.UrgenciaTipo.findAll({ attributes: ['id', 'codigo', 'nombre', 'puntos'], order: [['id', 'ASC']] }),
    customModels.TareaEtiqueta.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['nombre', 'ASC']] }),
    customModels.ComentarioTipo.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['id', 'ASC']] }),
    customModels.TareaRelacionTipo.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['id', 'ASC']] }),
    customModels.Cliente.findAll({ where: scope, attributes: ['id', 'nombre', 'color'], order: [['nombre', 'ASC']] }),
    // TC
    customModels.TCRedSocial.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['nombre', 'ASC']] }),
    customModels.TCFormato.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['nombre', 'ASC']] }),
    customModels.TCObjetivoNegocio.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['nombre', 'ASC']] }),
    customModels.TCObjetivoMarketing.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['nombre', 'ASC']] }),
    customModels.TCEstadoPublicacion.findAll({ attributes: ['id', 'codigo', 'nombre'], order: [['id', 'ASC']] })
  ]);

  const clienteIds = clientes.map(c => c.id);
  const hitosWhere = clienteIds.length ? { cliente_id: clienteIds } : {};
  const hitos = await customModels.ClienteHito.findAll({
    where: hitosWhere,
    attributes: ['id', 'cliente_id', 'nombre'],
    order: [['nombre', 'ASC']]
  });

  const feders = await customModels.Feder.findAll({
    where: { is_activo: true },
    attributes: ['id', 'user_id', 'nombre', 'apellido', 'avatar_url'],
    order: [['nombre', 'ASC'], ['apellido', 'ASC']]
  });

  return {
    estados,
    aprobacion_estados,
    impactos,
    urgencias,
    etiquetas,
    comentario_tipos,
    relacion_tipos,
    clientes,
    hitos,
    feders,
    // TC
    tc_redes,
    tc_formatos,
    tc_obj_negocio,
    tc_obj_marketing,
    tc_estados_pub
  };
};

const getCompose = async (idOrNull, user, customModels = models) => {
  const ctx = await getUserContext(user);
  const scopeClientes = {};
  const [catalog, tarea] = await Promise.all([
    listCatalogos(customModels, scopeClientes),
    idOrNull ? getTaskById(idOrNull, user) : Promise.resolve(null)
  ]);
  return { catalog, tarea };
};

// =============================
// ========== svc* API =========
// =============================
export const svcListCatalogos = (customModels = models) => listCatalogos(customModels);
export const svcGetCompose = (idOrNull, user, customModels = models) => getCompose(idOrNull, user, customModels);

export const svcListTasks = async (q, user) => {
  const rows = await listTasks(q, user);
  const total = await countTasks(q, user);
  return { total, rows };
};
export const svcGetTask = (id, user) => getTaskById(id, user);
export const svcCreateTask = async (body, user) => {
  const row = await createTask(body, user?.feder_id ?? null);
  return getTaskById(row.id, user);
};
export const svcUpdateTask = async (id, body, user) => {
  const feder_id = user?.feder_id;
  const roles = user?.roles || [];
  const isDirectivo = roles.includes('NivelA') || roles.includes('NivelB');

  // Si no es directivo, verificar si es participante o creador
  if (!isDirectivo) {
    const tarea = await models.Tarea.findByPk(id, { attributes: ['creado_por_feder_id'] });
    if (!tarea) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });

    const isCreator = Number(tarea.creado_por_feder_id) === Number(feder_id);
    const [isResp, isColab] = await Promise.all([
      models.TareaResponsable.findOne({ where: { tarea_id: id, feder_id } }),
      models.TareaColaborador.findOne({ where: { tarea_id: id, feder_id } })
    ]);

    if (!isCreator && !isResp && !isColab) {
      throw Object.assign(new Error('No tenés permisos para editar esta tarea.'), { status: 403 });
    }

    // REGLA: Solo directivos pueden Aprobar o Cancelar
    if (body.estado_id !== undefined) {
      const targetState = await models.TareaEstado.findByPk(body.estado_id);
      if (targetState && (targetState.codigo === 'aprobada' || targetState.codigo === 'cancelada')) {
        throw Object.assign(new Error(`Solo los directivos pueden marcar una tarea como ${targetState.nombre}.`), { status: 403 });
      }
    }

    // REGLA: Solo Responsables/Creadores pueden cambiar Vencimiento
    const hasVencimiento = Object.prototype.hasOwnProperty.call(body, 'vencimiento');
    if (hasVencimiento && body.vencimiento !== undefined) {
      if (!isResp && !isCreator) {
        throw Object.assign(new Error('Solo los responsables de la tarea pueden modificar la fecha de vencimiento.'), { status: 403 });
      }
    }
  }

  return updateTask(id, body, feder_id, user);
};

// ---------- ELIMINAR TAREA (Soft Delete) ---------- //
const deleteTask = async (id, feder_id = null) => {
  return sequelize.transaction(async (t) => {
    const tarea = await models.Tarea.findByPk(id, { transaction: t });
    if (!tarea) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });

    // Registramos en historial ANTES de borrar
    if (feder_id) {
      await registrarCambio({
        tarea_id: id,
        feder_id,
        tipo_cambio: TIPO_CAMBIO.ARCHIVADO, // Reusamos archivado p/ historial o definimos uno
        accion: ACCION.DELETED,
        valor_anterior: { titulo: tarea.titulo },
        descripcion: `Movió la tarea "${tarea.titulo}" a la papelera`,
        transaction: t
      });
      // Guardar quién la borró en la propia tarea antes del soft delete
      await models.Tarea.update({ deleted_by_feder_id: feder_id }, { where: { id }, transaction: t });
    }

    // Soft delete (Sequelize con paranoid: true lo hace automáticamente si usamos destroy)
    await models.Tarea.destroy({ where: { id }, transaction: t });

    // Soft delete subtareas (hijos)
    if (feder_id) {
      await models.Tarea.update({ deleted_by_feder_id: feder_id }, { where: { tarea_padre_id: id }, transaction: t });
    }
    await models.Tarea.destroy({ where: { tarea_padre_id: id }, transaction: t });

    return { ok: true, deleted_id: id };
  });
};

const restoreTask = async (id, feder_id = null) => {
  return sequelize.transaction(async (t) => {
    const tarea = await models.Tarea.findByPk(id, { paranoid: false, transaction: t });
    if (!tarea) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });
    if (!tarea.deleted_at) return { ok: true, restored_id: id };

    await tarea.restore({ transaction: t });
    // Limpiar quién la borró
    await tarea.update({ deleted_by_feder_id: null }, { transaction: t });

    // Restaurar subtareas que fueron borradas al mismo tiempo (aprox)
    // O simplemente restaurar todas las que tengan tarea_padre_id = id y estén borradas
    await models.Tarea.restore({ where: { tarea_padre_id: id }, transaction: t });
    await models.Tarea.update({ deleted_by_feder_id: null }, { where: { tarea_padre_id: id }, transaction: t });

    if (feder_id) {
      await registrarCambio({
        tarea_id: id,
        feder_id,
        tipo_cambio: TIPO_CAMBIO.ARCHIVADO,
        accion: ACCION.UPDATED,
        valor_nuevo: { titulo: tarea.titulo },
        descripcion: `Restauró la tarea "${tarea.titulo}" de la papelera`,
        transaction: t
      });
    }

    return { ok: true, restored_id: id };
  });
};

const listTrash = async (user) => {
  const repl = { uid: user?.id ?? 0 };
  const sql = `
    SELECT
      t.id, t.titulo, t.descripcion, t.cliente_id, t.hito_id,
      t.creado_por_feder_id, t.deleted_at, t.deleted_by_feder_id,
      c.nombre AS cliente_nombre,
      c.color AS cliente_color,
      f.nombre AS autor_nombre, f.apellido AS autor_apellido
    FROM "Tarea" t
    LEFT JOIN "Cliente" c ON c.id = t.cliente_id
    LEFT JOIN "Feder" f ON f.id = t.deleted_by_feder_id
    WHERE t.deleted_at IS NOT NULL
    ORDER BY t.deleted_at DESC
  `;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

export const svcDeleteTask = async (id, user) => {
  const feder_id = user?.feder_id;
  if (!feder_id) throw Object.assign(new Error('Usuario no autenticado'), { status: 401 });

  // Verificar permisos - solo NivelA o NivelB pueden eliminar
  const userRoles = user?.roles || [];

  console.log('[svcDeleteTask] intentando eliminar tarea con id:', id);
  console.log('[svcDeleteTask] User:', user?.email, 'Roles:', JSON.stringify(userRoles), 'Feder:', feder_id);

  // Verificar si tiene NivelA o NivelB (los roles son strings)
  const isDirectivo = userRoles.includes('NivelA') || userRoles.includes('NivelB');

  console.log('[svcDeleteTask] isDirectivo:', isDirectivo);

  if (!isDirectivo) {
    console.log('[svcDeleteTask] RECHAZADO: No tiene permiso de directivo');
    throw Object.assign(
      new Error(`Solo los directivos pueden eliminar tareas. Roles actuales: ${userRoles.join(', ') || 'ninguno'}`),
      { status: 403 }
    );
  }

  console.log('[svcDeleteTask] PROCEDIENDO A ELIMINAR');
  return deleteTask(id, feder_id);
};
// ========== BOOST MANUAL ========== //
export const svcSetBoostManual = async (tarea_id, enabled, user) => {
  const feder_id = user?.feder_id;
  if (!feder_id) throw new Error('Usuario no autenticado');

  return await sequelize.transaction(async (t) => {
    const tarea = await models.Tarea.findByPk(tarea_id, { transaction: t });
    if (!tarea) throw new Error('Tarea no encontrada');

    // Validar que sea responsable o NivelB
    const isResponsable = await models.TareaResponsable.findOne({
      where: { tarea_id, feder_id },
      transaction: t
    });

    // Verificar si es NivelB
    const userRoles = user?.roles || [];
    const isNivelB = userRoles.some(r => r === 'NivelB' || r?.nombre === 'NivelB');

    if (!isResponsable && !isNivelB) {
      throw new Error('Solo los responsables o NivelB pueden dar prioridad a la tarea');
    }

    const boost_manual = enabled ? 300 : 0;
    const anterior = tarea.boost_manual;

    // Actualizar boost
    await models.Tarea.update(
      { boost_manual },
      { where: { id: tarea_id }, transaction: t }
    );

    // Registrar en historial
    await registrarCambio({
      tarea_id,
      feder_id,
      tipo_cambio: TIPO_CAMBIO.PRIORIDAD,
      accion: enabled ? ACCION.UPDATED : ACCION.UPDATED,
      valor_anterior: { boost: anterior },
      valor_nuevo: { boost: boost_manual },
      descripcion: enabled
        ? 'Dio prioridad manual a la tarea'
        : 'Quitó prioridad manual de la tarea',
      transaction: t
    });

    // Devolver la tarea completa con todas las relaciones
    return tarea_id;
  });

  // Fuera de la transacción, obtener tarea completa
  return await getTaskById(tarea_id, user);
};

export const svcArchiveTask = (id, on = true) => archiveTask(id, on);
export const svcListTrash = (user) => listTrash(user);
export const svcRestoreTask = (id, user) => restoreTask(id, user?.feder_id);

// Responsables / Colaboradores
export const svcAddResponsable = (tarea_id, { feder_id, es_lider = false }, user) => addResponsable(tarea_id, feder_id, es_lider, user?.feder_id);
export const svcRemoveResponsable = (tarea_id, feder_id, user) => removeResponsable(tarea_id, feder_id, user?.feder_id);
export const svcAddColaborador = (tarea_id, { feder_id, rol = null }, user) => addColaborador(tarea_id, feder_id, rol, user?.feder_id);
export const svcRemoveColaborador = (tarea_id, feder_id, user) => removeColaborador(tarea_id, feder_id, user?.feder_id);

// Etiquetas
export const svcAssignEtiqueta = (tarea_id, etiqueta_id) => assignEtiqueta(tarea_id, etiqueta_id);
export const svcUnassignEtiqueta = (tarea_id, etiqueta_id) => unassignEtiqueta(tarea_id, etiqueta_id);

// Checklist
export const svcListChecklist = (tarea_id) => listChecklist(tarea_id);
export const svcCreateChecklistItem = (tarea_id, titulo) => createChecklistItem(tarea_id, titulo);
export const svcUpdateChecklistItem = (item_id, patch) => updateChecklistItem(item_id, patch);
export const svcDeleteChecklistItem = (item_id) => deleteChecklistItem(item_id);
export const svcReorderChecklist = (tarea_id, ordenPairs) => reorderChecklist(tarea_id, ordenPairs);

// Comentarios
export const svcListComentarios = (tarea_id, user) => listComentarios(tarea_id, user);
export const svcCreateComentario = (tarea_id, feder_id, body) => createComentario(tarea_id, feder_id, body);

// Adjuntos (tarea)
export const svcAddAdjunto = (tarea_id, feder_id, meta) => addAdjunto(tarea_id, feder_id, meta);
export const svcRemoveAdjunto = (adjId, user) => removeAdjunto(adjId, user?.feder_id);

// Relaciones
export const svcCreateRelacion = (tarea_id, body, user) => createRelacion(tarea_id, body, user?.feder_id);
export const svcDeleteRelacion = (tarea_id, relId, user) => deleteRelacion(tarea_id, relId, user?.feder_id);

// Favoritos / Seguidores
export const svcSetFavorito = (tarea_id, user_id, on) => setFavorito(tarea_id, user_id, on);
export const svcSetSeguidor = (tarea_id, user_id, on) => setSeguidor(tarea_id, user_id, on);

// Estado / Aprobación / Kanban
export const svcSetEstado = (id, estado_id, feder_id, cancelacion_motivo = null) => setEstado(id, estado_id, feder_id, cancelacion_motivo);
export const svcSetAprobacion = (id, user_id, body, feder_id) => {
  const { aprobacion_estado_id, rechazo_motivo = null } = body || {};
  return setAprobacion(id, aprobacion_estado_id, user_id, rechazo_motivo, feder_id);
};

export const svcSetResponsableLeader = (tarea_id, feder_id) => setResponsableLeader(tarea_id, feder_id);

// Historial
import { obtenerHistorial, contarHistorial } from '../helpers/historial.helper.js';

export const svcGetHistorial = async (tarea_id, query) => {
  const { limit, offset, tipo_cambio } = query;
  const [rows, total] = await Promise.all([
    obtenerHistorial(tarea_id, { limit, offset, tipo_cambio }),
    contarHistorial(tarea_id, tipo_cambio)
  ]);
  return { total, rows };
};

// ---------- Métricas del Dashboard ----------
const getDashboardMetrics = async (user, query = {}) => {
  const feder_id = user?.feder_id;
  const user_id = user?.id;
  if (!feder_id) return {};

  const roles = user?.roles || [];
  const isDirectivo = roles.includes('NivelA') || roles.includes('NivelB');

  const replacements = {
    fid: feder_id,
    uid: user_id,
    today: new Date().toISOString().split('T')[0]
  };

  const scopingSQL = isDirectivo ? '' : `
    AND (
      t.creado_por_feder_id = :fid
      OR EXISTS (SELECT 1 FROM "TareaResponsable" xr WHERE xr.tarea_id=t.id AND xr.feder_id=:fid)
      OR EXISTS (SELECT 1 FROM "TareaColaborador" xc WHERE xc.tarea_id=t.id AND xc.feder_id=:fid)
      OR EXISTS (SELECT 1 FROM "TareaSeguidor" xs WHERE xs.tarea_id=t.id AND xs.user_id=:uid)
    )
  `;

  const tipo = query.tipo && query.tipo !== 'TODAS' ? query.tipo : null;
  if (tipo) replacements.tipo = tipo;

  const tipoSQL = tipo ? 'AND t.tipo = :tipo' : '';

  // 1. Pendientes (estado: pendiente)
  const sqlPendientes = `
    SELECT COUNT(*)::int as count 
    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id = t.estado_id
    WHERE t.is_archivada = false AND t.deleted_at IS NULL
      AND te.codigo = 'pendiente'
      ${tipoSQL}
      ${scopingSQL}
  `;

  // 2. En Curso (estado: en_curso)
  const sqlEnCurso = `
    SELECT COUNT(*)::int as count 
    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id = t.estado_id
    WHERE t.is_archivada = false AND t.deleted_at IS NULL
      AND te.codigo = 'en_curso'
      ${tipoSQL}
      ${scopingSQL}
  `;

  // 3. En Revisión (estado: revision)
  const sqlRevision = `
    SELECT COUNT(*)::int as count 
    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id = t.estado_id
    WHERE t.is_archivada = false AND t.deleted_at IS NULL
      AND te.codigo = 'revision'
      ${tipoSQL}
      ${scopingSQL}
  `;

  // 4. Aprobadas esta semana (estado: aprobada, últimos 7 días)
  const sqlAprobadasSemana = `
    SELECT COUNT(*)::int as count 
    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id = t.estado_id
    WHERE t.is_archivada = false AND t.deleted_at IS NULL
      AND te.codigo = 'aprobada'
      AND t.updated_at >= NOW() - INTERVAL '7 days'
      ${tipoSQL}
      ${scopingSQL}
  `;

  // 5. Notificaciones no leídas
  const sqlNotif = `
    SELECT COUNT(*)::int as count 
    FROM "NotificacionDestino"
    WHERE user_id = :uid AND read_at IS NULL
  `;

  const queries = {
    pendientes: sequelize.query(sqlPendientes, { type: QueryTypes.SELECT, replacements }),
    en_curso: sequelize.query(sqlEnCurso, { type: QueryTypes.SELECT, replacements }),
    revision: sequelize.query(sqlRevision, { type: QueryTypes.SELECT, replacements }),
    aprobadas_semana: sequelize.query(sqlAprobadasSemana, { type: QueryTypes.SELECT, replacements }),
    notif: sequelize.query(sqlNotif, { type: QueryTypes.SELECT, replacements })
  };

  const results = await Promise.all(Object.values(queries));
  const keys = Object.keys(queries);
  const data = {};
  keys.forEach((k, i) => { data[k] = results[i][0]?.count || 0; });

  return {
    tareas_pendientes: data.pendientes,
    tareas_en_curso: data.en_curso,
    tareas_en_revision: data.revision,
    tareas_aprobadas_semana: data.aprobadas_semana,
    notif_unread: data.notif,
    is_directivo: isDirectivo,
    user_nombre: user.nombre || user.email.split('@')[0]
  };
};

/**
 * Obtiene las tareas más urgentes para el usuario
 */
export const svcGetUrgentTasks = async (user) => {
  const fid = user?.feder_id;
  if (!fid) return [];

  const sql = `
    SELECT 
      t.id, t.titulo, t.vencimiento, t.prioridad_num, t.boost_manual,
      te.nombre as estado_nombre, te.codigo as estado_codigo,
      c.nombre as cliente_nombre, c.color as cliente_color,
      fa.nombre as autor_nombre, fa.apellido as autor_apellido
    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id = t.estado_id
    LEFT JOIN "Cliente" c ON c.id = t.cliente_id
    LEFT JOIN "Feder" fa ON fa.id = t.creado_por_feder_id
    WHERE t.is_archivada = false 
      AND t.deleted_at IS NULL
      AND te.codigo NOT IN ('aprobada', 'cancelada')
      AND (
        t.creado_por_feder_id = :fid
        OR EXISTS (SELECT 1 FROM "TareaResponsable" xr WHERE xr.tarea_id=t.id AND xr.feder_id=:fid)
        OR EXISTS (SELECT 1 FROM "TareaColaborador" xc WHERE xc.tarea_id=t.id AND xc.feder_id=:fid)
        OR EXISTS (SELECT 1 FROM "TareaSeguidor" xs WHERE xs.tarea_id=t.id AND xs.user_id=:uid)
      )
    ORDER BY (t.prioridad_num + t.boost_manual) DESC, t.vencimiento ASC NULLS LAST
    LIMIT 10
  `;

  return sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: { fid, uid: user.id }
  });
};

export const svcGetDashboardMetrics = (user, query) => getDashboardMetrics(user, query);

// ---------- Reacciones en Comentarios ----------
const toggleComentarioReaccion = async (comentario_id, user_id, emoji, on = true) => {
  if (on) {
    await models.TareaComentarioReaccion.findOrCreate({
      where: { comentario_id, user_id, emoji },
      defaults: { comentario_id, user_id, emoji }
    });
  } else {
    await models.TareaComentarioReaccion.destroy({
      where: { comentario_id, user_id, emoji }
    });
  }
  return { ok: true };
};

export const svcToggleComentarioReaccion = (comentario_id, user_id, body) => {
  const { emoji, on = true } = body || {};
  return toggleComentarioReaccion(comentario_id, user_id, emoji, on);
};

// ---------- One Pager View (Phase 0 & 1) ----------
const getOnePager = async (cliente_id, tipo = 'ALL') => {
  const repl = { cliente_id };
  let typeFilter = '';

  if (tipo !== 'ALL') {
    typeFilter = ' AND t.tipo = :tipo';
    repl.tipo = tipo;
  } else {
    // Si es ALL, traemos IT y TC
    typeFilter = " AND t.tipo IN ('IT', 'TC')";
  }

  const sql = `
    SELECT 
      t.id, 
      t.titulo, 
      t.descripcion,
      t.vencimiento, 
      t.tipo, 
      t.cliente_id,
      t.estado_id,
      t.progreso_pct,
      te.nombre AS estado_nombre,
      te.codigo AS estado_codigo,
      ttc.estado_publicacion_id,
      ttc.objetivo_marketing_id,
      ttc.objetivo_negocio_id,
      ttc.inamovible,
      tep.nombre AS estado_publicacion_nombre,
      tom.nombre AS objetivo_marketing_nombre,
      ton.nombre AS objetivo_negocio_nombre,
      -- IDs de participantes para permisos
      t.creado_por_feder_id AS creador_id,
      (SELECT json_agg(feder_id) FROM "TareaResponsable" WHERE tarea_id = t.id) as responsable_ids,
      (SELECT json_agg(feder_id) FROM "TareaColaborador" WHERE tarea_id = t.id) as colaborador_ids,
      -- Agregación de Redes Sociales
      COALESCE((
        SELECT json_agg(json_build_object('id', rs.id, 'nombre', rs.nombre))
        FROM "TareaTCRedSocial" trs
        JOIN "TCRedSocial" rs ON rs.id = trs.red_social_id
        WHERE trs.tarea_id = t.id
      ), '[]'::json) AS redes_sociales,
      -- Agregación de Formatos
      COALESCE((
        SELECT json_agg(json_build_object('id', f.id, 'nombre', f.nombre))
        FROM "TareaTCFormato" ttf
        JOIN "TCFormato" f ON f.id = ttf.formato_id
        WHERE ttf.tarea_id = t.id
      ), '[]'::json) AS formatos
    FROM "Tarea" t
    LEFT JOIN "TareaTC" ttc ON ttc.tarea_id = t.id
    LEFT JOIN "TareaEstado" te ON te.id = t.estado_id
    LEFT JOIN "TCEstadoPublicacion" tep ON tep.id = ttc.estado_publicacion_id
    LEFT JOIN "TCObjetivoMarketing" tom ON tom.id = ttc.objetivo_marketing_id
    LEFT JOIN "TCObjetivoNegocio" ton ON ton.id = ttc.objetivo_negocio_id
    WHERE t.cliente_id = :cliente_id
      AND t.deleted_at IS NULL
      ${typeFilter}
    ORDER BY t.vencimiento ASC NULLS LAST;
  `;

  return sequelize.query(sql, {
    replacements: repl,
    type: QueryTypes.SELECT
  });
};

const getOnePagerSummary = async (user) => {
  const { roles, feder_id } = await getUserContext(user);
  const isDirectivo = isNivelA(roles) || isNivelB(roles);
  const fid = feder_id || -1;
  const uid = user?.id || -1;

  let scopingFilter = '';
  if (!isDirectivo) {
    scopingFilter = `
      AND (
        t.creado_por_feder_id = :fid
        OR EXISTS (SELECT 1 FROM "TareaResponsable" xr WHERE xr.tarea_id=t.id AND xr.feder_id=:fid)
        OR EXISTS (SELECT 1 FROM "TareaColaborador" xc WHERE xc.tarea_id=t.id AND xc.feder_id=:fid)
        OR EXISTS (SELECT 1 FROM "TareaSeguidor" xs WHERE xs.tarea_id=t.id AND xs.user_id=:uid)
      )
    `;
  }

  const sql = `
    SELECT 
      c.id, 
      c.nombre,
      (
        SELECT COUNT(*) 
        FROM "Tarea" t 
        JOIN "TareaEstado" te ON te.id = t.estado_id
        WHERE t.cliente_id = c.id 
          AND t.deleted_at IS NULL 
          AND t.tipo IN ('IT', 'TC')
          AND te.codigo NOT IN ('aprobada', 'finalizada', 'cancelada')
          ${scopingFilter}
      ) as pending_count,
      ${isDirectivo ? `
      (
        SELECT jsonb_object_agg(estado_nombre, cnt)
        FROM (
          SELECT te.nombre as estado_nombre, COUNT(*) as cnt
          FROM "Tarea" t
          JOIN "TareaEstado" te ON te.id = t.estado_id
          WHERE t.cliente_id = c.id
            AND t.deleted_at IS NULL
            AND t.tipo IN ('IT', 'TC')
            AND te.codigo NOT IN ('aprobada', 'finalizada', 'cancelada')
          GROUP BY te.nombre
        ) s
      ) as status_counts
      ` : 'NULL as status_counts'}
    FROM "Cliente" c
    WHERE EXISTS (
        SELECT 1 FROM "Tarea" t 
        JOIN "TareaEstado" te ON te.id = t.estado_id
        WHERE t.cliente_id = c.id 
          AND t.deleted_at IS NULL 
          AND t.tipo IN ('IT', 'TC')
          AND te.codigo NOT IN ('aprobada', 'finalizada', 'cancelada')
          ${scopingFilter}
    )
    ORDER BY c.nombre ASC;
  `;

  return sequelize.query(sql, {
    replacements: { fid, uid },
    type: QueryTypes.SELECT
  });
};

export const svcGetOnePagerSummary = (user) => getOnePagerSummary(user);

export const svcGetOnePager = (cliente_id, tipo) => getOnePager(cliente_id, tipo);
