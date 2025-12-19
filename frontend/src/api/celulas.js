// /frontend/src/api/celulas.js
import { api } from './client'

const get = (url, params) => api.get(url, { params }).then(r => r.data)
const post = (url, body) => api.post(url, body).then(r => r.data)
const patch = (url, body) => api.patch(url, body).then(r => r.data)
const del = (url) => api.delete(url).then(r => r.data)

export const celulasApi = {
    list: (params = {}) => get('/celulas', params),
    get: (id) => get(`/celulas/${id}`),
    create: (body) => post('/celulas', body),
    update: (id, body) => patch(`/celulas/${id}`, body),
    changeState: (id, body) => post(`/celulas/${id}/state`, body),

    // Asignaciones de miembros
    listAsignaciones: (id) => get(`/celulas/${id}/asignaciones`),
    addAsignacion: (id, body) => post(`/celulas/${id}/asignaciones`, body),
    closeAsignacion: (asignacionId) => patch(`/celulas/asignaciones/${asignacionId}`),

    // Clientes
    listClientes: (id) => get(`/celulas/${id}/clientes`),

    // Avatar
    uploadAvatar: async (id, file) => {
        const fd = new FormData()
        fd.append('file', file)
        return post(`/celulas/${id}/avatar`, fd)
    },

    // Catálogos
    catalog: async () => {
        const [estados, roles] = await Promise.all([
            get('/celulas/catalog/estados'),
            get('/celulas/catalog/roles')
        ])
        return { estados, roles }
    }
}
