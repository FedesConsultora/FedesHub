// src/api/notificaciones.js  (o donde tengas el notifApi)
import { api } from './client'
const base = '/notificaciones'

export const notifApi = {
  // Ventanas (conteos)
  counts: () => api.get(`${base}/windows/counts`).then(r => r.data),

  // Inbox
  inbox: (params={}) => api.get(`${base}/inbox`, { params }).then(r => r.data),

  // Marcas por notificación (id = notificacion_id)
  seen:     (id)            => api.patch(`${base}/${id}/seen`).then(r => r.data),
  read:     (id, on=true)   => api.patch(`${base}/${id}/read`, { on }).then(r => r.data),
  dismiss:  (id, on=true)   => api.patch(`${base}/${id}/dismiss`, { on }).then(r => r.data),
  archive:  (id, on=true)   => api.patch(`${base}/${id}/archive`, { on }).then(r => r.data),
  pin:      (id, orden=null)=> api.patch(`${base}/${id}/pin`, { orden }).then(r => r.data),

  // Preferencias
  prefs:    ()        => api.get(`${base}/preferences`).then(r => r.data),
  setPrefs: (items)   => api.put(`${base}/preferences`, { items }).then(r => r.data),

  // Chat util
  chatCanales: () => api.get(`${base}/chat/canales`).then(r => r.data),

  // Diagnóstico
  health: {
    smtp: () => api.get(`${base}/health/smtp`).then(r => r.data),
    push: () => api.get(`${base}/health/push`).then(r => r.data),
  },

  // Crear manual (para pruebas)
  create: (body) => api.post(`${base}`, body).then(r => r.data),

  // 🔔 Push tokens
  registerPushToken: (token, plataforma='web', device_info=(typeof navigator!=='undefined'?navigator.userAgent:'')) =>
    api.post(`${base}/push/tokens`, { token, plataforma, device_info }).then(r => r.data),
  unregisterPushToken: (token) =>
    api.delete(`${base}/push/tokens`, { data: { token } }).then(r => r.data).catch(()=>{})
}
