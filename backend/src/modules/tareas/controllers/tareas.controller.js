// backend/src/modules/tareas/controllers/tareas.controller.js
import { initModels } from '../../../models/registry.js';
import {
  listTasksQuerySchema, taskIdParamSchema, createTaskSchema, updateTaskSchema,
  setEstadoSchema, setAprobacionSchema, moveKanbanSchema,
  responsableSchema, colaboradorSchema, etiquetaAssignSchema,
  checklistCreateSchema, checklistUpdateSchema, checklistReorderSchema,
  commentCreateSchema, adjuntoCreateSchema, relacionCreateSchema,
  toggleBoolSchema,
  idParam, itemIdParam, federIdParam, etiquetaIdParam, adjIdParam, relIdParam, comentarioIdParam, composeQuerySchema, setLeaderBodySchema,
  historialQuerySchema, boostManualSchema
} from '../validators.js';

import {
  svcListCatalogos, svcListTasks, svcGetTask, svcCreateTask, svcUpdateTask, svcArchiveTask,
  svcAddResponsable, svcRemoveResponsable, svcAddColaborador, svcRemoveColaborador,
  svcAssignEtiqueta, svcUnassignEtiqueta,
  svcListChecklist, svcCreateChecklistItem, svcUpdateChecklistItem, svcDeleteChecklistItem, svcReorderChecklist,
  svcListComentarios, svcCreateComentario, svcAddAdjunto, svcRemoveAdjunto,
  svcCreateRelacion, svcDeleteRelacion,
  svcSetFavorito, svcSetSeguidor, svcSetEstado, svcSetAprobacion, svcMoveKanban,
  svcGetCompose, svcSetResponsableLeader,
  svcGetHistorial, svcSetBoostManual
} from '../services/tareas.service.js';

import { saveUploadedFiles, getFolderLink } from '../../../infra/storage/index.js';
import { svcCreate as notifCreate } from '../../notificaciones/services/notificaciones.service.js';

const models = await initModels();

/* =========================
   Helpers para notificaciones
   ========================= */
function buildBaseUrl(req) {
  const baseFromEnv = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (baseFromEnv) return baseFromEnv;
  const host = req.get?.('x-forwarded-host') || req.get?.('host');
  const proto = (req.get?.('x-forwarded-proto') || req.protocol || 'https');
  return host ? `${proto}://${host}` : '';
}

// Obtiene user_id de cada feder y arma destinos válidos (excluye al autor)
async function federIdsToDestinos(federIds = [], req) {
  const uniq = Array.from(new Set(federIds.map(Number).filter(Boolean)));
  if (!uniq.length) return [];
  const feders = await models.Feder.findAll({ where: { id: uniq }, attributes: ['id', 'user_id'] });
  return feders
    .map(f => ({ user_id: f.user_id, feder_id: f.id }))
    .filter(d => d.user_id && d.user_id !== req.user?.id);
}


export const postResponsableLeader = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params)
    const { feder_id } = setLeaderBodySchema.parse(req.body)
    await svcSetResponsableLeader(id, feder_id)      // setea exclusivo
    const tarea = await svcGetTask(id, req.user)     // devolver tarea actualizada
    res.json(tarea)
  } catch (e) { next(e) }
}

// Notifica asignación (rol: 'responsable' | 'colaborador')
async function notifyAsignacionTarea(tarea, req, federIds = [], rol = 'responsable') {
  const destinos = await federIdsToDestinos(federIds, req);
  if (!destinos.length) return;

  const baseUrl = buildBaseUrl(req);
  const linkUrl = baseUrl ? `${baseUrl}/tareas/${tarea.id}` : undefined;
  const tituloRol = rol === 'colaborador' ? 'Te agregaron como colaborador' : 'Te asignaron como responsable';

  await notifCreate({
    tipo_codigo: 'tarea_asignada',
    titulo: `${tituloRol} en "${tarea.titulo}"`,
    mensaje: (tarea.descripcion || '').slice(0, 180),
    data: { tarea_id: Number(tarea.id) }, // para que el front use sonido de tareas
    link_url: linkUrl,
    tarea_id: Number(tarea.id),
    destinos,
    canales: ['in_app', 'push']
  }, req.user);
}

/* =========================
   Endpoints
   ========================= */

export const health = (_req, res) => res.json({ module: 'tareas', ok: true });

export const getCompose = async (req, res, next) => {
  try {
    const { id } = composeQuerySchema.parse(req.query);
    const payload = await svcGetCompose(id ?? null, req.user, models);
    res.json(payload);
  } catch (e) { next(e); }
};

// ---- Catálogos
export const listCatalogos = async (_req, res, next) => {
  try { res.json(await svcListCatalogos(models)); } catch (e) { next(e); }
};

export const postAdjuntoUpload = async (req, res, next) => {
  try {
    const tareaId = Number(req.params.id);
    const files = req.files || [];

    req.log?.info('tareas.upload:start', {
      tareaId,
      filesMeta: files.map(f => ({
        originalname: f.originalname, mimetype: f.mimetype, size: f.size
      }))
    });

    // 1) Subir al storage (retorna metadata propia del storage)
    const saved = await saveUploadedFiles(files, ['tareas', String(tareaId)]);

    // 2) Persistir como adjuntos de la tarea
    const created = [];
    for (const f of saved) {
      // Intentamos cubrir distintos nombres de campos que pueda devolver saveUploadedFiles
      const nombre = f.originalname || f.name || f.filename || 'archivo';
      const mime = f.mime || f.mimetype || null;
      const bytes = f.bytes || f.size || null;
      const url = f.publicUrl || f.url || f.drive_url || null;
      const fileId = f.fileId || f.drive_file_id || null;

      const meta = {
        nombre,
        mime,
        tamano_bytes: bytes,
        drive_url: url,
        drive_file_id: fileId
      };

      const adj = await svcAddAdjunto(tareaId, req.user.feder_id, meta);
      created.push(adj);
    }

    // 3) Devolver lista actualizada (útil para que el front recargue)
    const tarea = await svcGetTask(tareaId, req.user);
    res.status(201).json({ ok: true, adjuntos: tarea.adjuntos || [], created });
  } catch (e) {
    req.log?.error('tareas.upload:err', { err: e?.message, stack: e?.stack });
    next(e);
  }
};


export const deleteAdjuntoCtrl = async (req, res, next) => {
  try {
    const { adjId } = adjIdParam.parse(req.params);
    await svcRemoveAdjunto(adjId, req.user);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

// (opcional) Link directo a carpeta de la tarea
export const getAdjuntosFolderLink = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const url = await getFolderLink(['tareas', String(id)]);
    res.json({ url });
  } catch (e) { next(e); }
};

// ---- Tareas CRUD/List
export const listTareas = async (req, res, next) => {
  try {
    const q = listTasksQuerySchema.parse(req.query);
    res.json(await svcListTasks(q, req.user));
  } catch (e) { next(e); }
};

export const getTarea = async (req, res, next) => {
  try {
    const { id } = taskIdParamSchema.parse(req.params);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const postTarea = async (req, res, next) => {
  try {
    const body = createTaskSchema.parse(req.body);
    const created = await svcCreateTask(body, req.user);
    res.status(201).json(created);

    // ---- Notificaciones (no bloqueantes)
    (async () => {
      try {
        // Releer desde DB por si el servicio ajustó algo
        const tarea = await svcGetTask(created.id, req.user);

        const respFids = (body.responsables || []).map(r => Number(r.feder_id)).filter(Boolean);
        const colaFids = (body.colaboradores || []).map(c => Number(c.feder_id)).filter(Boolean);

        await notifyAsignacionTarea(tarea, req, respFids, 'responsable');
        await notifyAsignacionTarea(tarea, req, colaFids, 'colaborador');
      } catch (err) {
        req.log?.error('tareas.create:notif:err', { err: err?.message, stack: err?.stack });
      }
    })();

  } catch (e) { next(e); }
};

export const patchTarea = async (req, res, next) => {
  try {
    const { id } = taskIdParamSchema.parse(req.params);
    const body = updateTaskSchema.parse(req.body);
    res.json(await svcUpdateTask(id, body, req.user));
  } catch (e) { next(e); }
};

export const archiveTarea = async (req, res, next) => {
  try {
    const { id } = taskIdParamSchema.parse(req.params);
    const { on } = toggleBoolSchema.parse(req.body);
    res.json(await svcArchiveTask(id, on));
  } catch (e) { next(e); }
};

// ---- Estado / aprobación / kanban
export const patchEstado = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { estado_id } = setEstadoSchema.parse(req.body);
    await svcSetEstado(id, estado_id, req.user.feder_id);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const patchAprobacion = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = setAprobacionSchema.parse(req.body);
    await svcSetAprobacion(id, req.user.id, body, req.user.feder_id);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const patchKanban = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = moveKanbanSchema.parse(req.body);

    const userId = req.auth?.userId ?? req.user?.id ?? null;
    req.log?.info('tareas.kanban:move:start', { id, body, userId });

    if (!userId) {
      throw Object.assign(new Error('Usuario no autenticado'), { status: 401 });
    }

    const out = await svcMoveKanban(Number(id), Number(userId), body);
    req.log?.info('tareas.kanban:move:ok', { id, userId });
    res.json(out);
  } catch (err) {
    req.log?.error('tareas.kanban:move:err', { err: err?.message, stack: err?.stack });
    next(err);
  }
};

// ---- Responsables / Colaboradores
export const postResponsable = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = responsableSchema.parse(req.body);
    await svcAddResponsable(id, body, req.user);
    const tarea = await svcGetTask(id, req.user);
    res.json(tarea);

    // Notificación en background
    (async () => {
      try { await notifyAsignacionTarea(tarea, req, [body.feder_id], 'responsable'); }
      catch (err) { req.log?.error('tareas.addResp:notif:err', { err: err?.message }); }
    })();
  } catch (e) { next(e); }
};

export const deleteResponsable = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { federId } = federIdParam.parse(req.params);
    await svcRemoveResponsable(id, federId, req.user);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const postColaborador = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = colaboradorSchema.parse(req.body);
    await svcAddColaborador(id, body, req.user);
    const tarea = await svcGetTask(id, req.user);
    res.json(tarea);

    // Notificación en background
    (async () => {
      try { await notifyAsignacionTarea(tarea, req, [body.feder_id], 'colaborador'); }
      catch (err) { req.log?.error('tareas.addColab:notif:err', { err: err?.message }); }
    })();
  } catch (e) { next(e); }
};

export const deleteColaborador = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { federId } = federIdParam.parse(req.params);
    await svcRemoveColaborador(id, federId, req.user);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

// ---- Etiquetas
export const postEtiqueta = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { etiqueta_id } = etiquetaAssignSchema.parse(req.body);
    await svcAssignEtiqueta(id, etiqueta_id);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const deleteEtiqueta = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { etiquetaId } = etiquetaIdParam.parse(req.params);
    await svcUnassignEtiqueta(id, etiquetaId);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

// ---- Checklist
export const getChecklist = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await svcListChecklist(id));
  } catch (e) { next(e); }
};

export const postChecklist = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { titulo } = checklistCreateSchema.parse(req.body);
    await svcCreateChecklistItem(id, titulo);
    res.json(await svcListChecklist(id));
  } catch (e) { next(e); }
};

export const patchChecklistItem = async (req, res, next) => {
  try {
    const { itemId } = itemIdParam.parse(req.params);
    const body = checklistUpdateSchema.parse(req.body);
    const upd = await svcUpdateChecklistItem(itemId, body);
    res.json(upd);
  } catch (e) { next(e); }
};

export const deleteChecklistItemCtrl = async (req, res, next) => {
  try {
    const { itemId } = itemIdParam.parse(req.params);
    res.json(await svcDeleteChecklistItem(itemId));
  } catch (e) { next(e); }
};

export const patchChecklistReorder = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { orden } = checklistReorderSchema.parse(req.body);
    res.json(await svcReorderChecklist(id, orden));
  } catch (e) { next(e); }
};

// ---- Comentarios
export const getComentarios = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await svcListComentarios(id, req.user));
  } catch (e) { next(e); }
};

export const postComentario = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = commentCreateSchema.parse(req.body); // incluye reply_to_id y menciones

    req.log?.info('tareas.postComentario:start', { tarea_id: id, body });

    const cm = await svcCreateComentario(id, req.user.feder_id, body);
    req.log?.info('tareas.postComentario:created', { comentario_id: cm.id });

    // responder primero
    res.status(201).json(await svcListComentarios(id, req.user));

    // ===== Notificaciones (no bloqueante) =====
    (async () => {
      try {
        req.log?.info('tareas.postComentario:notif:start');

        // --- 0) Robustez: releer menciones desde DB (lo persistido manda)
        let mencRows = await models.TareaComentarioMencion.findAll({
          where: { comentario_id: cm.id },
          attributes: ['feder_id'],
          raw: true
        });
        let mencionFederIds = Array.from(new Set(mencRows.map(r => Number(r.feder_id)).filter(Boolean)));

        // --- 0.b) Fallback: si no hay registros, parsear el texto en el servidor
        if (!mencionFederIds.length && body?.contenido) {
          const idsEnTexto = Array.from(body.contenido.matchAll(/@(\d+)\b/g)).map(m => Number(m[1]));
          mencionFederIds = Array.from(new Set(idsEnTexto.filter(Number.isFinite)));
        }
        req.log?.info('tareas.postComentario:notif:menciones', { mencionFederIds });

        if (!mencionFederIds.length) {
          req.log?.info('tareas.postComentario:notif:sin-menciones');
          return;
        }

        // --- 1) Resolver destinos (sólo usuarios válidos y distintos del autor)
        const destinos = await federIdsToDestinos(mencionFederIds, req);
        req.log?.info('tareas.postComentario:notif:destinos', { destinos });

        if (!destinos.length) {
          req.log?.warn('tareas.postComentario:notif:sin-destinos', { mencionFederIds });
          return;
        }

        // --- 2) Datos de la tarea y link
        const tarea = await models.Tarea.findByPk(id, { attributes: ['id', 'titulo'] });
        const baseUrl = buildBaseUrl(req);
        const linkUrl = baseUrl ? `${baseUrl}/tareas/${id}#c${cm.id}` : undefined;

        req.log?.info('tareas.postComentario:notif:payload', {
          tipo_codigo: 'tarea_comentario',
          linkUrl,
          canales: ['in_app', 'push']
        });

        // --- 3) Crear notificación (in_app + push)
        await notifCreate({
          tipo_codigo: 'tarea_comentario',
          titulo: `Mención en "${tarea?.titulo || 'tarea'}"`,
          mensaje: (body.contenido || '').slice(0, 180),
          data: { comentario: body.contenido, comentario_id: cm.id, tarea_id: Number(id) },
          link_url: linkUrl,
          tarea_id: Number(id),
          destinos,
          canales: ['in_app', 'push']
        }, req.user);

        req.log?.info('tareas.postComentario:notif:ok', { comentario_id: cm.id });
      } catch (err) {
        req.log?.error('tareas.postComentario:notif:fail', { err: err?.message, stack: err?.stack });
      }
    })();
  } catch (e) {
    req.log?.error('tareas.postComentario:err', { err: e?.message, stack: e?.stack });
    next(e);
  }
};

// ---- Adjuntos (a nivel tarea, no comentario)
export const getAdjuntos = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const tarea = await svcGetTask(id, req.user);
    res.json(tarea.adjuntos || []);
  } catch (e) { next(e); }
};

export const postAdjunto = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const meta = adjuntoCreateSchema.parse(req.body);
    await svcAddAdjunto(id, req.user.feder_id, meta);
    res.status(201).json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

// ---- Relaciones
export const postRelacion = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = relacionCreateSchema.parse(req.body);
    await svcCreateRelacion(id, body, req.user);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const deleteRelacionCtrl = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { relId } = relIdParam.parse(req.params);
    await svcDeleteRelacion(id, relId, req.user);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

// ---- Favoritos / Seguidores
export const postFavorito = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { on } = toggleBoolSchema.parse(req.body);
    await svcSetFavorito(id, req.user.id, on);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const postSeguidor = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { on } = toggleBoolSchema.parse(req.body);
    await svcSetSeguidor(id, req.user.id, on);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

// ---- Historial de cambios
export const getHistorial = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const query = historialQuerySchema.parse(req.query);
    const result = await svcGetHistorial(id, query);
    res.json(result);
  } catch (e) { next(e); }
};

export const patchBoostManual = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { enabled } = boostManualSchema.parse(req.body);
    const result = await svcSetBoostManual(id, enabled, req.user);
    res.json(result);
  } catch (e) { next(e); }
};