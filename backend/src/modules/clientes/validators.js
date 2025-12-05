// backend/src/modules/clientes/validators.js
// ───────────────────────────────────────────────────────────────────────────────
// Zod schemas para Clientes: queries, bodies y params
import { z } from 'zod';

const id = z.coerce.number().int().positive();
const email = z.string().email().max(255).optional().or(z.literal('').transform(() => undefined));
const url = z.string().url().max(255).optional().or(z.literal('').transform(() => undefined));

export const listQuerySchema = z.object({
  q: z.string().min(1).max(200).optional(),
  celula_id: id.optional(),
  tipo_id: id.optional(),
  tipo_codigo: z.string().min(1).max(50).optional(),
  estado_id: id.optional(),
  estado_codigo: z.string().min(1).max(50).optional(),
  ponderacion_min: z.coerce.number().int().min(1).max(5).optional(),
  ponderacion_max: z.coerce.number().int().min(1).max(5).optional(),
  order_by: z.enum(['nombre', 'created_at', 'ponderacion']).optional().default('nombre'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  with_metrics: z.preprocess(v => v === 'true', z.boolean().optional())
});

export const idParamSchema = z.object({ id });

export const clienteCreateSchema = z.object({
  celula_id: id,
  tipo_id: id.optional(),
  tipo_codigo: z.string().min(1).max(50).optional(),
  estado_id: id.optional(),
  estado_codigo: z.string().min(1).max(50).optional(),
  nombre: z.string().min(2).max(160),
  alias: z.string().min(1).max(120).optional(),
  email,
  telefono: z.string().min(4).max(40).optional(),
  sitio_web: url,
  descripcion: z.string().max(10000).optional(),
  ponderacion: z.coerce.number().int().min(1).max(5).optional().default(3),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser formato hex #RRGGBB').optional()
});

export const clienteUpdateSchema = clienteCreateSchema.partial().refine(
  o => Object.keys(o).length > 0,
  { message: 'Sin cambios' }
);

export const assignCelulaBodySchema = z.object({
  celula_id: id
});

export const listContactosQuery = z.object({
  principal: z.preprocess(v => (v === 'true' ? true : v === 'false' ? false : undefined), z.boolean().optional())
});

export const contactoCreateSchema = z.object({
  nombre: z.string().min(2).max(160),
  cargo: z.string().max(120).optional(),
  email,
  telefono: z.string().min(4).max(40).optional(),
  es_principal: z.boolean().optional().default(false)
});

export const contactoUpdateSchema = contactoCreateSchema.partial().refine(
  o => Object.keys(o).length > 0, { message: 'Sin cambios' }
);
