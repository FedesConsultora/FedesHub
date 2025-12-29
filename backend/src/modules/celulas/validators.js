// backend/src/modules/celulas/validators.js

import { z } from 'zod';

const id = z.coerce.number().int().positive();
const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const listQuery = z.object({
  q: z.string().min(1).max(120).optional(),
  estado_codigo: z.enum(['activa', 'pausada', 'cerrada']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const createBody = z.object({
  nombre: z.string().min(2).max(120),
  descripcion: z.string().max(4000).nullish().transform(v => v === '' ? null : v),
  perfil_md: z.string().max(20000).nullish().transform(v => v === '' ? null : v),
  avatar_url: z.string().max(512).nullish().transform(v => v === '' ? null : v),
  cover_url: z.string().max(512).nullish().transform(v => v === '' ? null : v),
  estado_codigo: z.enum(['activa', 'pausada', 'cerrada']).optional(),
  cliente_ids: z.array(z.coerce.number().int().positive()).optional()
});

export const updateBody = z.object({
  nombre: z.string().min(2).max(120).optional(),
  descripcion: z.string().max(4000).nullish().optional().transform(v => v === '' ? null : v),
  perfil_md: z.string().max(20000).nullish().optional().transform(v => v === '' ? null : v),
  avatar_url: z.string().max(512).nullish().optional().transform(v => v === '' ? null : v),
  cover_url: z.string().max(512).nullish().optional().transform(v => v === '' ? null : v),
  cliente_ids: z.array(z.coerce.number().int().positive()).optional(),
  estado_codigo: z.enum(['activa', 'pausada', 'cerrada']).optional()
}).refine(o => Object.keys(o).length > 0, { message: 'Sin cambios' });

export const changeStateBody = z.object({
  estado_codigo: z.enum(['activa', 'pausada', 'cerrada'])
});

export const asignarRolBody = z.object({
  feder_id: id,
  rol_codigo: z.string().min(1).max(50),
  desde: isoDateOnly,
  es_principal: z.boolean().default(true),
  observacion: z.string().max(2000).nullish()
});

export const cerrarAsignacionBody = z.object({
  hasta: isoDateOnly,
  observacion: z.string().max(2000).nullish()
});

export const idParam = z.object({ id });
export const asignacionIdParam = z.object({ asignacionId: id });

export const uploadAvatarSchema = z.object({
  mimetype: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
  size: z.number().max(5 * 1024 * 1024) // 5MB
});
