// backend/src/modules/tareas/validators.js
import { z } from 'zod';

const boolish = z.preprocess(v => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional());
// Date validator for queries - allows any date (past, present, future)
const dateOpt = z.preprocess(v => (v ? new Date(v) : null), z.date().nullable().optional());
// Date validator for create/update - must be today or future
const dateOptFuture = z.preprocess(v => (v ? new Date(v) : null), z.date().nullable().optional()
  .refine(d => !d || d >= new Date(new Date().setHours(0, 0, 0, 0)), { message: "La fecha debe ser igual o posterior a hoy" }));
const intId = z.coerce.number().int().positive();

// ---------- NUEVO: compose ----------
export const composeQuerySchema = z.object({
  id: intId.optional()
});

// ---------- Listado con filtros extendidos ----------
export const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),

  q: z.string().trim().max(200).optional(),

  // filtros unitarios
  cliente_id: intId.optional(),
  hito_id: intId.optional(),
  estado_id: intId.optional(),
  estado_codigo: z.string().trim().optional(),
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
  orden_by: z.enum(['prioridad', 'vencimiento', 'fecha_inicio', 'created_at', 'updated_at', 'cliente', 'titulo'])
    .optional().default('prioridad'),
  sort: z.enum(['asc', 'desc']).optional().default('desc')
});

export const setLeaderBodySchema = z.object({
  feder_id: intId
})

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
  fecha_inicio: dateOptFuture,
  vencimiento: dateOptFuture,
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
  // Usar z.unknown() para fechas y procesarlas manualmente después
  fecha_inicio: z.unknown().optional(),
  vencimiento: z.unknown().optional(),
  progreso_pct: z.coerce.number().min(0).max(100).optional(),
  orden_kanban: z.coerce.number().int().optional(),
  is_archivada: z.boolean().optional()
}).transform((data) => {
  const result = { ...data };

  // Solo procesar fecha_inicio si viene explícitamente en el request
  if ('fecha_inicio' in data && data.fecha_inicio !== undefined) {
    result.fecha_inicio = data.fecha_inicio ? new Date(data.fecha_inicio) : null;
  } else {
    delete result.fecha_inicio;
  }

  // Solo procesar vencimiento si viene explícitamente en el request
  if ('vencimiento' in data && data.vencimiento !== undefined) {
    result.vencimiento = data.vencimiento ? new Date(data.vencimiento) : null;
  } else {
    delete result.vencimiento;
  }

  return result;
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const setEstadoSchema = z.object({ estado_id: intId });

export const setAprobacionSchema = z.object({
  aprobacion_estado_id: intId,           // no_aplica / pendiente / aprobada / rechazada
  rechazo_motivo: z.string().max(2000).nullish().optional()
});

export const moveKanbanSchema = z.object({
  stage: z.enum(['inbox', 'today', 'week', 'month']),
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
  contenido: z.string().min(1).max(10000).or(z.literal('')).transform(v => v || ''), // permitimos vacío si hay adjuntos
  menciones: z.array(intId).optional().default([]),
  adjuntos: z.array(z.object({
    id: z.number().int().optional(),
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

// ---------- Historial ----------
export const historialQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  tipo_cambio: z.string().trim().min(1).optional()
});

export const boostManualSchema = z.object({
  enabled: z.boolean()
});

export const reactionToggleSchema = z.object({
  emoji: z.string().min(1).max(200),
  on: z.boolean().optional().default(true)
});
