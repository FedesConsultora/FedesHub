// frontend/src/api/comercial.js
import { api } from './client.js';

export const comercialApi = {
    getCatalogs: () => api.get('/comercial/catalogs'),
    listLeads: (params) => api.get('/comercial/leads', { params }),
    getLead: (id) => api.get(`/comercial/leads/${id}`),
    createLead: (data) => api.post('/comercial/leads', data),
    updateLead: (id, data) => api.patch(`/comercial/leads/${id}`, data),
    deleteLead: (id) => api.delete(`/comercial/leads/${id}`),
    addNota: (id, data) => api.post(`/comercial/leads/${id}/notes`, data),
    winNegotiation: (id, data) => api.post(`/comercial/leads/${id}/win`, data),
    loseNegotiation: (id, data) => api.post(`/comercial/leads/${id}/lose`, data),
    resolveOnboarding: (id, data) => api.post(`/comercial/leads/${id}/resolve-onboarding`, data),
    importLeads: (formData) => api.post('/comercial/import', formData),
    listTrash: () => api.get('/comercial/leads/trash'),
    restoreLead: (id) => api.post(`/comercial/leads/${id}/restore`),
    listOnboarding: (params) => api.get('/comercial/leads/onboarding', { params }),

    // Admin
    listEECC: () => api.get('/comercial/admin/eecc'),
    createEECC: (data) => api.post('/comercial/admin/eecc', data),
    updateEECC: (id, data) => api.patch(`/comercial/admin/eecc/${id}`, data),
    deleteEECC: (id) => api.delete(`/comercial/admin/eecc/${id}`),

    listProductos: () => api.get('/comercial/admin/products'),
    createProducto: (data) => api.post('/comercial/admin/products', data),
    updateProducto: (id, data) => api.patch(`/comercial/admin/products/${id}`, data),
    deleteProducto: (id) => api.delete(`/comercial/admin/products/${id}`),

    listDescuentos: () => api.get('/comercial/admin/discounts'),
    createDescuento: (data) => api.post('/comercial/admin/discounts', data),
    updateDescuento: (id, data) => api.patch(`/comercial/admin/discounts/${id}`, data),
    deleteDescuento: (id) => api.delete(`/comercial/admin/discounts/${id}`),

    listObjetivos: (eeccId) => api.get(`/comercial/admin/objectives/${eeccId}`),
    upsertObjetivoQ: (data) => api.post('/comercial/admin/objectives/q', data),
    upsertObjetivoMes: (data) => api.post('/comercial/admin/objectives/mes', data),
    upsertDescuentoCap: (data) => api.post('/comercial/admin/objectives/cap', data),

    // Stats
    getStats: (params) => api.get('/comercial/stats', { params }),
    getEeccStats: (id) => api.get(`/comercial/stats/eecc/${id}`)
};
