import { api } from './client'

const base = '/gastos'

export const gastosApi = {
    list: (params = {}) => api.get(`${base}/`, { params }).then(r => r.data),
    summary: (params = {}) => api.get(`${base}/summary`, { params }).then(r => r.data),
    getById: (id) => api.get(`${base}/${id}`).then(r => r.data),
    create: (data, files) => {
        const fd = new FormData()
        fd.append('descripcion', data.descripcion)
        fd.append('monto', data.monto)
        fd.append('moneda', data.moneda)
        fd.append('fecha', data.fecha)
        files.forEach(f => fd.append('files', f))
        return api.post(`${base}/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(r => r.data)
    },
    update: (id, body) => api.put(`${base}/${id}`, body).then(r => r.data),
    delete: (id) => api.delete(`${base}/${id}`).then(r => r.data),
    updateStatus: (id, body) => api.patch(`${base}/${id}/status`, body).then(r => r.data),
}
