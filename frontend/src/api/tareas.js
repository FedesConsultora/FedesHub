import { api } from './client'

const base = '/tareas'

const compactParams = (obj = {}) =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, v]) =>
      !(v === '' || v == null || (Array.isArray(v) && v.length === 0))
    )
  )

export const tareasApi = {
  // Catálogo para columnas/combos
  catalog: () => api.get(`${base}/catalog`).then(r => r.data),

  compose: (id = null) => api.get(`${base}/compose`, { params: id ? { id } : undefined }).then(r => r.data),


  // Listado/CRUD
  list: (params = {}) => api.get(base, { params }).then(r => ({ total: r.data.total ?? r.data.length ?? 0, rows: r.data.rows ?? r.data })),
  get: (id) => api.get(`${base}/${id}`).then(r => r.data),
  create: (body) => api.post(base, body).then(r => r.data),
  update: (id, body) => {
    // Limpiar keys con valor undefined para evitar validaciones incorrectas en el backend
    const cleanBody = Object.fromEntries(
      Object.entries(body).filter(([_, v]) => v !== undefined)
    );
    return api.patch(`${base}/${id}`, cleanBody).then(r => r.data);
  },
  archive: (id, on = true) => api.patch(`${base}/${id}/archive`, { on }).then(r => r.data),
  delete: (id) => api.delete(`${base}/${id}`).then(r => r.data),


  // Estado / aprobación / kanban
  moveKanban: (id, { stage, orden = 0 }) =>
    api.patch(`${base}/${id}/kanban`, { stage, orden }).then(r => r.data),
  setEstado: (id, estado_id) => api.patch(`${base}/${id}/estado`, { estado_id }).then(r => r.data),
  setAprobacion: (id, body) => api.patch(`${base}/${id}/aprobacion`, body).then(r => r.data),


  // Responsable / Colaborador
  addResp: (id, feder_id, es_lider = false) => api.post(`${base}/${id}/responsables`, { feder_id, es_lider }).then(r => r.data),
  delResp: (id, federId) => api.delete(`${base}/${id}/responsables/${federId}`).then(r => r.data),
  addColab: (id, feder_id, rol = null) => api.post(`${base}/${id}/colaboradores`, { feder_id, rol }).then(r => r.data),
  delColab: (id, federId) => api.delete(`${base}/${id}/colaboradores/${federId}`).then(r => r.data),
  setRespLeader: (id, feder_id) => api.post(`${base}/${id}/responsables/leader`, { feder_id }).then(r => r.data),


  // Etiquetas
  addEtiqueta: (id, etiqueta_id) => api.post(`${base}/${id}/etiquetas`, { etiqueta_id }).then(r => r.data),
  delEtiqueta: (id, etiquetaId) => api.delete(`${base}/${id}/etiquetas/${etiquetaId}`).then(r => r.data),

  // Checklist
  getChecklist: (id) => api.get(`${base}/${id}/checklist`).then(r => r.data),
  addChecklist: (id, titulo) => api.post(`${base}/${id}/checklist`, { titulo }).then(r => r.data),
  patchChecklistItem: (itemId, patch) => api.patch(`${base}/checklist/${itemId}`, patch).then(r => r.data),
  deleteChecklistItem: (itemId) => api.delete(`${base}/checklist/${itemId}`).then(r => r.data),
  reorderChecklist: (id, orden) => api.patch(`${base}/${id}/checklist/reorder`, { orden }).then(r => r.data),

  // Comentarios, Adjuntos, Relaciones
  getComentarios: (id) => api.get(`${base}/${id}/comentarios`).then(r => r.data),
  postComentario: (id, body) => api.post(`${base}/${id}/comentarios`, body).then(r => r.data),
  getAdjuntos: (id) => api.get(`${base}/${id}/adjuntos`).then(r => r.data),
  postAdjunto: (id, meta) => api.post(`${base}/${id}/adjuntos`, meta).then(r => r.data),
  deleteAdjunto: (adjId) => api.delete(`${base}/adjuntos/${adjId}`).then(r => r.data),
  postRelacion: (id, body) => api.post(`${base}/${id}/relaciones`, body).then(r => r.data),
  deleteRelacion: (id, relId) => api.delete(`${base}/${id}/relaciones/${relId}`).then(r => r.data),


  // Favoritos / Seguidores
  toggleFavorito: (id, on) => api.post(`${base}/${id}/favorite`, { on }).then(r => r.data),
  uploadAdjuntos: (id, files = [], esEmbebido = false) => {
    const fd = new FormData();
    (files || []).forEach(f => fd.append('files', f));
    if (esEmbebido) {
      fd.append('es_embebido', 'true');
    }
    return api.post(`${base}/${id}/adjuntos/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  listChildren: (parentId, params = {}) =>
    api.get(base, {
      params: compactParams({ ...params, tarea_padre_id: parentId, orden_by: 'created_at', sort: 'desc' })
    }).then(r => ({ total: r.data.total ?? 0, rows: r.data.rows ?? [] })),

  createChild: (parentId, body) =>
    api.post(base, { ...body, tarea_padre_id: Number(parentId) || null }).then(r => r.data),

  // Historial
  getHistorial: (id, params = {}) =>
    api.get(`${base}/${id}/historial`, { params: compactParams(params) }).then(r => r.data),

  // Boost manual
  setBoost: (id, enabled) =>
    api.patch(`${base}/${id}/boost`, { enabled }).then(r => r.data),
}