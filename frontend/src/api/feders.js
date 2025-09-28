// frontend/src/api/feders.js
import { api } from './client'

// Helpers pequeños para mantener consistencia .data
const get  = (url, params)        => api.get(url,   { params }).then(r => r.data)
const del  = (url)                 => api.delete(url).then(r => r.data)
const post = (url, body)           => api.post(url,  body).then(r => r.data)
const put  = (url, body)           => api.put(url,   body).then(r => r.data)
const patch= (url, body)           => api.patch(url, body).then(r => r.data)

export const federsApi = {
  // ---------- Catálogo
  async catalog() {
    const [estados, modalidades, dias, celulas] = await Promise.all([
      get('/feders/catalog/estados'),
      get('/feders/catalog/modalidades'),
      get('/feders/catalog/dias-semana'),
      get('/celulas', { limit: 200 })
    ])
    return { estados, modalidades, dias, celulas }
  },

  // ---------- Feders (lectura/admin)
  overview: (params = {}) => get('/feders/overview', params),
  list:     (params = {}) => get('/feders', params),
  get:      (id)          => get(`/feders/${id}`),
  getMine:  ()            => get('/feders/self'),
  getByUserId: (userId)   => get(`/feders/by-user/${userId}`),

  // ---------- Update (admin vs self)
  // Admin (requiere permiso 'feders.update')
  update:    (id, payload)   => patch(`/feders/${id}`, payload),
  // Propio (no requiere permiso, sólo sesión válida)
  updateSelf:(payload)       => patch('/feders/self', payload),
  setActive: (id, is_activo) => patch(`/feders/${id}/active`, { is_activo }),

  // ---------- Modalidad por día
  getModalidad:   (federId)           => get(`/feders/${federId}/modalidad`),
  upsertModalidad:(federId, body)     => patch(`/feders/${federId}/modalidad`, body),
  bulkSetModalidad:(federId, items)   => put(`/feders/${federId}/modalidad`, { items }),
  removeModalidad:(federId, diaId)    => del(`/feders/${federId}/modalidad/${diaId}`),

  // ---------- Firma de perfil
  getFirma:        (federId)      => get(`/feders/${federId}/firma-perfil`),
  upsertFirma:     (federId, body)=> put(`/feders/${federId}/firma-perfil`, body),
  // Aliases (compat con tus componentes)
  getFirmaPerfil:  (federId)      => get(`/feders/${federId}/firma-perfil`),
  saveFirmaPerfil: (federId, body)=> put(`/feders/${federId}/firma-perfil`, body),

  // ---------- Bancos
  listBancos:   (federId)               => get(`/feders/${federId}/bancos`),
  createBanco:  (federId, body)         => post(`/feders/${federId}/bancos`, body),
  updateBanco:  (federId, bankId, body) => patch(`/feders/${federId}/bancos/${bankId}`, body),
  deleteBanco:  (federId, bankId)       => del(`/feders/${federId}/bancos/${bankId}`),

  // ---------- Emergencias
  listEmergencias: (federId)                     => get(`/feders/${federId}/emergencias`),
  createEmergencia:(federId, body)               => post(`/feders/${federId}/emergencias`, body),
  updateEmergencia:(federId, contactoId, body)   => patch(`/feders/${federId}/emergencias/${contactoId}`, body),
  deleteEmergencia:(federId, contactoId)         => del(`/feders/${federId}/emergencias/${contactoId}`),

  // ---------- Avatar (multipart)
  uploadAvatar: async (federId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return post(`/feders/${federId}/avatar`, fd)
  }
}
