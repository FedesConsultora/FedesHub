// src/api/ausencias.js
import { api } from './client'

const base = '/ausencias'

export const ausenciasApi = {
  // ── Catálogos
  catalog: {
    unidades: () => api.get(`${base}/catalog/unidades`).then(r => r.data),
    estados: () => api.get(`${base}/catalog/estados`).then(r => r.data),
    mitadDia: () => api.get(`${base}/catalog/mitad-dia`).then(r => r.data),
    tipos: (params = {}) => api.get(`${base}/tipos`, { params }).then(r => r.data),
    tipoCreate: (body) => api.post(`${base}/tipos`, body).then(r => r.data),
    tipoPatch: (id, body) => api.patch(`${base}/tipos/${id}`, body).then(r => r.data),
  },

  // ── Cuotas / Saldos
  cuotas: {
    assign: (body) => api.post(`${base}/cuotas`, body).then(r => r.data),
    assignBatch: (body) => api.post(`${base}/cuotas/batch`, body).then(r => r.data),
    list: (params = {}) => api.get(`${base}/cuotas`, { params }).then(r => r.data),
    saldo: (params) => api.get(`${base}/saldos`, { params }).then(r => r.data),
    meSaldo: (params = {}) => api.get(`${base}/me/saldos`, { params }).then(r => r.data),
  },

  // ── Ausencias
  aus: {
    list: (params = {}) => api.get(`${base}/`, { params }).then(r => r.data),
    detail: (id) => api.get(`${base}/${id}`).then(r => r.data),
    create: (body) => api.post(`${base}/`, body).then(r => r.data),
    meCreate: (body) => api.post(`${base}/me`, body).then(r => r.data),
    approve: (id) => api.post(`${base}/${id}/approve`).then(r => r.data),
    reject: (id, body) => api.post(`${base}/${id}/reject`, body).then(r => r.data),
    cancel: (id) => api.post(`${base}/${id}/cancel`).then(r => r.data),
    reset: (id) => api.post(`${base}/${id}/reset`).then(r => r.data),
    update: (id, body) => api.patch(`${base}/${id}`, body).then(r => r.data),
  },

  // ── Solicitudes de asignación
  asignacion: {
    create: (body) => api.post(`${base}/asignacion/solicitudes`, body).then(r => r.data),
    list: (params = {}) => api.get(`${base}/asignacion/solicitudes`, { params }).then(r => r.data),
    approve: (id) => api.post(`${base}/asignacion/solicitudes/${id}/approve`).then(r => r.data),
    deny: (id, body) => api.post(`${base}/asignacion/solicitudes/${id}/deny`, body).then(r => r.data),
    cancel: (id) => api.post(`${base}/asignacion/solicitudes/${id}/cancel`).then(r => r.data),
  },

  // ── Adjuntos / Archivos
  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`${base}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },

  getCounts: () => api.get(`${base}/counts`).then(r => r.data)
}
