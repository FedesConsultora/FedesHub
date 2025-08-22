//  /backend/src/modules/ausencias/validators.js

import { z } from 'zod';

const id = z.coerce.number().int().positive();
const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const isoDateTime = z.string().datetime();

export const catalogQuery = z.object({});

export const tipoCreateSchema = z.object({
  codigo: z.string().min(2).max(50),
  nombre: z.string().min(2).max(100),
  descripcion: z.string().max(2000).nullish(),
  unidad_id: id.optional(),
  unidad_codigo: z.enum(['dia','hora']).optional(),
  requiere_asignacion: z.boolean().default(true),
  permite_medio_dia: z.boolean().default(false)
}).refine(o => o.unidad_id || o.unidad_codigo, { message: 'unidad_id o unidad_codigo requerido' });

export const tipoUpdateSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  descripcion: z.string().max(2000).nullish().optional(),
  unidad_id: id.optional(),
  unidad_codigo: z.enum(['dia','hora']).optional(),
  requiere_asignacion: z.boolean().optional(),
  permite_medio_dia: z.boolean().optional()
});

export const tiposListQuery = z.object({
  q: z.string().min(1).max(100).optional()
});

export const cuotaAssignSchema = z.object({
  feder_id: id,
  tipo_id: id.optional(),
  tipo_codigo: z.string().min(2).max(50).optional(),
  unidad_id: id.optional(),
  unidad_codigo: z.enum(['dia','hora']).optional(),
  cantidad_total: z.coerce.number().positive(),
  vigencia_desde: isoDateOnly,
  vigencia_hasta: isoDateOnly,
  comentario: z.string().max(2000).nullish()
}).refine(o => (o.tipo_id || o.tipo_codigo), { message: 'tipo_id o tipo_codigo requerido' })
  .refine(o => (o.unidad_id || o.unidad_codigo), { message: 'unidad_id o unidad_codigo requerido' });

export const cuotasListQuery = z.object({
  feder_id: id.optional(),
  tipo_id: id.optional(),
  vigentes: z.preprocess(v => v === 'true' ? true : v === 'false' ? false : undefined, z.boolean().optional())
});

export const saldoQuery = z.object({
  feder_id: id,
  fecha: isoDateOnly.optional()
});

export const ausListQuery = z.object({
  feder_id: id.optional(),
  estado_codigo: z.enum(['pendiente','aprobada','denegada','cancelada']).optional(),
  desde: isoDateOnly.optional(),
  hasta: isoDateOnly.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const ausenciaCreateSchema = z.object({
  feder_id: id.optional(), // requerido salvo /me
  tipo_id: id.optional(),
  tipo_codigo: z.string().min(2).max(50).optional(),
  fecha_desde: isoDateOnly,
  fecha_hasta: isoDateOnly,
  es_medio_dia: z.boolean().optional().default(false),
  mitad_dia_id: z.coerce.number().int().min(1).max(2).optional(), // 1=am, 2=pm
  duracion_horas: z.coerce.number().positive().optional(), // requerido si unidad=hora
  motivo: z.string().max(4000).nullish()
}).refine(o => (o.tipo_id || o.tipo_codigo), { message: 'tipo_id o tipo_codigo requerido' });

export const ausenciaDecisionSchema = z.object({
  comentario_admin: z.string().max(2000).nullish()
});

export const ausenciaRechazoSchema = z.object({
  comentario_admin: z.string().max(2000).nullish(),
  denegado_motivo: z.string().max(4000).optional()
});

export const asignacionSolicitudCreate = z.object({
  feder_id: id.optional(), // /me no lo requiere
  tipo_id: id.optional(),
  tipo_codigo: z.string().min(2).max(50).optional(),
  unidad_id: id.optional(),
  unidad_codigo: z.enum(['dia','hora']).optional(),
  cantidad_solicitada: z.coerce.number().positive(),
  vigencia_desde: isoDateOnly,
  vigencia_hasta: isoDateOnly,
  motivo: z.string().max(4000).nullish()
}).refine(o => (o.tipo_id || o.tipo_codigo), { message: 'tipo_id o tipo_codigo requerido' })
  .refine(o => (o.unidad_id || o.unidad_codigo), { message: 'unidad_id o unidad_codigo requerido' });

export const asignacionSolicitudList = z.object({
  feder_id: id.optional(),
  estado_codigo: z.enum(['pendiente','aprobada','denegada','cancelada']).optional()
});
