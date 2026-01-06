import { api } from './client'

const base = '/chat'

export const chatApi = {
  catalog: () => api.get(`${base}/catalog`).then(r => r.data),

  channels: {
    list: (params = {}) => api.get(`${base}/channels`, { params }).then(r => r.data),
    create: (body) => api.post(`${base}/channels`, body).then(r => r.data),
    update: (id, body) => api.put(`${base}/channels/${id}`, body).then(r => r.data),
    delete: (id) => api.delete(`${base}/channels/${id}`).then(r => r.data),
    archive: (id, on) => api.patch(`${base}/channels/${id}/archive`, { on }).then(r => r.data),
    settings: (id, body) => api.patch(`${base}/channels/${id}/settings`, body).then(r => r.data),

    uploadAvatar: (id, file) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.patch(`${base}/channels/${id}/avatar`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(r => r.data)
    },

    members: {
      list: (id) => api.get(`${base}/channels/${id}/members`).then(r => r.data),
      upsert: (id, body) => api.post(`${base}/channels/${id}/members`, body).then(r => r.data),
      patch: (id, user_id, body) => api.patch(`${base}/channels/${id}/members/${user_id}`, body).then(r => r.data),
      remove: (id, user_id) => api.delete(`${base}/channels/${id}/members/${user_id}`).then(r => r.data),
      join: (id) => api.post(`${base}/channels/${id}/join`).then(r => r.data),
      leave: (id) => api.post(`${base}/channels/${id}/leave`).then(r => r.data),
    },

    attachments: (id, params = {}) =>
      api.get(`${base}/channels/${id}/attachments`, { params }).then(r => r.data),
  },

  messages: {
    list: (canal_id, params = {}) => api.get(`${base}/channels/${canal_id}/messages`, { params }).then(r => r.data),
    search: (canal_id, q) => api.get(`${base}/channels/${canal_id}/search`, { params: { q } }).then(r => r.data),
    pins: (canal_id) => api.get(`${base}/channels/${canal_id}/pins`).then(r => r.data),
    create: (canal_id, body) => api.post(`${base}/channels/${canal_id}/messages`, body).then(r => r.data),
    createMultipart: (canal_id, formData) => api.post(`${base}/channels/${canal_id}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data),
    update: (mensaje_id, body) => api.put(`${base}/messages/${mensaje_id}`, body).then(r => r.data),
    delete: (mensaje_id) => api.delete(`${base}/messages/${mensaje_id}`).then(r => r.data),
    react: (mensaje_id, body) => api.post(`${base}/messages/${mensaje_id}/react`, body).then(r => r.data),
    pin: (mensaje_id, body) => api.post(`${base}/messages/${mensaje_id}/pin`, body).then(r => r.data),
    save: (mensaje_id, body) => api.post(`${base}/messages/${mensaje_id}/save`, body).then(r => r.data),
  },

  threads: {
    follow: (root_id, on = true) => api.post(`${base}/threads/${root_id}/follow`, { on }).then(r => r.data),
  },

  read: {
    set: (canal_id, last_read_msg_id) => api.post(`${base}/channels/${canal_id}/read`, { last_read_msg_id }).then(r => r.data)
  },

  presence: {
    set: (status, device) => api.post(`${base}/presence`, { status, device }).then(r => r.data),
    typing: (canal_id, on, ttl_seconds = 5) => api.post(`${base}/channels/${canal_id}/typing`, { on, ttl_seconds }).then(r => r.data),
  },

  invitations: {
    create: (canal_id, body) => api.post(`${base}/channels/${canal_id}/invitations`, body).then(r => r.data),
    accept: (token) => api.post(`${base}/invitations/${token}/accept`).then(r => r.data),
    decline: (token) => api.post(`${base}/invitations/${token}/decline`).then(r => r.data),
  },

  meetings: {
    schedule: (canal_id, body) => api.post(`${base}/channels/${canal_id}/meetings`, body).then(r => r.data)
  },

  dmsList: () => api.get(`${base}/dms`).then(r => r.data),
}
