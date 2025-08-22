// backend/src/modules/tareas/validators.js
import { z } from 'zod';

const boolish = z.preprocess(v => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional());
const dateOpt = z.preprocess(v => (v ? new Date(v) : null), z.date().nullable().optional());
const intId = z.coerce.number().int().positive();

export const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().trim().min(1).max(200).optional(),
  cliente_id: intId.optional(),
  hito_id: intId.optional(),
  estado_id: intId.optional(),
  responsable_feder_id: intId.optional(),
  colaborador_feder_id: intId.optional(),
  etiqueta_id: intId.optional(),
  solo_mias: boolish,            // si true: responsable/colaborador/creador = yo
  include_archivadas: boolish,
  vencimiento_from: dateOpt,
  vencimiento_to: dateOpt,
  orden_by: z.enum(['prioridad','vencimiento','created_at']).optional().default('prioridad'),
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
  estado_id: intId,
  orden_kanban: z.coerce.number().int().optional().default(0)
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
  contenido: z.string().min(1).max(10000),
  menciones: z.array(intId).optional().default([]),
  adjuntos: z.array(z.object({
    nombre: z.string().min(1).max(255),
    mime: z.string().max(120).nullish(),
    tamano_bytes: z.coerce.number().int().nonnegative().optional(),
    drive_file_id: z.string().max(255).nullish(),
    drive_url: z.string().max(512).url().nullish()
  })).optional().default([])
});

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
