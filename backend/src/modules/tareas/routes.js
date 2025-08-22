// backend/src/modules/tareas/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';

import {
  health, listCatalogos,
  listTareas, getTarea, postTarea, patchTarea, archiveTarea,
  patchEstado, patchAprobacion, patchKanban,
  postResponsable, deleteResponsable, postColaborador, deleteColaborador,
  postEtiqueta, deleteEtiqueta,
  getChecklist, postChecklist, patchChecklistItem, deleteChecklistItemCtrl, patchChecklistReorder,
  getComentarios, postComentario,
  getAdjuntos, postAdjunto, deleteAdjuntoCtrl,
  postRelacion, deleteRelacionCtrl,
  postFavorito, postSeguidor
} from './controllers/tareas.controller.js';

const router = Router();

// Health
router.get('/health', health);

// Catálogos
router.get('/catalog', requireAuth, requirePermission('tareas','read'), listCatalogos);

// Listado y CRUD
router.get('/',        requireAuth, requirePermission('tareas','read'),   listTareas);
router.get('/:id',     requireAuth, requirePermission('tareas','read'),   getTarea);
router.post('/',       requireAuth, requirePermission('tareas','create'), postTarea);
router.patch('/:id',   requireAuth, requirePermission('tareas','update'), patchTarea);
router.patch('/:id/archive', requireAuth, requirePermission('tareas','delete'), archiveTarea);

// Estado / aprobación / kanban
router.patch('/:id/estado',      requireAuth, requirePermission('tareas','update'),   patchEstado);
router.patch('/:id/aprobacion',  requireAuth, requirePermission('tareas','approve'),  patchAprobacion);
router.patch('/:id/kanban',      requireAuth, requirePermission('tareas','kanban'),   patchKanban);

// Responsables / Colaboradores
router.post('/:id/responsables',                 requireAuth, requirePermission('tareas','assign'), postResponsable);
router.delete('/:id/responsables/:federId',      requireAuth, requirePermission('tareas','assign'), deleteResponsable);
router.post('/:id/colaboradores',                requireAuth, requirePermission('tareas','assign'), postColaborador);
router.delete('/:id/colaboradores/:federId',     requireAuth, requirePermission('tareas','assign'), deleteColaborador);

// Etiquetas
router.post('/:id/etiquetas',                requireAuth, requirePermission('tareas','label'), postEtiqueta);
router.delete('/:id/etiquetas/:etiquetaId',  requireAuth, requirePermission('tareas','label'), deleteEtiqueta);

// Checklist
router.get('/:id/checklist',                    requireAuth, requirePermission('tareas','read'),    getChecklist);
router.post('/:id/checklist',                   requireAuth, requirePermission('tareas','update'),  postChecklist);
router.patch('/checklist/:itemId',              requireAuth, requirePermission('tareas','update'),  patchChecklistItem);
router.delete('/checklist/:itemId',             requireAuth, requirePermission('tareas','update'),  deleteChecklistItemCtrl);
router.patch('/:id/checklist/reorder',          requireAuth, requirePermission('tareas','update'),  patchChecklistReorder);

// Comentarios
router.get('/:id/comentarios',                  requireAuth, requirePermission('tareas','read'),     getComentarios);
router.post('/:id/comentarios',                 requireAuth, requirePermission('tareas','comment'),  postComentario);

// Adjuntos de tarea (no los del comentario, que se suben junto al comentario)
router.get('/:id/adjuntos',                     requireAuth, requirePermission('tareas','read'),     getAdjuntos);
router.post('/:id/adjuntos',                    requireAuth, requirePermission('tareas','attach'),   postAdjunto);
router.delete('/adjuntos/:adjId',               requireAuth, requirePermission('tareas','attach'),   deleteAdjuntoCtrl);

// Relaciones
router.post('/:id/relaciones',                  requireAuth, requirePermission('tareas','relate'),   postRelacion);
router.delete('/:id/relaciones/:relId',         requireAuth, requirePermission('tareas','relate'),   deleteRelacionCtrl);

// Favoritos / Seguidores
router.post('/:id/favorite',                    requireAuth, requirePermission('tareas','read'),     postFavorito);
router.post('/:id/follow',                      requireAuth, requirePermission('tareas','read'),     postSeguidor);

export default router;
