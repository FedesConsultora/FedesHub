// src/api/asistencia.js
import { api } from './client'
const base = '/asistencia'

const me = {
  open:    () => api.get(`${base}/me/open`).then(r => r.data),
  list:    (params={}) => api.get(`${base}/me/registros`, { params })
                  .then(r => ({ total: r.data.total ?? r.data.length ?? 0, rows: r.data.rows ?? r.data })),
  checkIn: (body) => api.post(`${base}/me/check-in`, body).then(r => r.data),
  checkOut:(body) => api.post(`${base}/me/check-out`, body).then(r => r.data),
  toggle:  (body) => api.post(`${base}/me/toggle`, body).then(r => r.data),

  // ⬇️ Antes recibía un string; ahora acepta params (objeto)
  timelineDia: (params) =>
    api.get(`${base}/me/timeline-dia`, { params }).then(r => r.data),
}

const apiRoot = {
  list: (params = {}) =>
    api.get(`${base}/registros`, { params })
       .then(r => ({ total: r.data.total ?? r.data.length ?? 0, rows: r.data.rows ?? r.data })),
  get:  (id) => api.get(`${base}/registros/${id}`).then(r => r.data),

  catalogOrigenes:      () => api.get(`${base}/catalog/origenes`).then(r => r.data),
  catalogCierreMotivos: () => api.get(`${base}/catalog/cierre-motivos`).then(r => r.data),

  timelineDia: (params) =>
    api.get(`${base}/timeline-dia`, { params }).then(r => r.data),

  me,

  // Back-compat
  meOpen:     me.open,
  meList:     me.list,
  meCheckIn:  me.checkIn,
  meCheckOut: me.checkOut,
  meToggle:   me.toggle,
}
export const asistenciaApi = apiRoot