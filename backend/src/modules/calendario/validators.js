// /backend/src/modules/calendario/validators.js
import { z } from 'zod';

export const scopeEnum = z.enum(['mine','feder','celula','cliente','global']);

const asArrayOfInts = (v) => {
  if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
  if (typeof v === 'string') return v.split(',').map(n => parseInt(n,10)).filter(Number.isFinite);
  return undefined;
};

export const listCalendarsQuery = z.object({
  scope: scopeEnum.default('mine'),
  feder_id: z.coerce.number().int().positive().optional(),
  celula_id: z.coerce.number().int().positive().optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  include_inactive: z.coerce.boolean().optional().default(false)
}).refine(v => {
  if (v.scope === 'feder')   return !!v.feder_id;
  if (v.scope === 'celula')  return !!v.celula_id;
  if (v.scope === 'cliente') return !!v.cliente_id;
  return true;
}, { message: 'falta feder_id/celula_id/cliente_id según scope' });

export const upsertCalendarSchema = z.object({
  id: z.number().int().optional(),
  tipo_codigo: z.enum(['personal','celula','cliente','global']),
  nombre: z.string().min(1).max(160),
  visibilidad_codigo: z.enum(['privado','equipo','organizacion']).default('organizacion'),
  feder_id: z.number().int().optional(),
  celula_id: z.number().int().optional(),
  cliente_id: z.number().int().optional(),
  time_zone: z.string().max(60).optional(),
  color: z.string().max(30).optional(),
  is_activo: z.boolean().optional()
});

export const listEventsQuery = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
  calendario_ids: z.preprocess(asArrayOfInts, z.array(z.number().int().positive()).optional()),
  scope: scopeEnum.default('mine'),
  feder_id: z.coerce.number().int().positive().optional(),
  celula_id: z.coerce.number().int().positive().optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  include_overlays: z.coerce.boolean().optional().default(true),
  expand_recurrences: z.coerce.boolean().optional().default(true),
  q: z.string().trim().max(200).optional()
}).refine(v => {
  if (v.scope === 'feder')   return !!v.feder_id || (v.calendario_ids?.length ?? 0) > 0;
  if (v.scope === 'celula')  return !!v.celula_id || (v.calendario_ids?.length ?? 0) > 0;
  if (v.scope === 'cliente') return !!v.cliente_id || (v.calendario_ids?.length ?? 0) > 0;
  return true;
}, { message: 'falta feder_id/celula_id/cliente_id o calendario_ids según scope' });

export const eventAttendee = z.object({
  tipo_codigo: z.enum(['feder','externo']),
  feder_id: z.number().int().optional(),
  email_externo: z.string().email().optional(),
  nombre: z.string().max(160).optional(),
  respuesta: z.enum(['needsAction','accepted','tentative','declined']).optional()
}).refine(v => v.tipo_codigo === 'feder' ? !!v.feder_id : !!v.email_externo,
  { message: 'asistente feder requiere feder_id; externo requiere email_externo' });

export const upsertEventSchema = z.object({
  id: z.number().int().optional(),
  calendario_local_id: z.number().int().positive(),
  tipo_codigo: z.enum(['interno','asistencia','ausencia','tarea_vencimiento']).default('interno'),
  titulo: z.string().min(1).max(200),
  descripcion: z.string().optional(),
  lugar: z.string().max(255).optional(),
  all_day: z.boolean().default(false),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date(),
  rrule: z.string().max(255).nullable().optional(),
  visibilidad_codigo: z.enum(['privado','equipo','organizacion']).default('organizacion'),
  color: z.string().max(30).optional(),
  asistencia_registro_id: z.number().int().optional(),
  ausencia_id: z.number().int().optional(),
  tarea_id: z.number().int().optional(),
  asistentes: z.array(eventAttendee).optional().default([])
}).refine(v => v.ends_at > v.starts_at, { message: 'ends_at debe ser mayor que starts_at' });

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const googleLinkSchema = z.object({
  calendario_local_id: z.number().int().positive(),
  google_calendar_id: z.string().min(1),
  direccion_codigo: z.enum(['pull','push','both','none']).default('both')
});

export const googleSyncOneSchema = z.object({
  calendario_local_id: z.number().int().positive()
});

// RSVP del asistente autenticado
export const rsvpSchema = z.object({
  respuesta: z.enum(['needsAction','accepted','tentative','declined'])
});

export const webhookHeadersSchema = z.object({
  'x-goog-channel-id': z.string(),
  'x-goog-resource-id': z.string(),
  'x-goog-resource-state': z.enum(['exists','sync','not_exists']).optional(),
  'x-goog-message-number': z.string().optional(),
  'x-goog-channel-expiration': z.string().optional()
});
