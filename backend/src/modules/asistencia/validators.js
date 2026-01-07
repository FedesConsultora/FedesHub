// backend/src/modules/asistencia/validators.js
import { z } from 'zod';

const isoDateTime = z.string().datetime().optional();
const id = z.coerce.number().int().positive();

export const listQuerySchema = z.object({
  feder_id: id.optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
  abiertos: z.preprocess(v => (v === 'true' ? true : v === 'false' ? false : undefined), z.boolean().optional()),
  q: z.string().min(1).max(200).optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0)
});

export const idParamSchema = z.object({ id });

export const openQuerySchema = z.object({
  feder_id: id
});

export const checkInBodySchema = z.object({
  feder_id: id.optional(),   // requerido salvo /me
  at: isoDateTime,
  origen_id: id.optional(),
  origen_codigo: z.string().min(2).max(50).optional(),
  modalidad_id: id.optional(),
  modalidad_codigo: z.string().min(2).max(50).optional(),
  comentario: z.string().max(2000).nullish()
});

export const checkOutBodySchema = z.object({
  at: isoDateTime,
  origen_id: id.optional(),
  origen_codigo: z.string().min(2).max(50).optional(),
  cierre_motivo_id: id.optional(),
  cierre_motivo_codigo: z.string().min(2).max(50).optional(),
  comentario: z.string().max(2000).nullish()
});

export const forceCloseBodySchema = z.object({
  at: z.string().datetime(),
  origen_id: id.optional(),
  origen_codigo: z.string().min(2).max(50).optional(),
  cierre_motivo_id: id.optional(),
  cierre_motivo_codigo: z.string().min(2).max(50).optional(),
  comentario: z.string().max(2000).nullish()
}).refine(o => o.cierre_motivo_id || o.cierre_motivo_codigo, { message: 'Motivo requerido' });

export const adjustBodySchema = z.object({
  check_in_at: z.string().datetime().optional(),
  check_out_at: z.string().datetime().optional(),
  check_in_origen_id: id.optional(),
  check_out_origen_id: id.optional(),
  cierre_motivo_id: id.optional(),
  modalidad_id: id.optional(),
  modalidad_codigo: z.string().min(2).max(50).optional(),
  comentario: z.string().max(2000).nullish().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const resumenQuerySchema = z.object({
  desde: z.string().datetime(),
  hasta: z.string().datetime(),
  feder_id: id.optional()
});
export const timelineQuerySchema = z.object({
  fecha: z.string().date(),      // ISO-8601 'YYYY-MM-DD'
  feder_id: id.optional(),
  jornada_min: z.coerce.number().int().min(60).max(24 * 60).optional()
});

export const timelineRangeQuerySchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  q: z.string().optional(),
  feder_id: z.number().optional(),
})
