// frontend/src/api/status.js
import { api } from './client';

export const statusApi = {
    getCustom: () => api.get('/status/custom').then(res => res.data),
    addCustom: (data) => api.post('/status/custom', data).then(res => res.data),
    editCustom: (id, data) => api.put(`/status/custom/${id}`, data).then(res => res.data),
    removeCustom: (id) => api.delete(`/status/custom/${id}`).then(res => res.data),
    setCurrent: (data) => api.post('/status/current', data).then(res => res.data),
    getFederStatus: (feder_id) => api.get(`/status/feder/${feder_id}`).then(res => res.data),
};
