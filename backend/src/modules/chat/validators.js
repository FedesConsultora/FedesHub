// /backend/src/modules/chat/validators.js
import { z } from 'zod';

export const scopeEnum = z.enum(['mine','canal','celula','cliente','dm','all']);

const asArrayOfInts = (v) => {
  if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
  if (typeof v === 'string') return v.split(',').map(n => parseInt(n,10)).filter(Number.isFinite);
  return undefined;
};

export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const midParam = z.object({ id: z.coerce.number().int().positive() });
export const intId = z.coerce.number().int().positive();

export const listCatalogQuery = z.object({});

export const listCanalesQuery = z.object({
  scope: scopeEnum.default('mine'),
  canal_id: z.coerce.number().int().positive().optional(),
  celula_id: z.coerce.number().int().positive().optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  include_archivados: z.coerce.boolean().optional().default(false),
  q: z.string().trim().max(160).optional()
}).refine(v => {
  if (v.scope === 'canal')  return !!v.canal_id;
  if (v.scope === 'celula') return !!v.celula_id;
  if (v.scope === 'cliente')return !!v.cliente_id;
  return true;
}, { message: 'falta canal_id/celula_id/cliente_id según scope' });

export const upsertCanalSchema = z.object({
  id: z.number().int().optional(),
  tipo_codigo: z.enum(['dm','grupo','canal','celula','cliente']),
  nombre: z.string().max(120).optional(),
  slug: z.string().max(120).optional(),
  topic: z.string().max(240).optional(),
  descripcion: z.string().optional(),
  is_privado: z.boolean().optional(),
  only_mods_can_post: z.boolean().optional(),
  slowmode_seconds: z.number().int().min(0).max(86400).optional(),
  celula_id: z.number().int().optional(),
  cliente_id: z.number().int().optional(),
  invited_user_ids: z.array(z.number().int().positive()).optional().default([]) // miembros iniciales
}).refine(v => {
  if (v.tipo_codigo === 'celula')  return !!v.celula_id;
  if (v.tipo_codigo === 'cliente') return !!v.cliente_id;
  if (v.tipo_codigo === 'dm')      return (v.invited_user_ids?.length ?? 0) === 1;
  return true;
}, { message: 'Para tipo celula/cliente se requiere id; para DM un (1) invitado' });

export const updateCanalSettingsSchema = z.object({
  only_mods_can_post: z.boolean().optional(),
  slowmode_seconds: z.number().int().min(0).max(86400).optional(),
  topic: z.string().max(240).optional(),
  is_privado: z.boolean().optional()
}).refine(v => Object.keys(v).length > 0, { message: 'Nada para actualizar' });

export const memberUpsertSchema = z.object({
  user_id: z.number().int().positive(),
  rol_codigo: z.enum(['owner','admin','mod','member','guest']).default('member'),
  is_mute: z.boolean().optional(),
  notif_level: z.enum(['all','mentions','none']).optional()
});

export const memberPatchSchema = z.object({
  rol_codigo: z.enum(['owner','admin','mod','member','guest']).optional(),
  is_mute: z.boolean().optional(),
  notif_level: z.enum(['all','mentions','none']).optional()
}).refine(v => Object.keys(v).length > 0, { message: 'Nada para actualizar' });

export const listMessagesQuery = z.object({
  before_id: z.coerce.number().int().positive().optional(),
  after_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  thread_root_id: z.coerce.number().int().positive().optional()
});

export const postMessageSchema = z.object({
  body_text: z.string().optional(),
  body_json: z.record(z.any()).optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  attachments: z.array(z.object({
    file_url: z.string().url(),
    file_name: z.string().max(255).optional(),
    mime_type: z.string().max(160).optional(),
    size_bytes: z.coerce.number().int().optional(),
    width: z.coerce.number().int().optional(),
    height: z.coerce.number().int().optional(),
    duration_sec: z.coerce.number().int().optional()
  })).optional().default([])
}).refine(v => (v.body_text?.trim()?.length ?? 0) > 0 || !!v.body_json || (v.attachments?.length ?? 0) > 0,
  { message: 'mensaje vacío' });

export const editMessageSchema = z.object({
  body_text: z.string().optional(),
  body_json: z.record(z.any()).optional()
}).refine(v => Object.keys(v).length > 0, { message: 'Nada para editar' });

export const reactionSchema = z.object({ emoji: z.string().min(1).max(80) });

export const readChannelSchema = z.object({
  last_read_msg_id: z.number().int().positive()
});

export const saveSchema = z.object({ on: z.boolean() });
export const pinSchema = z.object({ on: z.boolean(), orden: z.number().int().nullable().optional() });

export const typingSchema = z.object({ on: z.boolean(), ttl_seconds: z.number().int().min(1).max(15).default(5) });

export const presenceSchema = z.object({
  status: z.enum(['online','away','dnd','offline']).default('online'),
  device: z.string().max(60).optional()
});

export const createInvitationSchema = z.object({
  invited_user_id: z.number().int().optional(),
  invited_email: z.string().email().optional()
}).refine(v => !!v.invited_user_id || !!v.invited_email, { message: 'invited_user_id o invited_email requerido' });

export const invitationTokenParam = z.object({ token: z.string().min(10) });

export const meetingSchema = z.object({
  provider_codigo: z.string().max(30).default('internal'),
  titulo: z.string().min(1).max(200).default('Reunión de canal'),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date()
}).refine(v => v.ends_at > v.starts_at, { message: 'ends_at debe ser mayor que starts_at' });
