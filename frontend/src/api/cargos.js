// /frontend/src/api/cargos.js
import { api, ensureCsrf } from './client'

export const listAmbitos = () => api.get('/cargos/ambitos')

// Cargos
export const listCargos = (params = {}) => api.get('/cargos', { params })
export const listCargosOverview = () => api.get('/cargos/overview')
export const getCargo = (id) => api.get(`/cargos/${id}`)
export const createCargo = async (body) => { await ensureCsrf(); return api.post('/cargos', body) }
export const updateCargo = async (id, body) => { await ensureCsrf(); return api.patch(`/cargos/${id}`, body) }
export const setCargoActive = async (id, is_activo) => { await ensureCsrf(); return api.patch(`/cargos/${id}/active`, { is_activo }) }
export const deleteCargo = async (id) => { await ensureCsrf(); return api.delete(`/cargos/${id}`) }

// Asignaciones a Feder
export const listFederCargoHistory = (federId) => api.get(`/cargos/feder/${federId}`)
export const assignToFeder = async (federId, body) => { await ensureCsrf(); return api.post(`/cargos/feder/${federId}/assign`, body) }
export const patchAssignment = async (federId, id, body) => { await ensureCsrf(); return api.patch(`/cargos/feder/${federId}/assignments/${id}`, body) }
export const deleteAssignment = async (federId, id) => { await ensureCsrf(); return api.delete(`/cargos/feder/${federId}/assignments/${id}`) }
