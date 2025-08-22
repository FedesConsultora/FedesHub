// backend/src/modules/tareas/controllers/tareas.controller.js
import { initModels } from '../../../models/registry.js';
import {
  listTasksQuerySchema, taskIdParamSchema, createTaskSchema, updateTaskSchema,
  setEstadoSchema, setAprobacionSchema, moveKanbanSchema,
  responsableSchema, colaboradorSchema, etiquetaAssignSchema,
  checklistCreateSchema, checklistUpdateSchema, checklistReorderSchema,
  commentCreateSchema, adjuntoCreateSchema, relacionCreateSchema,
  toggleBoolSchema,
  idParam, itemIdParam, federIdParam, etiquetaIdParam, adjIdParam, relIdParam, comentarioIdParam
} from '../validators.js';

import {
  svcListCatalogos, svcListTasks, svcGetTask, svcCreateTask, svcUpdateTask, svcArchiveTask,
  svcAddResponsable, svcRemoveResponsable, svcAddColaborador, svcRemoveColaborador,
  svcAssignEtiqueta, svcUnassignEtiqueta,
  svcListChecklist, svcCreateChecklistItem, svcUpdateChecklistItem, svcDeleteChecklistItem, svcReorderChecklist,
  svcListComentarios, svcCreateComentario, svcAddAdjunto, svcRemoveAdjunto,
  svcCreateRelacion, svcDeleteRelacion,
  svcSetFavorito, svcSetSeguidor, svcSetEstado, svcSetAprobacion, svcMoveKanban
} from '../services/tareas.service.js';

const models = await initModels();

export const health = (_req, res) => res.json({ module: 'tareas', ok: true });

// ---- Catálogos
export const listCatalogos = async (_req, res, next) => {
  try { res.json(await svcListCatalogos(models)); } catch (e) { next(e); }
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
    await svcSetEstado(id, estado_id);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const patchAprobacion = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = setAprobacionSchema.parse(req.body);
    await svcSetAprobacion(id, req.user.id, body);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const patchKanban = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = moveKanbanSchema.parse(req.body);
    await svcMoveKanban(id, body);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

// ---- Responsables / Colaboradores
export const postResponsable = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = responsableSchema.parse(req.body);
    await svcAddResponsable(id, body);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const deleteResponsable = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { federId } = federIdParam.parse(req.params);
    await svcRemoveResponsable(id, federId);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const postColaborador = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = colaboradorSchema.parse(req.body);
    await svcAddColaborador(id, body);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const deleteColaborador = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { federId } = federIdParam.parse(req.params);
    await svcRemoveColaborador(id, federId);
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
    res.json(await svcListComentarios(id));
  } catch (e) { next(e); }
};

export const postComentario = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = commentCreateSchema.parse(req.body);
    await svcCreateComentario(id, req.user.feder_id, body);
    res.status(201).json(await svcListComentarios(id));
  } catch (e) { next(e); }
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

export const deleteAdjuntoCtrl = async (req, res, next) => {
  try {
    const { adjId } = adjIdParam.parse(req.params);
    res.json(await svcRemoveAdjunto(adjId));
  } catch (e) { next(e); }
};

// ---- Relaciones
export const postRelacion = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = relacionCreateSchema.parse(req.body);
    await svcCreateRelacion(id, body);
    res.json(await svcGetTask(id, req.user));
  } catch (e) { next(e); }
};

export const deleteRelacionCtrl = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { relId } = relIdParam.parse(req.params);
    await svcDeleteRelacion(id, relId);
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
