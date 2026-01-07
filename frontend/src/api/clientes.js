import { api } from './client'

const base = '/clientes'
// helper: quita '', null, undefined y arrays vacíos
const compactParams = (obj = {}) =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, v]) =>
      !(v === '' || v == null || (Array.isArray(v) && v.length === 0))
    )
  )

export const clientesApi = {
  // Catálogo (tipos, estados, ponderaciones)
  catalog: () => api.get(`${base}/catalog`).then(r => r.data),

  // Listado/CRUD
  list: (params = {}) =>
    api.get(base, { params: compactParams(params) })
      .then(r => ({ total: r.data.total ?? 0, rows: r.data.rows ?? [] })),


  detail: (id, params = {}) =>
    api.get(`${base}/${id}`, { params: compactParams(params) }).then(r => r.data),

  get: (id) => api.get(`${base}/${id}`).then(r => r.data),
  create: (body) => api.post(base, body).then(r => r.data),
  update: (id, body) => api.patch(`${base}/${id}`, body).then(r => r.data),
  remove: (id, { force = false } = {}) =>
    api.delete(`${base}/${id}`, { params: { force } }).then(r => r.data),

  /* assignCelula removed */

  // Contactos
  listContactos: (id, params = {}) => api.get(`${base}/${id}/contactos`, { params }).then(r => r.data),
  createContacto: (id, body) => api.post(`${base}/${id}/contactos`, body).then(r => r.data),
  updateContacto: (id, contactoId, body) => api.patch(`${base}/${id}/contactos/${contactoId}`, body).then(r => r.data),
  deleteContacto: (id, contactoId) => api.delete(`${base}/${id}/contactos/${contactoId}`).then(r => r.data),

  // Resúmenes (opcionales para dashboard)
  resumenEstado: () => api.get(`${base}/resumen/estado`).then(r => r.data),
  resumenPonderacion: () => api.get(`${base}/resumen/ponderacion`).then(r => r.data),
  resumenPonderacion: () => api.get(`${base}/resumen/ponderacion`).then(r => r.data),
  /* resumenCelula removed */

}