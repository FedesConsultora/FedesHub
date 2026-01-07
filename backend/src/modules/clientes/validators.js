// backend/src/modules/clientes/validators.js
// ───────────────────────────────────────────────────────────────────────────────
// Zod schemas para Clientes: queries, bodies y params
import { z } from 'zod';

const id = z.coerce.number().int().positive();

// Email: acepta vacío o email válido
const email = z.string().max(255).optional()
  .transform(v => (!v || v.trim() === '') ? undefined : v.trim())
  .refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'Email inválido' });

// URL: acepta vacío, URL completa o sin protocolo (se agrega https://)
const urlFlexible = z.string().max(255).optional()
  .transform(v => {
    if (!v || v.trim() === '') return undefined;
    const trimmed = v.trim();
    // Si no tiene protocolo, agregar https://
    if (trimmed && !trimmed.match(/^https?:\/\//i)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  });

// Teléfono: mínimo 2 caracteres (más flexible)
const telefono = z.string().max(40).optional()
  .transform(v => (!v || v.trim() === '') ? undefined : v.trim());

export const listQuerySchema = z.object({
  q: z.string().min(1).max(200).optional(),
  tipo_id: id.optional(),
  tipo_codigo: z.string().min(1).max(50).optional(),
  estado_id: z.union([id, z.literal('all')]).optional(),
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
  tipo_id: id.optional(),
  tipo_codigo: z.string().min(1).max(50).optional(),
  estado_id: id.optional(),
  estado_codigo: z.string().min(1).max(50).optional(),
  nombre: z.string().min(2).max(160),
  alias: z.string().max(120).optional().transform(v => (!v || v.trim() === '') ? undefined : v.trim()),
  email,
  telefono,
  sitio_web: urlFlexible,
  descripcion: z.string().max(10000).optional().transform(v => (!v || v.trim() === '') ? undefined : v.trim()),
  ponderacion: z.coerce.number().int().min(1).max(5).optional().default(3),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser formato hex #RRGGBB').optional()
});

export const clienteUpdateSchema = clienteCreateSchema.partial().refine(
  o => Object.keys(o).length > 0,
  { message: 'Sin cambios' }
);

/* assignCelulaBodySchema removed */

export const listContactosQuery = z.object({
  principal: z.preprocess(v => (v === 'true' ? true : v === 'false' ? false : undefined), z.boolean().optional())
});

export const contactoCreateSchema = z.object({
  nombre: z.string().min(2).max(160),
  cargo: z.string().max(120).optional(),
  email,
  telefono,  // usa el validador flexible definido arriba
  es_principal: z.boolean().optional().default(false)
});

export const contactoUpdateSchema = contactoCreateSchema.partial().refine(
  o => Object.keys(o).length > 0, { message: 'Sin cambios' }
);
