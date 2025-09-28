// src/api/calendario.js
import { api } from './client'
const base = '/calendario'

// memo simple para no pedir /catalog varias veces
let _catalogCache = null
const fetchCatalog = async () => {
  if (_catalogCache) return _catalogCache
  const d = await api.get(`${base}/catalog`).then(r=>r.data || {})
  _catalogCache = d
  return d
}

export const calendarioApi = {
  catalog: {
    // tu EventForm usa eventoTipos y visibilidades
    eventoTipos:     () => fetchCatalog().then(d => d.eventoTipos || []),
    visibilidades:   () => fetchCatalog().then(d => d.visibilidades || []),
    asistentesTipos: () => fetchCatalog().then(d => d.asistenteTipos || []),
    // si querés direcciones de sync y no hay endpoint, las exponemos “hardcode”
    syncDirecciones: () => Promise.resolve([
      { codigo:'pull',  nombre:'Sólo traer de Google' },
      { codigo:'push',  nombre:'Sólo enviar a Google' },
      { codigo:'both',  nombre:'Bidireccional' },
      { codigo:'none',  nombre:'Sincronización desactivada' },
    ])
  },

  calendars: {
    list: (params={}) => api.get(`${base}/calendars`, { params }).then(r=>r.data),
    // “mine” es un helper que usa scope=mine (por defecto ya es 'mine', pero lo dejo explícito)
    mine: (params={}) => api.get(`${base}/calendars`, { params: { scope:'mine', ...params } }).then(r=>r.data),
    create: (body)    => api.post(`${base}/calendars`, body).then(r=>r.data),
    update: (id,body) => api.put(`${base}/calendars/${id}`, body).then(r=>r.data),
  },

  events: {
    list:   (params={}) => {
      const q = {
        start: params.start,
        end:   params.end,
        scope: params.scope || 'mine',
      }
      // sólo mandar calendario_ids si hay algo
      if (params.calendario_ids && String(params.calendario_ids).trim()) {
        q.calendario_ids = params.calendario_ids
      }
      if (params.q) q.q = params.q
      return api.get(`${base}/events`, { params: q }).then(r=>r.data)
    },
    detail: (id)       => api.get(`${base}/events/${id}`).then(r=>r.data),
    create: (body)     => api.post(`${base}/events`, body).then(r=>r.data),
    update: (id, body) => api.put(`${base}/events/${id}`, body).then(r=>r.data),
    delete: (id)       => api.delete(`${base}/events/${id}`).then(r=>r.data),
  },

  google: {
    // si el usuario no conectó Google, este endpoint devuelve 400 → manejalo en el hook
    listCalendars: () => api.get(`${base}/google/calendars`).then(r=>r.data),
    link:    (body) => api.post(`${base}/google/link`, body).then(r=>r.data),
    syncOne: (calendario_local_id) => api.post(`${base}/google/sync`, { calendario_local_id }).then(r=>r.data),
    startWatch: (calLocalId) => api.post(`${base}/google/watch/${calLocalId}/start`).then(r=>r.data),
    stopWatch:  (channel_id, resource_id) => api.post(`${base}/google/watch/stop`, { channel_id, resource_id }).then(r=>r.data),
    connectUrl: () => `${api.defaults.baseURL || '/api'}/auth/google`, // inicio de OAuth
  }
}
