// backend/src/modules/cargos/validators.js
import { z } from 'zod';

export const healthOk = () => true;

// ===== Listados =====
export const listCargosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().trim().min(1).max(120).optional(),
  ambito_id: z.coerce.number().int().positive().optional(),
  is_activo: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  )
});

// ===== Cargos =====
export const cargoIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const createCargoSchema = z.object({
  nombre: z.string().min(3).max(120),
  descripcion: z.string().max(1000).nullish(),
  ambito_id: z.number().int().positive(),
  is_activo: z.boolean().optional().default(true)
});

export const updateCargoSchema = z.object({
  nombre: z.string().min(3).max(120).optional(),
  descripcion: z.string().max(1000).nullish().optional(),
  ambito_id: z.number().int().positive().optional(),
  is_activo: z.boolean().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const setCargoActiveSchema = z.object({
  is_activo: z.boolean()
});

// ===== Feder & Assignments =====
export const federIdParamSchema = z.object({
  federId: z.coerce.number().int().positive()
});

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD');

export const createAssignmentSchema = z.object({
  cargo_id: z.number().int().positive(),
  es_principal: z.boolean().optional().default(true),
  desde: dateOnly,
  hasta: dateOnly.nullish(),
  observacion: z.string().max(2000).nullish()
});

export const assignmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const updateAssignmentSchema = z.object({
  es_principal: z.boolean().optional(),
  desde: dateOnly.optional(),
  hasta: dateOnly.nullish().optional(),
  observacion: z.string().max(2000).nullish().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });
