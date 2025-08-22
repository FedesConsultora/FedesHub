// backend/src/modules/feders/validators.js
import { z } from 'zod';

export const listFedersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().trim().min(1).max(120).optional(),
  celula_id: z.coerce.number().int().positive().optional(),
  estado_id: z.coerce.number().int().positive().optional(),
  is_activo: z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional())
});

export const federIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD');

export const createFederSchema = z.object({
  user_id: z.number().int().positive().optional().nullable(),
  celula_id: z.number().int().positive().optional().nullable(),
  estado_id: z.number().int().positive(),
  nombre: z.string().min(2).max(120),
  apellido: z.string().min(2).max(120),
  telefono: z.string().max(30).nullish(),
  avatar_url: z.string().url().max(512).nullish(),
  fecha_ingreso: dateOnly.nullish(),
  fecha_egreso: dateOnly.nullish(),
  is_activo: z.boolean().optional().default(true)
});

export const updateFederSchema = z.object({
  user_id: z.number().int().positive().nullable().optional(),
  celula_id: z.number().int().positive().nullable().optional(),
  estado_id: z.number().int().positive().optional(),
  nombre: z.string().min(2).max(120).optional(),
  apellido: z.string().min(2).max(120).optional(),
  telefono: z.string().max(30).nullish().optional(),
  avatar_url: z.string().url().max(512).nullish().optional(),
  fecha_ingreso: dateOnly.nullish().optional(),
  fecha_egreso: dateOnly.nullish().optional(),
  is_activo: z.boolean().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const setFederActiveSchema = z.object({
  is_activo: z.boolean()
});

// ---- Modalidad por día
export const federIdRouteSchema = z.object({
  federId: z.coerce.number().int().positive()
});

export const upsertModalidadSchema = z.object({
  dia_semana_id: z.number().int().min(1).max(7),
  modalidad_id: z.number().int().positive(),
  comentario: z.string().max(2000).nullish(),
  is_activo: z.boolean().optional().default(true)
});

export const bulkModalidadSchema = z.object({
  items: z.array(upsertModalidadSchema).min(1).max(7)
});

export const diaParamSchema = z.object({
  diaId: z.coerce.number().int().min(1).max(7)
});
