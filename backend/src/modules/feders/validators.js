// backend/src/modules/feders/validators.js
import { z } from 'zod';

// Helper para fechas (debe estar declarado antes de usarse)
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD');

export const updateFederSelfSchema = z.object({
  nombre: z.string().min(2).max(120).optional(),
  apellido: z.string().min(2).max(120).optional(),
  telefono: z.string().max(30).nullish().optional(),
  // Campos de identidad (el backend encripta automáticamente)
  nombre_legal: z.string().max(180).nullish().optional(),
  dni_tipo: z.string().max(20).nullish().optional(),
  dni_numero: z.string().max(50).nullish().optional(), // texto plano, backend encripta
  cuil_cuit: z.string().max(50).nullish().optional(),   // texto plano, backend encripta
  fecha_nacimiento: dateOnly.nullish().optional(),
  // avatar_url NO lo actualizamos desde aquí por UX (se sube por /avatar)
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const listFedersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().trim().max(120).optional(),
  estado_id: z.coerce.number().int().positive().optional(),
  is_activo: z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional())
});


export const federIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const createFederSchema = z.object({
  user_id: z.number().int().positive().optional().nullable(),
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
  estado_id: z.number().int().positive().optional(),
  nombre: z.string().min(2).max(120).optional(),
  apellido: z.string().min(2).max(120).optional(),
  telefono: z.string().max(30).nullish().optional(),
  avatar_url: z.string().url().max(512).nullish().optional(),
  fecha_ingreso: dateOnly.nullish().optional(),
  fecha_egreso: dateOnly.nullish().optional(),
  is_activo: z.boolean().optional(),
  // Campos de identidad y legales
  nombre_legal: z.string().max(180).nullish().optional(),
  dni_tipo: z.string().max(20).nullish().optional(),
  dni_numero: z.string().max(50).nullish().optional(), // texto plano, backend encripta
  cuil_cuit: z.string().max(50).nullish().optional(),   // texto plano, backend encripta
  fecha_nacimiento: dateOnly.nullish().optional(),
  cargo_principal: z.string().max(120).nullish().optional(),
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

// ==== Helpers comunes
const encJson = z.union([z.string().min(1), z.record(z.any())]).nullish(); // string cifrado o objeto (lo serializamos luego)
const jsonObj = z.record(z.any()).nullish();

// ==== Firma de perfil
export const upsertFirmaPerfilSchema = z.object({
  firma_textual: z.string().max(220).nullish(),
  dni_tipo: z.string().max(20).nullish(),
  dni_numero_enc: encJson.optional(),
  firma_iniciales_svg: z.string().nullish(),
  firma_iniciales_png_url: z.string().url().max(512).nullish(),
  pin_hash: z.string().max(255).nullish(),
  is_activa: z.boolean().optional()
});

// ==== Bancos
export const bankIdParamSchema = z.object({
  bankId: z.coerce.number().int().positive()
});
export const createFederBancoSchema = z.object({
  banco_nombre: z.string().max(120).nullish(),
  cbu: z.string().regex(/^\d{22}$/, 'El CBU/CVU debe tener exactamente 22 dígitos'),
  alias: z.string().max(100).nullish(),
  titular_nombre: z.string().max(180).nullish(),
  es_principal: z.boolean().optional().default(true)
});

export const updateFederBancoSchema = z.object({
  banco_nombre: z.string().max(120).nullish().optional(),
  cbu: z.string().regex(/^\d{22}$/, 'El CBU/CVU debe tener exactamente 22 dígitos').optional(),
  alias: z.string().max(100).nullish().optional(),
  titular_nombre: z.string().max(180).nullish().optional(),
  es_principal: z.boolean().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

// ==== Contactos de emergencia
export const contactoIdParamSchema = z.object({
  contactoId: z.coerce.number().int().positive()
});
export const createEmergenciaSchema = z.object({
  nombre: z.string().min(2).max(180),
  parentesco: z.string().max(80).nullish(),
  telefono: z.string().max(40).nullish(),
  email: z.string().email().max(180).nullish()
});
export const updateEmergenciaSchema = z.object({
  nombre: z.string().min(2).max(180).optional(),
  parentesco: z.string().max(80).nullish().optional(),
  telefono: z.string().max(40).nullish().optional(),
  email: z.string().email().max(180).nullish().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const uploadAvatarSchema = z.object({
  mimetype: z.string().refine(v => /^image\//.test(v), 'Debe ser una imagen'),
  size: z.number().max(10 * 1024 * 1024, 'Máx 10MB') // cliente=10MB; servidor permite 25MB
})