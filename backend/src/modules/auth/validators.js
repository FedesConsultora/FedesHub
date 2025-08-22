// backend/src/modules/auth/validators.js
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(200),
  roles: z.array(z.number().int().positive()).min(1),
  is_activo: z.boolean().optional().default(true)
});

export const changePasswordSchema = z.object({
  old_password: z.string().min(8),
  new_password: z.string()
    .min(10)
    .max(200)
    .refine(s => /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s), 'Debe tener mayúscula, minúscula y número'),
});

export const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const assignUserRolesSchema = z.object({
  userId: z.number().int().positive(),
  roles: z.array(z.number().int().positive()).min(1)
});

export const setUserActiveSchema = z.object({
  userId: z.number().int().positive(),
  is_activo: z.boolean()
});

// filtros para /permissions
export const listPermsQuerySchema = z.object({
  modulo: z.string().trim().toLowerCase().optional(),
  accion: z.string().trim().toLowerCase().optional(),
});

// roles
export const roleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createRoleBodySchema = z.object({
  nombre: z.string().min(3).max(100),
  descripcion: z.string().max(500).nullish(),
  rol_tipo: z.enum(['system','custom']).optional().default('custom') // normalmente 'custom'
});

export const updateRoleBodySchema = z.object({
  nombre: z.string().min(3).max(100).optional(),
  descripcion: z.string().max(500).nullish().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'Sin cambios' });

export const setRolePermsBodySchema = z.object({
  permisos: z.array(z.number().int().positive()).default([]),
});