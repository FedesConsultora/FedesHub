// src/api/auth.js
import { api, ensureCsrf } from './client'

// =======================
// Core Auth
// =======================
export const health       = ()            => api.get('/auth/health')
export const getSession   = ()            => api.get('/auth/me')
export const login        = async (email, password) => {
  await ensureCsrf()
  return api.post('/auth/login', { email, password })
}
export const refresh      = async ()      => {
  await ensureCsrf()
  return api.post('/auth/refresh')
}
export const logout       = async ()      => {
  await ensureCsrf()
  return api.post('/auth/logout')
}
export const changePass   = async (body)  => {
  await ensureCsrf()
  return api.post('/auth/change-password', body) // { old_password, new_password }
}

// =======================
// Admin: Usuarios / Roles
// =======================
export const adminCreateUser = async (body) => {
  // body: { email, password, roles: ['Admin','Feder'], is_activo: true }
  await ensureCsrf()
  return api.post('/auth/users', body)
}
export const adminListUsers = (q = '') =>
  api.get('/auth/users', { params: { q } })

export const adminPatchUserRoles = async (id, roles) => {
  // roles: ['Admin','Feder']
  await ensureCsrf()
  return api.patch(`/auth/users/${id}/roles`, { roles })
}

export const adminPatchUserActive = async (id, is_activo) => {
  await ensureCsrf()
  return api.patch(`/auth/users/${id}/active`, { is_activo })
}

export const adminListRoles = () => api.get('/auth/roles')

// =======================
// Roles CRUD
// =======================
export const adminGetRole = (id) => api.get(`/auth/roles/${id}`)

export const adminCreateRole = async (body) => {
  // body: { nombre, descripcion?, rol_tipo_id? }
  await ensureCsrf()
  return api.post('/auth/roles', body)
}

export const adminUpdateRole = async (id, body) => {
  await ensureCsrf()
  return api.patch(`/auth/roles/${id}`, body)
}

export const adminDeleteRole = async (id) => {
  await ensureCsrf()
  return api.delete(`/auth/roles/${id}`)
}

// =======================
// Catálogos de permisos
// =======================
export const adminListPermissions = (q = '') =>
  api.get('/auth/permissions', { params: { q } })

export const adminListModules   = () => api.get('/auth/modules')
export const adminListActions   = () => api.get('/auth/actions')
export const adminListRoleTypes = () => api.get('/auth/role-types')

// =======================
// Permisos por rol
// =======================
// set = reemplaza todos los permisos del rol por los provistos
export const adminSetRolePermissions = async (id, permisoIds) => {
  // permisoIds: [1,2,3,...]
  await ensureCsrf()
  return api.patch(`/auth/roles/${id}/permissions`, { permisoIds })
}

// add = agrega permisos al rol (incremental)
export const adminAddRolePermissions = async (id, permisoIds) => {
  await ensureCsrf()
  return api.post(`/auth/roles/${id}/permissions`, { permisoIds })
}

// remove = quita permisos del rol (incremental)
export const adminRemoveRolePermissions = async (id, permisoIds) => {
  await ensureCsrf()
  return api.delete(`/auth/roles/${id}/permissions`, { data: { permisoIds } })
}