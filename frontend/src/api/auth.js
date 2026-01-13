// /frontend/src/api/auth.js
import { api, ensureCsrf } from './client'

// Core
export const health = () => api.get('/auth/health')
export const getSession = () => api.get('/auth/me', { validateStatus: s => s === 200 || s === 401 })
export const login = async (email, password) => { await ensureCsrf(); return api.post('/auth/login', { email, password }) }
export const refresh = async () => { await ensureCsrf(); return api.post('/auth/refresh') }
export const logout = async () => { await ensureCsrf(); return api.post('/auth/logout') }
export const changePass = async (body) => { await ensureCsrf(); return api.post('/auth/change-password', body) }

// Admin users/roles
export const adminCreateUser = async (body) => { await ensureCsrf(); return api.post('/auth/users', body) }
export const adminListUsers = (q = '') => api.get('/auth/users', { params: { q } })
export const adminPatchUserRoles = async (id, roles) => { await ensureCsrf(); return api.patch(`/auth/users/${id}/roles`, { roles }) }
export const adminPatchUserActive = async (id, is_activo) => { await ensureCsrf(); return api.patch(`/auth/users/${id}/active`, { is_activo }) }
export const adminDeleteUser = async (id) => { await ensureCsrf(); return api.delete(`/auth/users/${id}`) }
export const adminListRoles = () => api.get('/auth/roles')

// Roles CRUD
export const adminGetRole = (id) => api.get(`/auth/roles/${id}`)
export const adminCreateRole = async (body) => { await ensureCsrf(); return api.post('/auth/roles', body) }
export const adminUpdateRole = async (id, b) => { await ensureCsrf(); return api.patch(`/auth/roles/${id}`, b) }
export const adminDeleteRole = async (id) => { await ensureCsrf(); return api.delete(`/auth/roles/${id}`) }
export const adminSetRoleMembers = async (id, user_ids) => { await ensureCsrf(); return api.post(`/auth/roles/${id}/members`, { user_ids }) }

// Forgot / Reset
export const forgotPassword = async (email) => { await ensureCsrf(); return api.post('/auth/forgot-password', { email }) }
export const resetPassword = async ({ token, new_password }) => { await ensureCsrf(); return api.post('/auth/reset-password', { token, new_password }) }

// Catálogos permisos
export const adminListPermissions = (params = {}) => api.get('/auth/permissions', { params })
export const adminListModules = () => api.get('/auth/modules')
export const adminListActions = () => api.get('/auth/actions')
export const adminListRoleTypes = () => api.get('/auth/role-types')

// Permisos por rol (backend espera { permisos })
export const adminSetRolePermissions = async (id, permisos) => { await ensureCsrf(); return api.patch(`/auth/roles/${id}/permissions`, { permisos }) }
export const adminAddRolePermissions = async (id, permisos) => { await ensureCsrf(); return api.post(`/auth/roles/${id}/permissions`, { permisos }) }
export const adminRemoveRolePermissions = async (id, permisos) => { await ensureCsrf(); return api.delete(`/auth/roles/${id}/permissions`, { data: { permisos } }) }
