// backend/src/modules/tareas/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';
import { uploadFiles, multerErrorHandler } from '../../infra/uploads/multer.js';


import {
  health, listCatalogos,
  listTareas, getTarea, postTarea, patchTarea, archiveTarea,
  patchEstado, patchAprobacion, patchKanban,
  postResponsable, deleteResponsable, postColaborador, deleteColaborador,
  postEtiqueta, deleteEtiqueta,
  getChecklist, postChecklist, patchChecklistItem, deleteChecklistItemCtrl, patchChecklistReorder,
  getComentarios, postComentario,
  getAdjuntos, postAdjunto, deleteAdjuntoCtrl,
  postRelacion, deleteRelacionCtrl,
  postFavorito, postSeguidor,
  getCompose,
  postAdjuntoUpload
} from './controllers/tareas.controller.js';


const router = Router();

// Health
router.get('/health', health);

// Catálogos
router.get('/catalog', requireAuth, requirePermission('tareas','read'), listCatalogos);

router.get('/compose', requireAuth, requirePermission('tareas','read'), getCompose);

// Listado y CRUD
router.get('/',        requireAuth, requirePermission('tareas','read'),   listTareas);
router.get('/:id',     requireAuth, requirePermission('tareas','read'),   getTarea);
router.post('/',       requireAuth, requirePermission('tareas','create'), postTarea);
router.patch('/:id',   requireAuth, requirePermission('tareas','update'), patchTarea);
router.patch('/:id/archive', requireAuth, requirePermission('tareas','delete'), archiveTarea);

// Estado / aprobación / kanban
router.patch('/:id/estado',      requireAuth, requirePermission('tareas','update'),   patchEstado);
router.patch('/:id/aprobacion',  requireAuth, requirePermission('tareas','approve'),  patchAprobacion);
router.patch('/:id/kanban',      requireAuth, requirePermission('tareas','kanban'),   patchKanban);

// Subida de archivos (multipart): field "files"
router.post(
  '/:id/adjuntos/upload',
  requireAuth, requirePermission('tareas','attach'),
  uploadFiles,                 
  postAdjuntoUpload,
  multerErrorHandler            
);

// Responsables / Colaboradores
router.post('/:id/responsables',                 requireAuth, requirePermission('tareas','assign'), postResponsable);
router.delete('/:id/responsables/:federId',      requireAuth, requirePermission('tareas','assign'), deleteResponsable);
router.post('/:id/colaboradores',                requireAuth, requirePermission('tareas','assign'), postColaborador);
router.delete('/:id/colaboradores/:federId',     requireAuth, requirePermission('tareas','assign'), deleteColaborador);
// Etiquetas
router.post('/:id/etiquetas',                requireAuth, requirePermission('tareas','label'), postEtiqueta);
router.delete('/:id/etiquetas/:etiquetaId',  requireAuth, requirePermission('tareas','label'), deleteEtiqueta);

// Checklist
router.get('/:id/checklist',                    requireAuth, requirePermission('tareas','read'),    getChecklist);
router.post('/:id/checklist',                   requireAuth, requirePermission('tareas','update'),  postChecklist);
router.patch('/checklist/:itemId',              requireAuth, requirePermission('tareas','update'),  patchChecklistItem);
router.delete('/checklist/:itemId',             requireAuth, requirePermission('tareas','update'),  deleteChecklistItemCtrl);
router.patch('/:id/checklist/reorder',          requireAuth, requirePermission('tareas','update'),  patchChecklistReorder);

// Comentarios
router.get('/:id/comentarios',                  requireAuth, requirePermission('tareas','read'),     getComentarios);
router.post('/:id/comentarios',                 requireAuth, requirePermission('tareas','comment'),  postComentario);

// Adjuntos de tarea (no los del comentario, que se suben junto al comentario)
router.get('/:id/adjuntos',                     requireAuth, requirePermission('tareas','read'),     getAdjuntos);
router.post('/:id/adjuntos',                    requireAuth, requirePermission('tareas','attach'),   postAdjunto);
router.delete('/adjuntos/:adjId',               requireAuth, requirePermission('tareas','attach'),   deleteAdjuntoCtrl);

// Relaciones
router.post('/:id/relaciones',                  requireAuth, requirePermission('tareas','relate'),   postRelacion);
router.delete('/:id/relaciones/:relId',         requireAuth, requirePermission('tareas','relate'),   deleteRelacionCtrl);

// Favoritos / Seguidores
router.post('/:id/favorite',                    requireAuth, requirePermission('tareas','read'),     postFavorito);
router.post('/:id/follow',                      requireAuth, requirePermission('tareas','read'),     postSeguidor);

export default router;
// backend/src/modules/tareas/validators.js
import { z } from 'zod';

const boolish = z.preprocess(v => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional());
const dateOpt = z.preprocess(v => (v ? new Date(v) : null), z.date().nullable().optional());
const intId = z.coerce.number().int().positive();

// ---------- NUEVO: compose ----------
export const composeQuerySchema = z.object({
  id: intId.optional()
});

// ---------- Listado con filtros extendidos ----------
export const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),

  q: z.string().trim().min(1).max(200).optional(),

  // filtros unitarios
  cliente_id: intId.optional(),
  hito_id: intId.optional(),
  estado_id: intId.optional(),
  tarea_padre_id: z.coerce.number().int().positive().optional(),
  responsable_feder_id: intId.optional(),
  colaborador_feder_id: intId.optional(),
  etiqueta_id: intId.optional(),
  impacto_id: intId.optional(),
  urgencia_id: intId.optional(),
  aprobacion_estado_id: intId.optional(),

  // filtros múltiples
  cliente_ids: z.array(intId).optional(),
  estado_ids: z.array(intId).optional(),
  etiqueta_ids: z.array(intId).optional(),

  // flags
  solo_mias: boolish,
  include_archivadas: boolish,
  is_favorita: boolish,
  is_seguidor: boolish,

  // rangos de fechas (TODOS opcionales)
  vencimiento_from: dateOpt,
  vencimiento_to: dateOpt,
  inicio_from: dateOpt,
  inicio_to: dateOpt,
  created_from: dateOpt,
  created_to: dateOpt,
  updated_from: dateOpt,
  updated_to: dateOpt,
  finalizada_from: dateOpt,
  finalizada_to: dateOpt,

  // prioridad
  prioridad_min: z.coerce.number().int().min(0).optional(),
  prioridad_max: z.coerce.number().int().min(0).optional(),

  // orden
  orden_by: z.enum(['prioridad','vencimiento','fecha_inicio','created_at','updated_at','cliente','titulo'])
            .optional().default('prioridad'),
  sort: z.enum(['asc','desc']).optional().default('desc')
});

export const taskIdParamSchema = z.object({ id: intId });

export const createTaskSchema = z.object({
  cliente_id: intId,
  hito_id: intId.nullish(),
  tarea_padre_id: intId.nullish(),
  titulo: z.string().min(3).max(200),
  descripcion: z.string().max(10000).nullish(),
  estado_id: intId.optional(), // si no llega, default 'pendiente' en servicio
  requiere_aprobacion: z.boolean().optional().default(false),
  impacto_id: intId.optional(),
  urgencia_id: intId.optional(),
  fecha_inicio: dateOpt,
  vencimiento: dateOpt,
  etiquetas: z.array(intId).optional().default([]),
  responsables: z.array(z.object({ feder_id: intId, es_lider: z.boolean().optional().default(false) })).optional().default([]),
  colaboradores: z.array(z.object({ feder_id: intId, rol: z.string().max(100).nullish() })).optional().default([]),
  checklist: z.array(z.object({ titulo: z.string().min(1).max(200), is_done: z.boolean().optional().default(false) }))
    .optional().default([])
});

export const updateTaskSchema = z.object({
  cliente_id: intId.optional(),
  hito_id: intId.nullish().optional(),
  tarea_padre_id: intId.nullish().optional(),
  titulo: z.string().min(3).max(200).optional(),
  descripcion: z.string().max(10000).nullish().optional(),
  estado_id: intId.optional(),
  requiere_aprobacion: z.boolean().optional(),
  impacto_id: intId.optional(),
  urgencia_id: intId.optional(),
  fecha_inicio: dateOpt,
  vencimiento: dateOpt,
  progreso_pct: z.coerce.number().min(0).max(100).optional(),
  orden_kanban: z.coerce.number().int().optional(),
  is_archivada: z.boolean().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const setEstadoSchema = z.object({ estado_id: intId });

export const setAprobacionSchema = z.object({
  aprobacion_estado_id: intId,           // no_aplica / pendiente / aprobada / rechazada
  rechazo_motivo: z.string().max(2000).nullish().optional()
});

export const moveKanbanSchema = z.object({
  stage: z.enum(['inbox','today','week','month','later']),
  orden: z.coerce.number().int().optional().default(0)
});

export const responsableSchema = z.object({
  feder_id: intId,
  es_lider: z.boolean().optional().default(false)
});

export const colaboradorSchema = z.object({
  feder_id: intId,
  rol: z.string().max(100).nullish()
});

export const etiquetaAssignSchema = z.object({ etiqueta_id: intId });

export const checklistCreateSchema = z.object({ titulo: z.string().min(1).max(200) });
export const checklistUpdateSchema = z.object({ titulo: z.string().min(1).max(200).optional(), is_done: z.boolean().optional() })
  .refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });
export const checklistReorderSchema = z.object({ orden: z.array(z.object({ id: intId, orden: z.coerce.number().int() })).min(1) });

export const commentCreateSchema = z.object({
  tipo_id: intId,
  contenido: z.string().min(1).max(10000).or(z.literal('')).transform(v=>v||''), // permitimos vacío si hay adjuntos
  menciones: z.array(intId).optional().default([]),
  adjuntos: z.array(z.object({
    nombre: z.string().min(1).max(255),
    mime: z.string().max(120).nullish(),
    tamano_bytes: z.coerce.number().int().nonnegative().optional(),
    drive_file_id: z.string().max(255).nullish(),
    drive_url: z.string().max(512).url().nullish()
  })).optional().default([]),
  reply_to_id: intId.nullish().optional()
}).refine(obj => obj.contenido.trim().length > 0 || obj.adjuntos.length > 0, { message: 'Comentario vacío' })


export const adjuntoCreateSchema = z.object({
  nombre: z.string().min(1).max(255),
  mime: z.string().max(120).nullish(),
  tamano_bytes: z.coerce.number().int().nonnegative().optional(),
  drive_file_id: z.string().max(255).nullish(),
  drive_url: z.string().max(512).url().nullish()
});

export const relacionCreateSchema = z.object({ relacionada_id: intId, tipo_id: intId });

export const toggleBoolSchema = z.object({ on: z.boolean() });

export const idParam = z.object({ id: intId });
export const itemIdParam = z.object({ itemId: intId });
export const federIdParam = z.object({ federId: intId });
export const etiquetaIdParam = z.object({ etiquetaId: intId });
export const adjIdParam = z.object({ adjId: intId });
export const relIdParam = z.object({ relId: intId });
export const comentarioIdParam = z.object({ comentarioId: intId });
// backend/src/modules/tareas/controllers/tareas.controller.js
import { initModels } from '../../../models/registry.js';
import {
  listTasksQuerySchema, taskIdParamSchema, createTaskSchema, updateTaskSchema,
  setEstadoSchema, setAprobacionSchema, moveKanbanSchema,
  responsableSchema, colaboradorSchema, etiquetaAssignSchema,
  checklistCreateSchema, checklistUpdateSchema, checklistReorderSchema,
  commentCreateSchema, adjuntoCreateSchema, relacionCreateSchema,
  toggleBoolSchema,
  idParam, itemIdParam, federIdParam, etiquetaIdParam, adjIdParam, relIdParam, comentarioIdParam, composeQuerySchema
} from '../validators.js';

import {
  svcListCatalogos, svcListTasks, svcGetTask, svcCreateTask, svcUpdateTask, svcArchiveTask,
  svcAddResponsable, svcRemoveResponsable, svcAddColaborador, svcRemoveColaborador,
  svcAssignEtiqueta, svcUnassignEtiqueta,
  svcListChecklist, svcCreateChecklistItem, svcUpdateChecklistItem, svcDeleteChecklistItem, svcReorderChecklist,
  svcListComentarios, svcCreateComentario, svcAddAdjunto, svcRemoveAdjunto,
  svcCreateRelacion, svcDeleteRelacion,
  svcSetFavorito, svcSetSeguidor, svcSetEstado, svcSetAprobacion, svcMoveKanban,
  svcGetCompose
} from '../services/tareas.service.js';
import { saveUploadedFiles } from '../../../infra/storage/index.js';

const models = await initModels();

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
    const files = req.files || []; // vienen de multer (memory)
    // Opcional: validar mime/extension aquí
    const saved = await saveUploadedFiles(files, ['tareas', String(tareaId)]);
    // `saved` debería devolverte meta por archivo (id/url/mime/bytes/nombre)
    res.status(201).json({ ok: true, files: saved });
  } catch (e) { next(e); }
};

export const deleteAdjuntoCtrl = async (req, res, next) => {
  try {
    const { adjId } = adjIdParam.parse(req.params);
    // opcional: intentar borrar también en drive si tenés el drive_file_id (recuperalo antes)
    await svcRemoveAdjunto(adjId);
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

    // ← El auth middleware setea req.auth, NO req.user
    const userId = req.auth?.userId ?? null;
    if (!userId) {
      throw Object.assign(new Error('Usuario no autenticado'), { status: 401 });
    }

    const out = await svcMoveKanban(Number(id), userId, body);
    res.json(out);
  } catch (err) { next(err); }
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
    res.json(await svcListComentarios(id, req.user));
  } catch (e) { next(e); }
};

export const postComentario = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = commentCreateSchema.parse(req.body);          // ahora incluye reply_to_id
    await svcCreateComentario(id, req.user.feder_id, body);
    res.status(201).json(await svcListComentarios(id, req.user));
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
// -----------------------------------------------------------------------------

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../core/db.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

// ---------- Helpers de existencia / reglas ----------
const ensureExists = async (model, id, msg='No encontrado') => {
  if (id == null) return null;
  const row = await model.findByPk(id, { attributes: ['id'] });
  if (!row) throw Object.assign(new Error(msg), { status: 404 });
  return row;
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
  (ponderacion * 100) + (puntosImpacto || 0) + (puntosUrgencia || 0);

// --- Contexto de usuario para compose (roles y celula) ---
const getUserContext = async (user) => {
  if (!user) return { roles: new Set(), feder_id: null, celula_id: null };
  const u = await models.User.findByPk(user.id, {
    include: [{ model: models.Rol, as: 'roles', attributes: ['nombre'] }]
  });
  const roles = new Set((u?.roles || []).map(r => r.nombre));
  const feder = await models.Feder.findOne({ where: { user_id: user.id }, attributes: ['id','celula_id'] });
  return { roles, feder_id: feder?.id ?? null, celula_id: feder?.celula_id ?? null };
};

const isAdmin  = (roles) => roles.has('Admin');
const isCLevel = (roles) => roles.has('CLevel');

// ---- Scoping (básico): si solo_mias=true limita a creador/responsable/colaborador
// ---- EXTENDIDO: + filtros múltiples, flags, rango de prioridad y todos los rangos de fecha
const buildListSQL = (params = {}, currentUser) => {
  const {
    q,
    // unitarios
    cliente_id, hito_id, estado_id, responsable_feder_id, colaborador_feder_id,
    tarea_padre_id,
    etiqueta_id, impacto_id, urgencia_id, aprobacion_estado_id,
    // múltiples
    cliente_ids = [], estado_ids = [], etiqueta_ids = [],
    // flags
    solo_mias, include_archivadas, is_favorita, is_seguidor,
    // fechas
    vencimiento_from, vencimiento_to,
    inicio_from, inicio_to,
    created_from, created_to,
    updated_from, updated_to,
    finalizada_from, finalizada_to,
    // prioridad
    prioridad_min, prioridad_max,
    // orden/paginación
    orden_by='prioridad', sort='desc', limit=50, offset=0
  } = params;

  const repl = { limit, offset };
  const where = [];

    let sql = `
    SELECT
      t.id, t.titulo, t.descripcion, t.cliente_id, t.hito_id, t.tarea_padre_id,
      t.estado_id, te.codigo AS estado_codigo, te.nombre AS estado_nombre,
      t.impacto_id, it.puntos AS impacto_puntos, t.urgencia_id, ut.puntos AS urgencia_puntos,
      t.aprobacion_estado_id,
      t.prioridad_num, t.vencimiento, t.fecha_inicio, t.finalizada_at, t.is_archivada,
      t.progreso_pct, t.created_at, t.updated_at,
      tkp.stage_code AS kanban_stage, tkp.pos AS kanban_orden,
      c.nombre AS cliente_nombre,
      h.nombre AS hito_nombre,

      -- Responsables con datos del feder
      (SELECT COALESCE(json_agg(
                json_build_object(
                  'feder_id', tr.feder_id,
                  'es_lider', tr.es_lider,
                  'feder', json_build_object(
                    'id', f.id,
                    'user_id', f.user_id,
                    'nombre', f.nombre,
                    'apellido', f.apellido
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
                    'apellido', f.apellido
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
    LEFT JOIN "ClienteHito" h ON h.id = t.hito_id
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
  if (hito_id)    { where.push(`t.hito_id = :hito_id`);       repl.hito_id    = hito_id; }
  if (estado_id)  { where.push(`t.estado_id = :estado_id`);   repl.estado_id  = estado_id; }
  if (tarea_padre_id) { where.push(`t.tarea_padre_id = :parent_id`); repl.parent_id = tarea_padre_id; }
  if (impacto_id) { where.push(`t.impacto_id = :impacto_id`); repl.impacto_id = impacto_id; }
  if (urgencia_id){ where.push(`t.urgencia_id = :urgencia_id`); repl.urgencia_id = urgencia_id; }
  if (aprobacion_estado_id) { where.push(`t.aprobacion_estado_id = :aprob_id`); repl.aprob_id = aprobacion_estado_id; }

  // Filtros múltiples
  addIn('t.cliente_id', cliente_ids, 'cids_');
  addIn('t.estado_id',  estado_ids,  'eids_');

  if (etiqueta_ids?.length) {
    const keys = etiqueta_ids.map((_, i) => `et${i}`);
    where.push(`EXISTS (SELECT 1 FROM "TareaEtiquetaAsig" xe WHERE xe.tarea_id=t.id AND xe.etiqueta_id IN (${keys.map(k => ':' + k).join(',')}))`);
    keys.forEach((k, i) => { repl[k] = etiqueta_ids[i]; });
  }

  if (etiqueta_id) {
    where.push(`EXISTS (SELECT 1 FROM "TareaEtiquetaAsig" xe WHERE xe.tarea_id=t.id AND xe.etiqueta_id=:et)`);
    repl.et = etiqueta_id;
  }

  // Flags
  if (include_archivadas !== true) where.push(`t.is_archivada = false`);
  if (is_favorita === true) where.push(`EXISTS(SELECT 1 FROM "TareaFavorito" tf WHERE tf.tarea_id=t.id AND tf.user_id=:uid)`);
  if (is_seguidor === true) where.push(`EXISTS(SELECT 1 FROM "TareaSeguidor" ts WHERE ts.tarea_id=t.id AND ts.user_id=:uid)`);

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

  // Rangos de fechas
  if (vencimiento_from) { where.push(`t.vencimiento >= :vfrom`); repl.vfrom = vencimiento_from; }
  if (vencimiento_to)   { where.push(`t.vencimiento <= :vto`);   repl.vto   = vencimiento_to; }
  if (inicio_from)      { where.push(`t.fecha_inicio >= :ifrom`); repl.ifrom = inicio_from; }
  if (inicio_to)        { where.push(`t.fecha_inicio <= :ito`);   repl.ito   = inicio_to; }
  if (created_from)     { where.push(`t.created_at >= :cfrom`);   repl.cfrom = created_from; }
  if (created_to)       { where.push(`t.created_at <= :cto`);     repl.cto   = created_to; }
  if (updated_from)     { where.push(`t.updated_at >= :ufrom`);   repl.ufrom = updated_from; }
  if (updated_to)       { where.push(`t.updated_at <= :uto`);     repl.uto   = updated_to; }
  if (finalizada_from)  { where.push(`t.finalizada_at >= :ffrom`); repl.ffrom = finalizada_from; }
  if (finalizada_to)    { where.push(`t.finalizada_at <= :fto`);   repl.fto   = finalizada_to; }

  // Prioridad
  if (typeof prioridad_min === 'number') { where.push(`t.prioridad_num >= :pmin`); repl.pmin = prioridad_min; }
  if (typeof prioridad_max === 'number') { where.push(`t.prioridad_num <= :pmax`); repl.pmax = prioridad_max; }

  if (where.length) sql += ` WHERE ${where.join(' AND ')}\n`;

  // Orden
  const orderCol =
      orden_by === 'vencimiento'   ? 't.vencimiento'
    : orden_by === 'fecha_inicio'  ? 't.fecha_inicio'
    : orden_by === 'created_at'    ? 't.created_at'
    : orden_by === 'updated_at'    ? 't.updated_at'
    : orden_by === 'cliente'       ? 'cliente_nombre'
    : orden_by === 'titulo'        ? 't.titulo'
    : 't.prioridad_num'; // default

  sql += ` ORDER BY ${orderCol} ${sort.toUpperCase()} NULLS LAST, t.id DESC LIMIT :limit OFFSET :offset`;

  return { sql, repl };
};


const listTasks = async (params, currentUser) => {
  const { sql, repl } = buildListSQL(params, currentUser);
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: repl });
};

const countTasks = async (params, currentUser) => {
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
      tkp.stage_code AS kanban_stage, tkp.pos AS kanban_orden,
      c.id AS cliente_id, c.nombre AS cliente_nombre,
      h.id AS hito_id, h.nombre AS hito_nombre,

      /* ===== Responsables (con datos del Feder) ===== */
      (SELECT COALESCE(json_agg(
                json_build_object(
                  'feder_id', tr.feder_id,
                  'es_lider', tr.es_lider,
                  'feder', json_build_object(
                    'id', f.id,
                    'user_id', f.user_id,
                    'nombre', f.nombre,
                    'apellido', f.apellido
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
                    'apellido', f.apellido
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
                        'id',a.id,'nombre',a.nombre,'mime',a.mime,'drive_url',a.drive_url
                    )), '[]'::json)
                    FROM "TareaAdjunto" a
                    WHERE a.comentario_id = cm.id
                  ),
                  /* preview de reply (si corresponde) */
                  'reply_to', CASE WHEN cm.reply_to_id IS NOT NULL THEN json_build_object(
                    'id', p.id,
                    'autor', pf.nombre || ' ' || pf.apellido,
                    'excerpt', left(regexp_replace(p.contenido, E'\\s+', ' ', 'g'), 140)
                  ) ELSE NULL END
                )
                ORDER BY cm.created_at
              )
         FROM "TareaComentario" cm
         JOIN "Feder" f ON f.id = cm.feder_id
         LEFT JOIN "TareaComentario" p ON p.id = cm.reply_to_id
         LEFT JOIN "Feder" pf ON pf.id = p.feder_id
        WHERE cm.tarea_id = t.id) AS comentarios,

      /* ===== Adjuntos a nivel tarea (no comentario) ===== */
      (SELECT json_agg(json_build_object('id',a.id,'nombre',a.nombre,'mime',a.mime,'drive_url',a.drive_url,'created_at',a.created_at))
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
    LEFT JOIN "ImpactoTipo" it ON it.id = t.impacto_id
    LEFT JOIN "UrgenciaTipo" ut ON ut.id = t.urgencia_id
    LEFT JOIN "Cliente" c ON c.id = t.cliente_id
    LEFT JOIN "ClienteHito" h ON h.id = t.hito_id
    LEFT JOIN "TareaKanbanPos" tkp ON tkp.tarea_id = t.id AND tkp.user_id = :uid
    WHERE t.id = :id
    LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { id, uid: currentUser?.id ?? 0 }});

  return rows[0] || null;
};




// ---------- CRUD de Tarea ----------
const createTask = async (payload, currentFederId) => {
  return sequelize.transaction(async (t) => {
    const {
      cliente_id, 
      hito_id, 
      tarea_padre_id, 
      titulo, 
      descripcion,
      estado_id, 
      requiere_aprobacion=false, 
      impacto_id=2, 
      urgencia_id=4,
      fecha_inicio=null, 
      vencimiento=null,
      responsables = [],            
      colaboradores = [],           
      adjuntos = []                 
    } = payload;

    await ensureExists(models.Cliente, cliente_id, 'Cliente no encontrado');
    if (hito_id)        await ensureExists(models.ClienteHito, hito_id, 'Hito no encontrado');
    if (tarea_padre_id) await ensureExists(models.Tarea, tarea_padre_id, 'Tarea padre no encontrada');

    const [puntos, ponderacion] = await Promise.all([
      getPuntos(impacto_id, urgencia_id),
      getClientePonderacion(cliente_id)
    ]);
    const prioridad_num = calcPrioridad(ponderacion, puntos.impacto, puntos.urgencia);

    // Estado default si no vino: 'pendiente'
    let estado = estado_id;
    if (!estado) {
      const est = await models.TareaEstado.findOne({ where: { codigo:'pendiente' }, transaction: t });
      estado = est?.id ?? null;
    }

    // Aprobación por defecto según flag
    const aprobRow = await models.TareaAprobacionEstado.findOne({
      where: { codigo: requiere_aprobacion ? 'pendiente' : 'no_aplica' }, transaction: t
    });
    const aprobacion_estado_id = aprobRow?.id ?? (requiere_aprobacion ? 2 : 1);

    const tarea = await models.Tarea.create({
      cliente_id, hito_id, tarea_padre_id, titulo, descripcion,
      estado_id: estado, creado_por_feder_id: currentFederId,
      requiere_aprobacion, aprobacion_estado_id,
      impacto_id, urgencia_id, prioridad_num,
      cliente_ponderacion: ponderacion,
      fecha_inicio, vencimiento
    }, { transaction: t });

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
        subido_por_feder_id: currentFederId
      }));
      await models.TareaAdjunto.bulkCreate(rows, { transaction: t });
    }

    return tarea;
  });
};


const updateTask = async (id, payload) => {
  return sequelize.transaction(async (t) => {
    const cur = await models.Tarea.findByPk(id, { transaction: t });
    if (!cur) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });

    if (payload.cliente_id)     await ensureExists(models.Cliente, payload.cliente_id, 'Cliente no encontrado');
    if (payload.hito_id)        await ensureExists(models.ClienteHito, payload.hito_id, 'Hito no encontrado');
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

const archiveTask = async (id, archive=true) => {
  await models.Tarea.update({ is_archivada: !!archive }, { where: { id } });
  return { ok: true };
};

// ---------- Responsables / Colaboradores ----------
const addResponsable = async (tarea_id, feder_id, es_lider=false) => {
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

const removeResponsable = async (tarea_id, feder_id) => {
  await models.TareaResponsable.destroy({ where: { tarea_id, feder_id } });
  return { ok: true };
};

const addColaborador = async (tarea_id, feder_id, rol=null) => {
  await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada');
  await ensureExists(models.Feder, feder_id, 'Feder no encontrado');
  const [row, created] = await models.TareaColaborador.findOrCreate({
    where: { tarea_id, feder_id },
    defaults: { tarea_id, feder_id, rol }
  });
  if (!created && rol !== undefined) { row.rol = rol; await row.save(); }
  return row;
};

const removeColaborador = async (tarea_id, feder_id) => {
  await models.TareaColaborador.destroy({ where: { tarea_id, feder_id } });
  return { ok: true };
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
  models.TareaChecklistItem.findAll({ where: { tarea_id }, order: [['orden','ASC'],['id','ASC']] });

const recomputeProgressPct = async (tarea_id, t = null) => {
  const total = await models.TareaChecklistItem.count({ where: { tarea_id }, transaction: t || undefined });
  const done  = await models.TareaChecklistItem.count({ where: { tarea_id, is_done: true }, transaction: t || undefined });
  const pct   = total ? Math.round((done / total) * 10000) / 100 : 0;
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

const reorderChecklist = async (tarea_id, ordenPairs=[]) =>
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
          'id', a.id, 'nombre', a.nombre, 'mime', a.mime, 'drive_url', a.drive_url
        ))
        FROM "TareaAdjunto" a
        WHERE a.comentario_id = cm.id
      ), '[]'::json) AS adjuntos,

      -- preview si es reply
      CASE WHEN cm.reply_to_id IS NOT NULL THEN json_build_object(
        'id', p.id,
        'autor', pf.nombre || ' ' || pf.apellido,
        'excerpt', left(regexp_replace(p.contenido, E'\\s+', ' ', 'g'), 140)
      ) ELSE NULL END AS reply_to

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
      uid:     currentUser?.id ?? 0,
      cur_fid: currentUser?.feder_id ?? 0
    }
  });



const createComentario = async (tarea_id, feder_id, { tipo_id, tipo_codigo, contenido, menciones=[], adjuntos=[], reply_to_id=null }) =>
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
      const rows = adjuntos.map(a => ({ ...a, tarea_id, comentario_id: cm.id, subido_por_feder_id: feder_id }));
      await models.TareaAdjunto.bulkCreate(rows, { transaction: t });
    }
    return cm;
});

// ---------- Adjuntos (a nivel tarea, no comentario) ----------
const addAdjunto = async (tarea_id, feder_id, meta) => {
  await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada');
  return models.TareaAdjunto.create({ ...meta, tarea_id, subido_por_feder_id: feder_id });
};

const removeAdjunto = async (adjId) => {
  await models.TareaAdjunto.destroy({ where: { id: adjId } });
  return { ok: true };
};

// ---------- Relaciones ----------
const createRelacion = async (tarea_id, { relacionada_id, tipo_id, tipo_codigo }) => {
  let resolvedTipoId = tipo_id ?? null;
  if (!resolvedTipoId && tipo_codigo) {
    const tipo = await models.TareaRelacionTipo.findOne({ where: { codigo: tipo_codigo } });
    if (!tipo) throw Object.assign(new Error('Tipo de relación no encontrado'), { status: 400 });
    resolvedTipoId = tipo.id;
  }
  await Promise.all([
    ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada'),
    ensureExists(models.Tarea, relacionada_id, 'Tarea relacionada no encontrada'),
    ensureExists(models.TareaRelacionTipo, resolvedTipoId, 'Tipo de relación no encontrado')
  ]);
  const [row] = await models.TareaRelacion.findOrCreate({
    where: { tarea_id, relacionada_id, tipo_id: resolvedTipoId },
    defaults: { tarea_id, relacionada_id, tipo_id: resolvedTipoId }
  });
  return row;
};

const deleteRelacion = async (tarea_id, relId) => {
  await models.TareaRelacion.destroy({ where: { id: relId, tarea_id } });
  return { ok: true };
};

// ---------- Favoritos / Seguidores ----------
const setFavorito = async (tarea_id, user_id, on) => {
  if (on) await models.TareaFavorito.findOrCreate({ where: { tarea_id, user_id }, defaults: { tarea_id, user_id }});
  else    await models.TareaFavorito.destroy({ where: { tarea_id, user_id } });
  return { ok: true };
};

const setSeguidor = async (tarea_id, user_id, on) => {
  if (on) await models.TareaSeguidor.findOrCreate({ where: { tarea_id, user_id }, defaults: { tarea_id, user_id }});
  else    await models.TareaSeguidor.destroy({ where: { tarea_id, user_id } });
  return { ok: true };
};

// ---------- Estado / Aprobación / Kanban ----------
const setEstado = async (id, estado_id) => {
  await ensureExists(models.TareaEstado, estado_id, 'Estado inválido');

  // ¿a qué estado vamos?
  const estado = await models.TareaEstado.findByPk(estado_id, { attributes: ['codigo'] });

  if (estado?.codigo === 'finalizada') {
    // cerrar la tarea: fecha y progreso al 100
    await models.Tarea.update(
      { estado_id, finalizada_at: new Date(), progreso_pct: 100 },
      { where: { id } }
    );
  } else {
    // sacamos finalizada: limpiamos finalizada_at y recomputamos progreso real desde checklist
    await models.Tarea.update(
      { estado_id, finalizada_at: null },
      { where: { id } }
    );
    await recomputeProgressPct(id); // ← ya la tenés definida más arriba
  }

  return { ok: true };
};

const setAprobacion = async (id, aprobacion_estado_id, user_id, rechazo_motivo=null) => {
  await ensureExists(models.TareaAprobacionEstado, aprobacion_estado_id, 'Estado de aprobación inválido');
  const patch = { aprobacion_estado_id, rechazo_motivo: rechazo_motivo ?? null };
  if (aprobacion_estado_id === 3) { patch.aprobado_por_user_id = user_id;  patch.aprobado_at = new Date(); }
  if (aprobacion_estado_id === 4) { patch.rechazado_por_user_id = user_id; patch.rechazado_at = new Date(); }
  await models.Tarea.update(patch, { where: { id } });
  return { ok: true };
};

// ---------- Estado / Aprobación / Kanban ----------
export const moveKanban = async (tarea_id, user_id, { stage, orden = 0 }) => {
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
    clientes
  ] = await Promise.all([
    customModels.TareaEstado.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] }),
    customModels.TareaAprobacionEstado.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] }),
    customModels.ImpactoTipo.findAll({ attributes: ['id','codigo','nombre','puntos'], order: [['id','ASC']] }),
    customModels.UrgenciaTipo.findAll({ attributes: ['id','codigo','nombre','puntos'], order: [['id','ASC']] }),
    customModels.TareaEtiqueta.findAll({ attributes: ['id','codigo','nombre'], order: [['nombre','ASC']] }),
    customModels.ComentarioTipo.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] }),
    customModels.TareaRelacionTipo.findAll({ attributes: ['id','codigo','nombre'], order: [['id','ASC']] }),
    customModels.Cliente.findAll({ where: scope, attributes: ['id','nombre','celula_id'], order: [['nombre','ASC']] })
  ]);

  const clienteIds = clientes.map(c => c.id);
  const hitosWhere = clienteIds.length ? { cliente_id: clienteIds } : {};
  const hitos = await customModels.ClienteHito.findAll({
    where: hitosWhere,
    attributes: ['id','cliente_id','nombre'],
    order: [['nombre','ASC']]
  });

  const feders = await customModels.Feder.findAll({
    attributes: ['id','user_id','nombre','apellido','celula_id'],
    order: [['nombre','ASC'], ['apellido','ASC']]
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
    feders
  };
};

const getCompose = async (idOrNull, user, customModels = models) => {
  const ctx = await getUserContext(user);
  const scopeClientes = (isAdmin(ctx.roles) || isCLevel(ctx.roles)) ? {} : { celula_id: ctx.celula_id };
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
export const svcGetCompose    = (idOrNull, user, customModels = models) => getCompose(idOrNull, user, customModels);

export const svcListTasks   = async (q, user) => {
  const rows  = await listTasks(q, user);
  const total = await countTasks(q, user);
  return { total, rows };
};
export const svcGetTask     = (id, user) => getTaskById(id, user);
export const svcCreateTask  = async (body, user) => {
  const row = await createTask(body, user?.feder_id ?? null);
  return getTaskById(row.id, user);
};
export const svcUpdateTask  = async (id, body, user) => {
  await updateTask(id, body);
  return getTaskById(id, user);
};
export const svcArchiveTask = (id, on=true) => archiveTask(id, on);

// Responsables / Colaboradores
export const svcAddResponsable    = (tarea_id, { feder_id, es_lider=false }) => addResponsable(tarea_id, feder_id, es_lider);
export const svcRemoveResponsable = (tarea_id, feder_id) => removeResponsable(tarea_id, feder_id);
export const svcAddColaborador    = (tarea_id, { feder_id, rol=null }) => addColaborador(tarea_id, feder_id, rol);
export const svcRemoveColaborador = (tarea_id, feder_id) => removeColaborador(tarea_id, feder_id);

// Etiquetas
export const svcAssignEtiqueta   = (tarea_id, etiqueta_id) => assignEtiqueta(tarea_id, etiqueta_id);
export const svcUnassignEtiqueta = (tarea_id, etiqueta_id) => unassignEtiqueta(tarea_id, etiqueta_id);

// Checklist
export const svcListChecklist       = (tarea_id) => listChecklist(tarea_id);
export const svcCreateChecklistItem = (tarea_id, titulo) => createChecklistItem(tarea_id, titulo);
export const svcUpdateChecklistItem = (item_id, patch) => updateChecklistItem(item_id, patch);
export const svcDeleteChecklistItem = (item_id) => deleteChecklistItem(item_id);
export const svcReorderChecklist    = (tarea_id, ordenPairs) => reorderChecklist(tarea_id, ordenPairs);

// Comentarios
export const svcListComentarios = (tarea_id, user) => listComentarios(tarea_id, user);

export const svcCreateComentario = (tarea_id, feder_id, body) => createComentario(tarea_id, feder_id, body);

// Adjuntos (tarea)
export const svcAddAdjunto    = (tarea_id, feder_id, meta) => addAdjunto(tarea_id, feder_id, meta);
export const svcRemoveAdjunto = (adjId) => removeAdjunto(adjId);

// Relaciones
export const svcCreateRelacion = (tarea_id, body) => createRelacion(tarea_id, body);
export const svcDeleteRelacion = (tarea_id, relId) => deleteRelacion(tarea_id, relId);

// Favoritos / Seguidores
export const svcSetFavorito = (tarea_id, user_id, on) => setFavorito(tarea_id, user_id, on);
export const svcSetSeguidor = (tarea_id, user_id, on) => setSeguidor(tarea_id, user_id, on);

// Estado / Aprobación / Kanban
export const svcSetEstado = (id, estado_id) => setEstado(id, estado_id);
export const svcSetAprobacion = (id, user_id, body) => {
  // controller envía (id, user_id, { aprobacion_estado_id, rechazo_motivo? })
  const { aprobacion_estado_id, rechazo_motivo=null } = body || {};
  return setAprobacion(id, aprobacion_estado_id, user_id, rechazo_motivo);
};
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
// ---- EXTENDIDO: + filtros múltiples, flags, rango de prioridad y todos los rangos de fecha
export const buildListSQL = (params = {}, currentUser) => {
  const {
    q,
    // unitarios
    cliente_id, hito_id, estado_id, responsable_feder_id, colaborador_feder_id,
    tarea_padre_id,
    etiqueta_id, impacto_id, urgencia_id, aprobacion_estado_id,
    // múltiples
    cliente_ids = [], estado_ids = [], etiqueta_ids = [],
    // flags
    solo_mias, include_archivadas, is_favorita, is_seguidor,
    // fechas
    vencimiento_from, vencimiento_to,
    inicio_from, inicio_to,
    created_from, created_to,
    updated_from, updated_to,
    finalizada_from, finalizada_to,
    // prioridad
    prioridad_min, prioridad_max,
    // orden/paginación
    orden_by='prioridad', sort='desc', limit=50, offset=0
  } = params;

  const repl = { limit, offset };
  const where = [];

    let sql = `
    SELECT
      t.id, t.titulo, t.descripcion, t.cliente_id, t.hito_id, t.tarea_padre_id,
      t.estado_id, te.codigo AS estado_codigo, te.nombre AS estado_nombre,
      t.impacto_id, it.puntos AS impacto_puntos, t.urgencia_id, ut.puntos AS urgencia_puntos,
      t.aprobacion_estado_id,
      t.prioridad_num, t.vencimiento, t.fecha_inicio, t.finalizada_at, t.is_archivada,
      t.progreso_pct, t.created_at, t.updated_at,
      tkp.stage_code AS kanban_stage, tkp.pos AS kanban_orden,
      c.nombre AS cliente_nombre,
      h.nombre AS hito_nombre,

      (SELECT COALESCE(json_agg(
                json_build_object(
                  'feder_id', tr.feder_id,
                  'es_lider', tr.es_lider,
                  'feder', json_build_object(
                    'id', f.id, 'user_id', f.user_id, 'nombre', f.nombre, 'apellido', f.apellido
                  )
                )
              ), '[]'::json)
         FROM "TareaResponsable" tr
         JOIN "Feder" f ON f.id = tr.feder_id
        WHERE tr.tarea_id = t.id) AS responsables,

      (SELECT COALESCE(json_agg(
                json_build_object(
                  'feder_id', tc.feder_id,
                  'rol', tc.rol,
                  'feder', json_build_object(
                    'id', f.id, 'user_id', f.user_id, 'nombre', f.nombre, 'apellido', f.apellido
                  )
                )
              ), '[]'::json)
         FROM "TareaColaborador" tc
         JOIN "Feder" f ON f.id = tc.feder_id
        WHERE tc.tarea_id = t.id) AS colaboradores,

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
  if (hito_id)    { where.push(`t.hito_id = :hito_id`);       repl.hito_id    = hito_id; }
  if (estado_id)  { where.push(`t.estado_id = :estado_id`);   repl.estado_id  = estado_id; }
  if (tarea_padre_id) { where.push(`t.tarea_padre_id = :parent_id`); repl.parent_id = tarea_padre_id; }
  if (impacto_id) { where.push(`t.impacto_id = :impacto_id`); repl.impacto_id = impacto_id; }
  if (urgencia_id){ where.push(`t.urgencia_id = :urgencia_id`); repl.urgencia_id = urgencia_id; }
  if (aprobacion_estado_id) { where.push(`t.aprobacion_estado_id = :aprob_id`); repl.aprob_id = aprobacion_estado_id; }

  // Filtros múltiples
  addIn('t.cliente_id', cliente_ids, 'cids_');
  addIn('t.estado_id',  estado_ids,  'eids_');

  if (etiqueta_ids?.length) {
    const keys = etiqueta_ids.map((_, i) => `et${i}`);
    where.push(`EXISTS (SELECT 1 FROM "TareaEtiquetaAsig" xe WHERE xe.tarea_id=t.id AND xe.etiqueta_id IN (${keys.map(k => ':' + k).join(',')}))`);
    keys.forEach((k, i) => { repl[k] = etiqueta_ids[i]; });
  }

  if (etiqueta_id) {
    where.push(`EXISTS (SELECT 1 FROM "TareaEtiquetaAsig" xe WHERE xe.tarea_id=t.id AND xe.etiqueta_id=:et)`);
    repl.et = etiqueta_id;
  }

  // Flags
  if (include_archivadas !== true) where.push(`t.is_archivada = false`);
  if (is_favorita === true) where.push(`EXISTS(SELECT 1 FROM "TareaFavorito" tf WHERE tf.tarea_id=t.id AND tf.user_id=:uid)`);
  if (is_seguidor === true) where.push(`EXISTS(SELECT 1 FROM "TareaSeguidor" ts WHERE ts.tarea_id=t.id AND ts.user_id=:uid)`);

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

  // Rangos de fechas
  if (vencimiento_from) { where.push(`t.vencimiento >= :vfrom`); repl.vfrom = vencimiento_from; }
  if (vencimiento_to)   { where.push(`t.vencimiento <= :vto`);   repl.vto   = vencimiento_to; }
  if (inicio_from)      { where.push(`t.fecha_inicio >= :ifrom`); repl.ifrom = inicio_from; }
  if (inicio_to)        { where.push(`t.fecha_inicio <= :ito`);   repl.ito   = inicio_to; }
  if (created_from)     { where.push(`t.created_at >= :cfrom`);   repl.cfrom = created_from; }
  if (created_to)       { where.push(`t.created_at <= :cto`);     repl.cto   = created_to; }
  if (updated_from)     { where.push(`t.updated_at >= :ufrom`);   repl.ufrom = updated_from; }
  if (updated_to)       { where.push(`t.updated_at <= :uto`);     repl.uto   = updated_to; }
  if (finalizada_from)  { where.push(`t.finalizada_at >= :ffrom`); repl.ffrom = finalizada_from; }
  if (finalizada_to)    { where.push(`t.finalizada_at <= :fto`);   repl.fto   = finalizada_to; }

  // Prioridad
  if (typeof prioridad_min === 'number') { where.push(`t.prioridad_num >= :pmin`); repl.pmin = prioridad_min; }
  if (typeof prioridad_max === 'number') { where.push(`t.prioridad_num <= :pmax`); repl.pmax = prioridad_max; }

  if (where.length) sql += ` WHERE ${where.join(' AND ')}\n`;

  // Orden
  const orderCol =
      orden_by === 'vencimiento'   ? 't.vencimiento'
    : orden_by === 'fecha_inicio'  ? 't.fecha_inicio'
    : orden_by === 'created_at'    ? 't.created_at'
    : orden_by === 'updated_at'    ? 't.updated_at'
    : orden_by === 'cliente'       ? 'cliente_nombre'
    : orden_by === 'titulo'        ? 't.titulo'
    : 't.prioridad_num'; // default

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
      tkp.stage_code AS kanban_stage, tkp.pos AS kanban_orden,
      c.id AS cliente_id, c.nombre AS cliente_nombre,
      h.id AS hito_id, h.nombre AS hito_nombre,

      (SELECT COALESCE(json_agg(
                json_build_object(
                  'feder_id', tr.feder_id,
                  'es_lider', tr.es_lider,
                  'feder', json_build_object(
                    'id', f.id, 'user_id', f.user_id, 'nombre', f.nombre, 'apellido', f.apellido
                  )
                )
              ), '[]'::json)
         FROM "TareaResponsable" tr
         JOIN "Feder" f ON f.id = tr.feder_id
        WHERE tr.tarea_id = t.id) AS responsables,

      (SELECT COALESCE(json_agg(
                json_build_object(
                  'feder_id', tc.feder_id,
                  'rol', tc.rol,
                  'created_at', tc.created_at,
                  'feder', json_build_object(
                    'id', f.id, 'user_id', f.user_id, 'nombre', f.nombre, 'apellido', f.apellido
                  )
                )
              ), '[]'::json)
         FROM "TareaColaborador" tc
         JOIN "Feder" f ON f.id = tc.feder_id
        WHERE tc.tarea_id = t.id) AS colaboradores,

      (SELECT json_agg(
                json_build_object('id',ti.id,'titulo',ti.titulo,'is_done',ti.is_done,'orden',ti.orden)
                ORDER BY ti.orden, ti.id
              )
         FROM "TareaChecklistItem" ti
        WHERE ti.tarea_id = t.id) AS checklist,

      (SELECT json_agg(json_build_object('id',te.id,'codigo',te.codigo,'nombre',te.nombre))
         FROM "TareaEtiquetaAsig" tea
         JOIN "TareaEtiqueta" te ON te.id = tea.etiqueta_id
        WHERE tea.tarea_id = t.id) AS etiquetas,

      /* ===== Comentarios con datos del autor (user_id + nombre/apellido) ===== */
      (SELECT json_agg(
                json_build_object(
                  'id', cm.id,
                  'feder_id', cm.feder_id,
                  'autor_feder_id', f.id,
                  'autor_user_id', f.user_id,
                  'autor_nombre',  f.nombre,
                  'autor_apellido',f.apellido,
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
                        'id',a.id,'nombre',a.nombre,'mime',a.mime,'drive_url',a.drive_url
                    )), '[]'::json)
                    FROM "TareaAdjunto" a
                    WHERE a.comentario_id = cm.id
                  )
                )
                ORDER BY cm.created_at
              )
         FROM "TareaComentario" cm
         JOIN "Feder" f ON f.id = cm.feder_id
        WHERE cm.tarea_id = t.id) AS comentarios,

      (SELECT json_agg(json_build_object('id',a.id,'nombre',a.nombre,'mime',a.mime,'drive_url',a.drive_url,'created_at',a.created_at))
         FROM "TareaAdjunto" a
        WHERE a.tarea_id = t.id AND a.comentario_id IS NULL) AS adjuntos,

      (SELECT json_agg(json_build_object('id',r.id,'relacionada_id',r.relacionada_id,'tipo_id',r.tipo_id))
         FROM "TareaRelacion" r
        WHERE r.tarea_id = t.id) AS relaciones,

      EXISTS(SELECT 1 FROM "TareaFavorito" tf WHERE tf.tarea_id = t.id AND tf.user_id = :uid) AS is_favorita,
      EXISTS(SELECT 1 FROM "TareaSeguidor" ts WHERE ts.tarea_id = t.id AND ts.user_id = :uid) AS is_seguidor

    FROM "Tarea" t
    JOIN "TareaEstado" te ON te.id = t.estado_id
    LEFT JOIN "ImpactoTipo" it ON it.id = t.impacto_id
    LEFT JOIN "UrgenciaTipo" ut ON ut.id = t.urgencia_id
    LEFT JOIN "Cliente" c ON c.id = t.cliente_id
    LEFT JOIN "ClienteHito" h ON h.id = t.hito_id
    LEFT JOIN "TareaKanbanPos" tkp ON tkp.tarea_id = t.id AND tkp.user_id = :uid
    WHERE t.id = :id
    LIMIT 1
  `, { type: QueryTypes.SELECT, replacements: { id, uid: currentUser?.id ?? 0 } });

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
    SELECT
      cm.*,
      f.id       AS autor_feder_id,
      f.user_id  AS autor_user_id,
      f.nombre   AS autor_nombre,
      f.apellido AS autor_apellido,
      ct.codigo  AS tipo_codigo,
      COALESCE((
        SELECT json_agg(m.feder_id)
        FROM "TareaComentarioMencion" m
        WHERE m.comentario_id = cm.id
      ), '[]'::json) AS menciones,
      COALESCE((
        SELECT json_agg(json_build_object('id',a.id,'nombre',a.nombre,'mime',a.mime,'drive_url',a.drive_url))
        FROM "TareaAdjunto" a
        WHERE a.comentario_id = cm.id
      ), '[]'::json) AS adjuntos
    FROM "TareaComentario" cm
    JOIN "Feder" f         ON f.id = cm.feder_id
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

export const moveKanban = async (tarea_id, user_id, { stage, orden=0 }) => {
  if (!user_id) {
    throw Object.assign(new Error('Usuario no autenticado'), { status: 401 });
  }
  await ensureExists(models.Tarea, tarea_id, 'Tarea no encontrada');

  const now = new Date();
  const [row, created] = await models.TareaKanbanPos.findOrCreate({
    where: { tarea_id, user_id },
    defaults: { tarea_id, user_id, stage_code: stage, pos: orden, updated_at: now }
  });

  if (!created) {
    row.stage_code = stage;
    row.pos = orden;
    row.updated_at = now;
    await row.save();
  }

  return { ok: true };
};
