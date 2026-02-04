// backend/src/modules/tareas/router.js
import { Router } from 'express';
import { requireAuth } from '../auth/middlewares/requireAuth.js';
import { requirePermission } from '../auth/middlewares/requirePermission.js';
import { uploadFiles, multerErrorHandler } from '../../infra/uploads/multer.js';

import {
  health, listCatalogos,
  listTareas, getTarea, postTarea, patchTarea, archiveTarea, deleteTarea,
  listTrash, patchRestore,
  patchEstado, patchAprobacion, patchKanban,
  postResponsable, deleteResponsable, postColaborador, deleteColaborador,
  postEtiqueta, deleteEtiqueta,
  getChecklist, postChecklist, patchChecklistItem, deleteChecklistItemCtrl, patchChecklistReorder,
  getComentarios, postComentario, postToggleReaccion,
  getAdjuntos, postAdjunto, deleteAdjuntoCtrl,
  postRelacion, deleteRelacionCtrl,
  postFavorito, postSeguidor,
  getCompose, postAdjuntoUpload, postResponsableLeader,
  getHistorial, patchBoostManual, getDriveImage, getDashboardMetricsCtrl, getUrgentTasksCtrl, getTaskFamily,
  getOnePager, getOnePagerSummary
} from './controllers/tareas.controller.js';

const router = Router();

// Health
router.get('/health', health);

// Catálogos
router.get('/catalog', requireAuth, requirePermission('tareas', 'read'), listCatalogos);

router.get('/compose', requireAuth, requirePermission('tareas', 'read'), getCompose);
router.get('/metrics', requireAuth, getDashboardMetricsCtrl);
router.get('/urgent', requireAuth, getUrgentTasksCtrl);

// Papelera
router.get('/trash', requireAuth, listTrash);
router.patch('/:id/restore', requireAuth, patchRestore);

// Listado y CRUD
router.get('/', requireAuth, requirePermission('tareas', 'read'), listTareas);
router.get('/:id', requireAuth, requirePermission('tareas', 'read'), getTarea);
router.get('/:id/family', requireAuth, requirePermission('tareas', 'read'), getTaskFamily);
router.post('/', requireAuth, requirePermission('tareas', 'create'), postTarea);
router.patch('/:id', requireAuth, requirePermission('tareas', 'update'), patchTarea);
router.patch('/:id/archive', requireAuth, requirePermission('tareas', 'delete'), archiveTarea);
router.delete('/:id', requireAuth, requirePermission('tareas', 'delete'), deleteTarea);

// Estado / aprobación / kanban
router.patch('/:id/estado', requireAuth, requirePermission('tareas', 'update'), patchEstado);
router.patch('/:id/aprobacion', requireAuth, requirePermission('tareas', 'approve'), patchAprobacion);
router.patch('/:id/kanban', requireAuth, requirePermission('tareas', 'kanban'), patchKanban);

// Subida de archivos (multipart): field "files"
router.post(
  '/:id/adjuntos/upload',
  requireAuth, requirePermission('tareas', 'attach'),
  uploadFiles,
  postAdjuntoUpload,
  multerErrorHandler
);

// Responsables / Colaboradores
router.post('/:id/responsables', requireAuth, requirePermission('tareas', 'assign'), postResponsable);
router.delete('/:id/responsables/:federId', requireAuth, requirePermission('tareas', 'assign'), deleteResponsable);
router.post('/:id/colaboradores', requireAuth, requirePermission('tareas', 'assign'), postColaborador);
router.delete('/:id/colaboradores/:federId', requireAuth, requirePermission('tareas', 'assign'), deleteColaborador);

router.post('/:id/responsables/leader', requireAuth, requirePermission('tareas', 'assign'), postResponsableLeader);

// Etiquetas
router.post('/:id/etiquetas', requireAuth, requirePermission('tareas', 'label'), postEtiqueta);
router.delete('/:id/etiquetas/:etiquetaId', requireAuth, requirePermission('tareas', 'label'), deleteEtiqueta);

// Checklist
router.get('/:id/checklist', requireAuth, requirePermission('tareas', 'read'), getChecklist);
router.post('/:id/checklist', requireAuth, requirePermission('tareas', 'update'), postChecklist);
router.patch('/checklist/:itemId', requireAuth, requirePermission('tareas', 'update'), patchChecklistItem);
router.delete('/checklist/:itemId', requireAuth, requirePermission('tareas', 'update'), deleteChecklistItemCtrl);
router.patch('/:id/checklist/reorder', requireAuth, requirePermission('tareas', 'update'), patchChecklistReorder);

// Comentarios
router.get('/:id/comentarios', requireAuth, requirePermission('tareas', 'read'), getComentarios);
router.post('/:id/comentarios', requireAuth, requirePermission('tareas', 'comment'), postComentario);
router.post('/:id/comentarios/:comentarioId/react', requireAuth, requirePermission('tareas', 'comment'), postToggleReaccion);

// Historial de cambios
router.get('/:id/historial', requireAuth, requirePermission('tareas', 'read'), getHistorial);

// Boost manual (prioridad)
router.patch('/:id/boost', requireAuth, requirePermission('tareas', 'update'), patchBoostManual);

// Adjuntos de tarea (no los del comentario, que se suben junto al comentario)
router.get('/:id/adjuntos', requireAuth, requirePermission('tareas', 'read'), getAdjuntos);
router.post('/:id/adjuntos', requireAuth, requirePermission('tareas', 'attach'), postAdjunto);
router.delete('/adjuntos/:adjId', requireAuth, requirePermission('tareas', 'attach'), deleteAdjuntoCtrl);

// Relaciones
router.post('/:id/relaciones', requireAuth, requirePermission('tareas', 'relate'), postRelacion);
router.delete('/:id/relaciones/:relId', requireAuth, requirePermission('tareas', 'relate'), deleteRelacionCtrl);

// Favoritos / Seguidores
router.post('/:id/favorite', requireAuth, requirePermission('tareas', 'read'), postFavorito);
router.post('/:id/follow', requireAuth, requirePermission('tareas', 'read'), postSeguidor);

// Recordatorios
import { getRecordatorios, postRecordatorio, deleteRecordatorio } from './controllers/tareas.controller.js';
router.get('/:id/recordatorios', requireAuth, requirePermission('tareas', 'read'), getRecordatorios);
router.post('/:id/recordatorios', requireAuth, requirePermission('tareas', 'read'), postRecordatorio);
router.delete('/:id/recordatorios/:remId', requireAuth, requirePermission('tareas', 'read'), deleteRecordatorio);

// One Pager View
router.get('/one-pager/summary', requireAuth, requirePermission('tareas', 'read'), getOnePagerSummary);
router.get('/one-pager/:cliente_id', requireAuth, requirePermission('tareas', 'read'), getOnePager);

// Proxy para imágenes de Google Drive
router.get('/drive/image/:fileId', requireAuth, getDriveImage);

export default router;
