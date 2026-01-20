// frontend/src/api/comercial.js
import { api } from './client.js';

export const comercialApi = {
    getCatalogs: () => api.get('/comercial/catalogs'),
    listLeads: (params) => api.get('/comercial/leads', { params }),
    getLead: (id) => api.get(`/comercial/leads/${id}`),
    createLead: (data) => api.post('/comercial/leads', data),
    updateLead: (id, data) => api.patch(`/comercial/leads/${id}`, data),
    addNota: (id, data) => api.post(`/comercial/leads/${id}/notes`, data),
    winNegotiation: (id, data) => api.post(`/comercial/leads/${id}/win`, data),
    loseNegotiation: (id, data) => api.post(`/comercial/leads/${id}/lose`, data),
    resolveOnboarding: (id, data) => api.post(`/comercial/leads/${id}/resolve-onboarding`, data),
    importLeads: (formData) => api.post('/comercial/import', formData)
};
