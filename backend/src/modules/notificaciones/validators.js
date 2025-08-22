import { z } from 'zod';

export const inboxQuerySchema = z.object({
  buzon: z.enum(['chat','tareas','calendario']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().max(200).optional(),
  only_unread: z.coerce.boolean().optional(),
  include_archived: z.coerce.boolean().optional(),
  sort: z.enum(['newest','oldest','importance']).default('newest'),
  chat_canal_id: z.coerce.number().int().optional(),
  tarea_id: z.coerce.number().int().optional(),
  evento_id: z.coerce.number().int().optional(),
  importancia_id: z.coerce.number().int().optional(),
  tipo_codigo: z.string().trim().optional(),
  hilo_key: z.string().trim().optional()
});

export const notifIdParam = z.object({ id: z.coerce.number().int().positive() });

export const toggleBoolSchema = z.object({ on: z.boolean() });

export const setPinSchema = z.object({ orden: z.number().int().nullable().optional() });

export const setPreferencesSchema = z.object({
  items: z.array(z.object({
    tipo_id: z.number().int().positive(),
    canal_id: z.number().int().positive(),
    is_habilitado: z.boolean()
  })).min(1)
});

export const createNotificationSchema = z.object({
  tipo_id: z.number().int().positive().optional(),
  tipo_codigo: z.string().trim().optional(),
  importancia_id: z.number().int().optional(),
  titulo: z.string().trim().max(200).optional(),
  mensaje: z.string().trim().optional(),
  data: z.record(z.any()).optional(),
  link_url: z.string().url().optional(),
  hilo_key: z.string().trim().optional(),
  tarea_id: z.number().int().optional(),
  ausencia_id: z.number().int().optional(),
  asistencia_registro_id: z.number().int().optional(),
  evento_id: z.number().int().optional(),
  chat_canal_id: z.number().int().optional(),
  programada_at: z.coerce.date().optional(),
  destinos: z.array(z.object({
    user_id: z.number().int().positive(),
    feder_id: z.number().int().optional()
  })).min(1)
}).refine(v => v.tipo_id || v.tipo_codigo, { message: 'tipo_id o tipo_codigo requerido' });
