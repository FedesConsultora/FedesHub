import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { tareasApi } from '../../api/tareas'
import TaskStatusCard from '../../components/tasks/TaskStatusCard'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import AssignedPeople from '../../components/tasks/AssignedPeople'
import LabelChip from '../../components/common/LabelChip'
import TaskComments from '../../components/tasks/comments'
import TaskChecklist from '../../components/tasks/TaskChecklist.jsx'
import RichTextEditor from '../../components/common/RichTextEditor.jsx'
import { useModal } from '../../components/modal/ModalProvider.jsx'
import SubtasksPanel from '../../components/tasks/SubtasksPanel.jsx'
import TaskFamilyModal from '../../components/tasks/TaskFamilyModal.jsx'
import CreateTaskModal from '../../components/tasks/CreateTaskModal.jsx'
import ParticipantsEditor from '../../components/tasks/ParticipantsEditor.jsx'
import useContentEditable from '../../hooks/useContentEditable'
import { useToast } from '../../components/toast/ToastProvider.jsx'
import { MdKeyboardArrowDown, MdAddComment, MdAdd, MdAttachFile, MdLink } from 'react-icons/md'
import { FaRegSave, FaStar, FaTrash } from "react-icons/fa";
import { FiLock, FiCheckCircle, FiClock, FiArrowLeft, FiGitBranch, FiPlus, FiEye } from "react-icons/fi";
import { FaFilePdf, FaFileWord, FaFileExcel, FaFileArchive, FaFileCode, FaFileAlt, FaFolder } from 'react-icons/fa';
import TaskHistory from '../../components/tasks/TaskHistory.jsx'
import PriorityBoostCheckbox from '../../components/tasks/PriorityBoostCheckbox.jsx'
import TitleTooltip from '../../components/tasks/TitleTooltip.jsx'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import { useUploadContext } from '../../context/UploadProvider.jsx'
import { useTaskAttachments } from '../../pages/Tareas/hooks/useTaskAttachments'
import ContentGallery from '../../components/tasks/ContentGallery.jsx'
import ImageFullscreen from '../../components/common/ImageFullscreen.jsx'
import GlobalLoader from '../../components/loader/GlobalLoader.jsx'
import TaskReminders from '../../components/tasks/TaskReminders.jsx'
import './task-detail.scss'

/* === helpers normalization === */
const mapResp = (arr = []) => arr.map(r => r?.feder ? ({ ...r.feder, es_lider: !!r.es_lider, avatar_url: r.feder.avatar_url || null }) : r)
const mapCol = (arr = []) => arr.map(c => c?.feder ? ({ ...c.feder, rol: c.rol ?? null, avatar_url: c.feder.avatar_url || null }) : c)

/* === helpers fecha === */
const toInputDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
const fromInputDate = (val) => {
  if (!val) return null
  const [y, m, d] = val.split('-').map(Number)
  // Usar UTC 23:59:59 para ser consistente con el storage y evitar problemas de TZ
  const dt = new Date(Date.UTC(y, m - 1, d, 23, 59, 59))
  return dt.toISOString()
}

// Helper para obtener URL del archivo (usa proxy si es Drive)
const getFileUrl = (file) => {
  if (!file) return null
  // Si tiene drive_file_id, usar el proxy
  if (file.drive_file_id) {
    return `/api/tareas/drive/image/${file.drive_file_id}`
  }
  // Si tiene drive_url, intentar extraer fileId
  if (file.drive_url && file.drive_url.includes('drive.google.com')) {
    const match = file.drive_url.match(/\/file\/d\/([^\/]+)/)
    if (match && match[1]) {
      return `/api/tareas/drive/image/${match[1]}`
    }
  }
  // Fallback a url o drive_url
  return file.url || file.drive_url || null
}

// Helper para detectar el tipo de archivo
const getFileType = (file) => {
  if (!file) return 'other';
  const mime = (file.mime || file.mimeType || '').toLowerCase();
  const name = (file.nombre || file.name || file.originalname || '').toLowerCase();

  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/') || name.match(/\.(mp4|webm|mov|avi)$/)) return 'video';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (name.match(/\.(doc|docx)$/) || mime.includes('word')) return 'word';
  if (name.match(/\.(xls|xlsx)$/) || mime.includes('excel') || mime.includes('spreadsheet')) return 'excel';
  if (name.match(/\.(zip|rar|7z|tar|gz)$/) || mime.includes('zip') || mime.includes('compressed')) return 'zip';
  if (name.match(/\.(html|htm)$/) || mime === 'text/html') return 'html';

  const url = (file.url || file.drive_url || '').toLowerCase();
  if (url.includes('/drive/folders/') || mime?.includes('folder')) return 'folder';

  return 'other';
};

// Límite de tamaño de archivo (50GB - se suben a Google Drive)
const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024

// Formatear tamaño de archivo
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

import { useLoading } from '../../context/LoadingContext.jsx'

export default function TaskDetail({ taskId, onUpdated, onClose, initialCommentId = null }) {
  const { id: urlId } = useParams()
  const navigate = useNavigate()
  const modal = useModal()
  const toast = useToast()
  const { showLoader, hideLoader } = useLoading()

  // Use taskId prop if provided, otherwise use id from URL params
  const id = taskId || urlId

  const [task, setTask] = useState(null)
  const [catalog, setCatalog] = useState(null)

  const isInitialLoading = !task || !catalog;
  const [form, setForm] = useState({ titulo: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [peopleForm, setPeopleForm] = useState({
    responsables: [],
    colaboradores: []
  });
  const [showCommentsPopup, setShowCommentsPopup] = useState(!!initialCommentId)
  const [showFamilyModal, setShowFamilyModal] = useState(false)
  const [createSubtaskParentId, setCreateSubtaskParentId] = useState(null)
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const familyDropdownRef = useRef(null)

  const [isResponsible, setIsResponsible] = useState(false)
  const [isCollaborator, setIsCollaborator] = useState(false)

  // Ref to prevent race conditions on saves
  const saveInProgressRef = useRef(false)
  const saveTimeoutRef = useRef(null)

  const { user, roles } = useAuthCtx() || {}

  // Verificar si es NivelB o NivelA (directivos)
  // roles es un array de strings: ['NivelB', 'OtroRol']
  const isNivelB = roles?.includes('NivelB') || false
  const isNivelA = roles?.includes('NivelA') || false
  const isDirectivo = isNivelA || isNivelB

  const { adjuntos, loading, add, remove, upload } = useTaskAttachments(id)
  const uploadContext = useUploadContext()

  const [isOver, setIsOver] = useState(false)
  const [rawUploading, setRawUploading] = useState(false)
  const [rawFullscreen, setRawFullscreen] = useState(null) // { url, name, isVideo }
  const [rawUploadError, setRawUploadError] = useState(null)

  // Uploads activos para contenido crudo (esEmbebido = false)
  const rawActiveUploads = (uploadContext?.uploads || []).filter(
    u => u.taskId == id && u.esEmbebido === false && (u.status === 'uploading' || u.status === 'processing')
  )
  const hasRawActiveUploads = rawActiveUploads.length > 0

  const handlePeopleChange = async ({ responsables, colaboradores }) => {
    if (!task) return;

    // Mapear solo IDs
    const prevRespIds = (task.responsables || task.Responsables || []).map(p => p.id ?? p.feder_id);
    const newRespIds = responsables.map(p => p.id ?? p.feder_id);

    const prevColIds = (task.colaboradores || task.Colaboradores || []).map(p => p.id ?? p.feder_id);
    const newColIds = colaboradores.map(p => p.id ?? p.feder_id);

    // Actualización optimista SOLO en peopleForm (evita parpadeo del header)
    setPeopleForm({ responsables, colaboradores });

    try {
      // Responsables
      for (const rId of newRespIds) {
        if (!prevRespIds.includes(rId)) {
          await tareasApi.addResp(taskId, rId);
        }
      }
      for (const rId of prevRespIds) {
        if (!newRespIds.includes(rId)) {
          await tareasApi.delResp(taskId, rId);
        }
      }

      // Colaboradores
      for (const cId of newColIds) {
        if (!prevColIds.includes(cId)) {
          await tareasApi.addColab(taskId, cId);
        }
      }
      for (const cId of prevColIds) {
        if (!newColIds.includes(cId)) {
          await tareasApi.delColab(taskId, cId);
        }
      }

      setHistoryRefresh(prev => prev + 1);
      onUpdated?.();
      toast?.success("Participantes Actualizados");
    } catch (e) {
      // Si falla, revertir a los valores originales de task
      const revertResp = (task.responsables || task.Responsables || []).map(p => ({
        ...p,
        id: p.id || p.feder_id,
        feder_id: p.feder_id || p.id
      }));
      const revertCol = (task.colaboradores || task.Colaboradores || []).map(p => ({
        ...p,
        id: p.id || p.feder_id,
        feder_id: p.feder_id || p.id
      }));
      setPeopleForm({ responsables: revertResp, colaboradores: revertCol });
      toast?.error(e?.message || "No se pudieron actualizar los participantes");
    }
  };




  // Inicializar al cargar tarea
  useEffect(() => {
    if (!task) return
    setPeopleForm({
      responsables: mapResp(task?.Responsables || task?.responsables || []),
      colaboradores: mapCol(task?.Colaboradores || task?.colaboradores || [])
    })
  }, [task])

  // Recalcular isResponsible e isCollaborator basado en peopleForm
  useEffect(() => {
    if (!user?.id) return

    const currentResponsables = peopleForm.responsables || []
    const currentColaboradores = peopleForm.colaboradores || []

    const myIds = [user.id ? String(user.id) : null, user.feder_id ? String(user.feder_id) : null].filter(Boolean);

    const isResp = currentResponsables.some(r => {
      const rIds = [r.id ? String(r.id) : null, r.feder_id ? String(r.feder_id) : null].filter(Boolean);
      return rIds.some(rid => myIds.includes(rid));
    })

    const isColab = currentColaboradores.some(c => {
      const cIds = [c.id ? String(c.id) : null, c.feder_id ? String(c.feder_id) : null].filter(Boolean);
      return cIds.some(cid => myIds.includes(cid));
    })

    setIsResponsible(isResp)
    setIsCollaborator(isColab)
  }, [peopleForm.responsables, peopleForm.colaboradores, user?.id, user?.feder_id])


  // contentEditable
  const titleCE = useContentEditable({
    value: form.titulo,
    onChange: (v) => setForm(f => (f.titulo === v ? f : { ...f, titulo: v }))
  })
  const descCE = useContentEditable({
    value: form.descripcion,
    onChange: (v) => setForm(f => (f.descripcion === v ? f : { ...f, descripcion: v }))
  })


  const reload = useCallback(async () => {
    const fetchId = id || taskId;
    if (!fetchId) return;

    const [t, cat] = await Promise.all([
      tareasApi.get(fetchId).then(taskData => {
        if (taskData.estado_nombre === 'Revisión') taskData.estado_nombre = 'En Revisión';
        if (taskData.estado?.nombre === 'Revisión') taskData.estado.nombre = 'En Revisión';
        return taskData;
      }),

      tareasApi.catalog().then(c => {
        if (c.estados) {
          c.estados = c.estados.map(s => s.nombre === 'Revisión' ? { ...s, nombre: 'En Revisión' } : s);
        }
        return c;
      }).catch((err) => {
        console.error('ERROR LOADING CATALOG:', err)
        return {}
      })

    ])

    setTask(t)
    setHistoryRefresh(prev => prev + 1) // Trigger history refresh
    setCatalog(cat || {})
    setForm({ titulo: t?.titulo || '', descripcion: t?.descripcion || '' })
    document.title = `${t?.titulo || 'Tarea'}`
  }, [id, taskId])

  useEffect(() => { reload() }, [reload])

  // Escuchar actualizaciones globales (Sincronización)
  useEffect(() => {
    const handleGlobalUpdate = (e) => {
      const currentId = id || taskId;
      if (e.detail?.taskId == currentId) {
        console.log('[TaskDetail] Global update detected, reloading...');
        reload();
      }
    };
    window.addEventListener('task-updated', handleGlobalUpdate);
    return () => window.removeEventListener('task-updated', handleGlobalUpdate);
  }, [id, taskId, reload]);


  const dirty = useMemo(() => {
    if (!task) return false
    const t = (form.titulo ?? '').trim()
    const d = (form.descripcion ?? '')
    return t !== (task.titulo ?? '').trim() || d !== (task.descripcion ?? '')
  }, [form, task])

  // Separate function to save with race condition protection
  const performSave = useCallback(async (patch, source = 'auto') => {
    if (saveInProgressRef.current) {
      console.log('[TaskDetail] Save already in progress, skipping')
      return
    }

    if (!Object.keys(patch).length) return

    console.log('[TaskDetail] Guardando cambios:', { taskId, patch })

    try {
      saveInProgressRef.current = true
      setSaving(true)
      const next = await tareasApi.update(taskId, patch)
      console.log('[TaskDetail] Guardado exitoso:', next)
      setTask(next)
      setHistoryRefresh(prev => prev + 1)
      onUpdated?.()
      setForm({ titulo: next?.titulo || '', descripcion: next?.descripcion || '' })
      toast?.success(source === 'auto' ? 'Cambios guardados' : 'Guardado')
    } catch (e) {
      console.error('[TaskDetail] Error al guardar:', e)
      toast?.error(e?.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
      saveInProgressRef.current = false
    }
  }, [taskId, toast])

  // Auto-save ONLY for title changes (debounced)
  useEffect(() => {
    if (!task) return

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    const currTitulo = (form.titulo ?? '').trim()
    const taskTitulo = (task.titulo ?? '').trim()

    // Only save if title changed
    if (currTitulo !== taskTitulo && currTitulo.length > 0) {
      saveTimeoutRef.current = setTimeout(() => {
        performSave({ titulo: currTitulo }, 'auto')
      }, 800)
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [form.titulo, task, performSave])

  // Save description ONLY on blur
  const flushDescriptionOnBlur = useCallback(() => {
    if (!task || saveInProgressRef.current) return

    const currDesc = (form.descripcion ?? '')
    const taskDesc = (task.descripcion ?? '')

    if (currDesc !== taskDesc) {
      performSave({ descripcion: currDesc }, 'blur')
    }
  }, [form.descripcion, task, performSave])

  // Keep refs updated for unmount cleanup
  const formRef = useRef(form)
  const taskRef = useRef(task)
  useEffect(() => { formRef.current = form }, [form])
  useEffect(() => { taskRef.current = task }, [task])

  // Save on unmount (when modal closes)
  useEffect(() => {
    return () => {
      const currDesc = (formRef.current?.descripcion ?? '')
      const savedDesc = (taskRef.current?.descripcion ?? '')
      if (currDesc !== savedDesc && taskRef.current && !saveInProgressRef.current) {
        console.log('[TaskDetail] Saving on unmount')
        // Get CSRF token from cookie
        const csrfCookie = document.cookie.split('; ').find(c => c.startsWith('fh_csrf='))
        const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.split('=')[1]) : ''

        // Use fetch with keepalive for reliable save on unmount
        fetch(`/api/tareas/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
            'X-CSRF': csrfToken
          },
          body: JSON.stringify({ descripcion: currDesc }),
          credentials: 'include',
          keepalive: true
        }).catch(() => { })
      }
    }
  }, [taskId])

  // Save title on blur (immediate, cancel debounce)
  const flushTitleOnBlur = useCallback(() => {
    if (!task || saveInProgressRef.current) return

    // Cancel pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    const currTitulo = (form.titulo ?? '').trim()
    const taskTitulo = (task.titulo ?? '').trim()

    if (currTitulo !== taskTitulo && currTitulo.length > 0) {
      performSave({ titulo: currTitulo }, 'blur')
    }
  }, [form.titulo, task, performSave])

  // beforeunload - attempt to save and warn user
  useEffect(() => {
    const saveBeforeLeave = () => {
      if (!task || saveInProgressRef.current) return
      const currDesc = (form.descripcion ?? '')
      const taskDesc = (task.descripcion ?? '')
      if (currDesc !== taskDesc) {
        // Get CSRF token from cookie
        const csrfCookie = document.cookie.split('; ').find(c => c.startsWith('fh_csrf='))
        const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.split('=')[1]) : ''

        fetch(`/api/tareas/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
            'X-CSRF': csrfToken
          },
          body: JSON.stringify({ descripcion: currDesc }),
          credentials: 'include',
          keepalive: true
        }).catch(() => { })
      }
    }

    const onBeforeUnload = (e) => {
      if (dirty) {
        saveBeforeLeave()
        e.preventDefault()
        e.returnValue = ''
      }
    }

    // Also save when tab loses visibility (user switches tabs)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && dirty) {
        flushDescriptionOnBlur()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [dirty, form.descripcion, task, taskId, flushDescriptionOnBlur])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (familyDropdownRef.current && !familyDropdownRef.current.contains(e.target)) {
        setShowFamilyDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBack = async () => {
    if (dirty) {
      const ok = await modal.confirm({
        title: 'Cambios sin guardar',
        message: 'Tenés cambios sin guardar. ¿Salir igualmente?',
        okText: 'Salir sin guardar',
        cancelText: 'Volver'
      })
      if (!ok) return
    }
    navigate(-1)
  }

  // estado
  const handleEstado = async (estado_id) => {
    // Buscar si el estado es "cancelada"
    const targetState = catalog?.estados?.find(s => s.id === estado_id);
    const isCancelada = targetState?.codigo === 'cancelada';

    let cancelacion_motivo = null;
    if (isCancelada) {
      const resp = await modal.prompt({
        title: 'Cancelar tarea',
        message: '¿Por qué se cancela esta tarea?',
        placeholder: 'Ej: El cliente decidió no avanzar...',
        okText: 'Confirmar cancelación',
        cancelText: 'Volver',
        multiline: true
      });
      // Si el usuario cancela el prompt (le da a "Volver" o cierra el modal), resp es undefined/null
      // Pero si simplemente lo deja vacío y le da a OK, resp es ""
      if (resp === undefined) return;
      cancelacion_motivo = resp || null;
    }

    const next = await tareasApi.setEstado(taskId, estado_id, cancelacion_motivo)
    if (next.estado_nombre === 'Revisión') next.estado_nombre = 'En Revisión';
    if (next.estado?.nombre === 'Revisión') next.estado.nombre = 'En Revisión';
    setTask(next)
    setHistoryRefresh(prev => prev + 1) // Trigger history refresh
    onUpdated?.()
  }

  // Eliminar tarea (solo directivos)
  const handleDelete = async () => {
    const ok = await modal.confirm({
      title: 'Eliminar tarea',
      message: `¿Estás seguro de que querés eliminar "${task?.titulo}"? Esta acción no se puede deshacer.`,
      okText: 'Eliminar',
      cancelText: 'Cancelar'
    })
    if (!ok) return

    try {
      await tareasApi.delete(taskId)
      toast?.success('Tarea eliminada')
      onUpdated?.()
      if (onClose) {
        onClose()
      } else {
        navigate('/tareas')
      }
    } catch (err) {
      toast?.error(err?.fh?.message || 'No se pudo eliminar la tarea')
    }
  }

  // === Agregar link manualmente (especialmente para carpetas de Drive) ===
  const handleAddLink = useCallback(async (esEmbebido = false) => {
    const url = await modal.prompt({
      title: 'Agregar link de Google Drive',
      message: 'Pegá el link de la carpeta o archivo de Drive:',
      placeholder: 'https://drive.google.com/...',
      okText: 'Siguiente',
      cancelText: 'Cancelar'
    });

    if (!url || !url.trim()) return;

    const nombre = await modal.prompt({
      title: 'Nombre del recurso',
      message: 'Ingresá un nombre para identificar este link:',
      placeholder: 'Ej: Carpeta de insumos',
      okText: 'Agregar',
      cancelText: 'Cancelar'
    });

    if (nombre === undefined) return;

    const finalNombre = nombre?.trim() || 'Link de Drive';

    try {
      const isFolder = url.includes('/drive/folders/') || url.includes('drive.google.com/drive/u/');
      await add({
        nombre: finalNombre,
        drive_url: url.trim(),
        mime: isFolder ? 'application/vnd.google-apps.folder' : 'text/html',
        es_embebido: esEmbebido
      });
      toast?.success('Link agregado');
      setHistoryRefresh(prev => prev + 1);
    } catch (err) {
      console.error('Error adding link:', err);
      toast?.error('No se pudo agregar el link');
    }
  }, [modal, add, toast]);

  if (isInitialLoading) {
    return (
      <div className="taskDetail">
        <GlobalLoader isLoading={true} size={120} />
      </div>
    )
  }

  // normalización
  const estadoCodigo = task?.estado?.codigo || task?.estado_codigo || 'pendiente'
  const aprobLabel = task?.aprobacionEstado?.nombre || task?.aprobacion_estado_nombre || null
  const etiquetas = task?.etiquetas || []

  // Detectar si es tarea de Lead o Cliente
  const isLeadTask = !!task?.lead_id
  const clienteNombre = isLeadTask
    ? `Lead: ${task?.lead_empresa || task?.lead_nombre || 'Vinculado'}`
    : (task?.cliente?.nombre || task?.cliente_nombre || '—')
  const hitoNombre = task?.hito?.nombre || task?.hito_nombre || null
  const vencimientoISO = task?.vencimiento || null
  const progreso = Number(task?.progreso_pct) || 0
  const prioridad = task?.prioridad_num
  const boostManual = task?.boost_manual || 0
  const clienteColor = isLeadTask ? '#ffab00' : (task?.cliente?.color || task?.cliente_color || null)

  const responsables = mapResp(task?.Responsables || task?.responsables || [])
  const colaboradores = mapCol(task?.Colaboradores || task?.colaboradores || [])

  const isFavorita = !!(task.is_favorita || task.favorita)

  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString() } catch { return '' } }
  const fmtDateTime = (d) => {
    if (!d) return ''
    try {
      const date = new Date(d)
      return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  // === vencimiento en línea (con aprobación si aplica) ===
  const handleDueChange = async (inputValue) => {
    const iso = fromInputDate(inputValue)  // puede ser null
    try {
      const next = await tareasApi.update(taskId, { vencimiento: iso })
      setTask(next)
      setHistoryRefresh(prev => prev + 1)
      onUpdated?.()
      toast?.success('Vencimiento actualizado')
    } catch (e1) {
      try {
        await tareasApi.setAprobacion(taskId, { tipo: 'vencimiento', vencimiento: iso })
        const next = await tareasApi.get(taskId)
        setTask(next)
        setHistoryRefresh(prev => prev + 1)
        toast?.success('Solicitud de cambio enviada para aprobación')
      } catch (e2) {
        toast?.error(e2?.message || e1?.message || 'No se pudo actualizar el vencimiento')
      }
    }
  }


  // === cliente en línea (sin aprobación porque el backend no lo soporta) ===
  const handleClientChange = async (nextClienteId) => {
    const currentId = task?.cliente?.id ?? task?.cliente_id ?? null
    const hasValue = nextClienteId !== undefined && nextClienteId !== null && String(nextClienteId) !== ''
    const cid = hasValue ? Number(nextClienteId) : null

    // si eligieron vacío, no mandamos nada (el backend no acepta null)
    if (cid === null) {
      toast?.error('No se puede dejar la tarea sin cliente.')
      return
    }

    // si no cambió, nada que hacer
    if (currentId === cid) return

    try {
      const next = await tareasApi.update(taskId, { cliente_id: cid })
      setTask(next)
      setHistoryRefresh(prev => prev + 1)
      onUpdated?.()
      toast?.success('Cliente actualizado')
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'No se pudo actualizar el cliente'
      toast?.error(msg)
    }
  }

  const handleBoostChange = async (enabled) => {
    try {
      const next = await tareasApi.setBoost(taskId, enabled);
      setTask(next);
      setHistoryRefresh(prev => prev + 1);
      onUpdated?.();
      toast?.success(enabled ? 'Prioridad aumentada' : 'Prioridad normal');
    } catch (e) {
      toast?.error(e?.message || 'No se pudo cambiar la prioridad');
    }
  }


  return (
    <div className="taskDetail">
      {/* === Estados + Volver === */}



      <div className="taskHeader">

        <div className="titleWrap">
          {/* Título con truncamiento visual */}
          <div className="titleSection" title={form.titulo} style={{ position: 'relative', paddingTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
            <div style={{ position: 'absolute', top: 0, left: 0 }}>
              <InlineType
                value={task?.tipo || 'STD'}
                onChange={(next) => performSave({ tipo: next }, 'manual')}
                disabled={!isResponsible && !isDirectivo}
                isResponsible={isResponsible}
                isDirectivo={isDirectivo}
                user={user}
                peopleForm={peopleForm}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <div
                className="ttl editable"
                data-placeholder="Escribí un título…"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                role="textbox"
                aria-label="Título de la tarea"
                ref={titleCE.ref}
                onInput={(e) => {
                  const text = e.currentTarget.textContent || '';

                  // Limitar a 50 caracteres
                  if (text.length > 50) {
                    e.currentTarget.textContent = text.substring(0, 50);
                    // Mover cursor al final
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(e.currentTarget);
                    range.collapse(false);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                    return;
                  }

                  titleCE.handleInput(e);
                }}
                onBlur={(e) => {
                  const text = e.currentTarget.textContent?.trim() || '';
                  if (!text) {
                    // Evitar título vacío
                    e.currentTarget.textContent = task?.titulo || 'Sin título';
                    setForm(f => ({ ...f, titulo: task?.titulo || 'Sin título' }));
                    toast?.error('El título no puede estar vacío');
                    return;
                  }
                  flushTitleOnBlur();
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
                onPaste={(e) => {
                  e.preventDefault()
                  const txt = (e.clipboardData?.getData('text/plain') ?? '').replace(/\n/g, ' ')
                  // Limitar a 50 caracteres al pegar
                  const limited = txt.substring(0, 50);
                  document.execCommand?.('insertText', false, limited)
                }}
              />
              <TitleTooltip />
            </div>
          </div>

          {/* Meta info - ahora puede hacer wrap */}
          <div className="meta">
            <span className="inlineDue">
              <InlineDue
                value={toInputDate(vencimientoISO)}
                onChange={handleDueChange}
                disabled={(!isResponsible && !isDirectivo) || !!task?.datos_tc?.inamovible}
                inamovible={!!task?.datos_tc?.inamovible}
              />
            </span>

            <TaskStatusCard
              estadoCodigo={estadoCodigo}
              progresoPct={progreso}
              aprobLabel={aprobLabel}
              prioridad={prioridad}
              boostManual={boostManual}
              vencimientoISO={vencimientoISO}
              etiquetas={etiquetas}
              estadosCatalog={catalog?.estados || catalog?.tareaEstados || []}
              onPick={handleEstado}
              isResponsible={isResponsible}
              isCollaborator={isCollaborator}
              isNivelB={isDirectivo}
            />

            <span className="inlineClient">

              <InlineClient
                valueId={task?.cliente?.id || task?.cliente_id || null}
                valueName={clienteNombre}
                valueColor={clienteColor}
                options={catalog?.clientes || catalog?.clients || []}
                onChange={handleClientChange}
                disabled={isLeadTask || (!isResponsible && !isNivelB)}
              />
            </span>

            <TaskReminders taskId={taskId} />

            <button
              className={`favBtn ${isFavorita ? 'active' : ''}`}
              onClick={async () => {
                const t = await tareasApi.toggleFavorito(taskId, !isFavorita);
                setTask(t);
                setHistoryRefresh(prev => prev + 1);
                toast?.success(isFavorita ? 'Quitado de favoritos' : 'Agregado a favoritos');
              }}
              title={isFavorita ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <FaStar />
            </button>

            {/* Botón eliminar - solo para directivos */}
            {isDirectivo && (
              <button
                className="deleteBtn"
                onClick={handleDelete}
                title="Eliminar tarea"
              >
                <FaTrash />
              </button>
            )}

            {hitoNombre && <span><b>Hito</b> {hitoNombre}</span>}



          </div>
        </div>


      </div >

      <div className="grid">
        {/* LEFT */}
        <div className="left">
          <div className="card" style={{ minHeight: '300px' }}>
            <div className="cardHeader">
              <h3 style={{ fontSize: '1rem', color: '#fff', margin: 0 }}>Descripción</h3>

              {/* Mostrar tarea padre si existe */}
              {task?.tarea_padre_id && (
                <div className="parent-task-banner" onClick={() => navigate(`/tareas/${task.tarea_padre_id}`)} title="Ir a tarea padre">
                  <FiGitBranch />
                  <span className="banner-link">
                    Tarea Padre: {task.tarea_padre_titulo || `#${task.tarea_padre_id}`}
                  </span>
                </div>
              )}

              {/* Botón de familia de tareas con dropdown - Movido desde el header */}
              <div className="family-dropdown-wrapper" ref={familyDropdownRef}>
                {task?.children?.length > 0 && (() => {
                  const nonCanceled = task.children.filter(c => (c.estado_codigo || c.estado?.codigo) !== 'cancelada');
                  const approved = task.children.filter(c => (c.estado_codigo || c.estado?.codigo) === 'aprobada');
                  const text = `${approved.length}/${nonCanceled.length}`;

                  const sApp = approved.length === 1 ? 'subtarea aprobada' : 'subtareas aprobadas';
                  const sTot = nonCanceled.length === 1 ? 'total' : 'totales';
                  const tip = `${approved.length} ${sApp} de ${nonCanceled.length} ${sTot}`;

                  return nonCanceled.length > 0 && (
                    <span
                      className="subtasks-progress"
                      title={tip}
                      aria-label={tip}
                    >
                      {text}
                    </span>
                  );
                })()}
                <button
                  className="familyBtn"
                  onClick={() => setShowFamilyDropdown(!showFamilyDropdown)}
                  title="Opciones de familia"
                >
                  <FiGitBranch />
                </button>

                {showFamilyDropdown && (
                  <div className="family-dropdown">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setCreateSubtaskParentId(id)
                        setShowFamilyDropdown(false)
                      }}
                    >
                      <FiPlus /> Crear Subtarea
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowFamilyModal(true)
                        setShowFamilyDropdown(false)
                      }}
                    >
                      <FiEye /> Ver Familia
                    </button>
                  </div>
                )}
              </div>
            </div>


            {estadoCodigo === 'cancelada' && task?.cancelacion_motivo && (
              <div className="cancelReasonBanner">
                <div className="bannerLabel">Motivo de cancelación:</div>
                <div className="bannerText">{task.cancelacion_motivo}</div>
              </div>
            )}

            {/* Descripción con editor de texto enriquecido */}
            <RichTextEditor
              value={form.descripcion}
              onChange={(content) => setForm(f => ({ ...f, descripcion: content }))}
              onBlur={flushDescriptionOnBlur}
              taskId={Number(id)}
              placeholder="Escribí la descripción…"
              ErrorBoundary={LexicalErrorBoundary}
              maxLength={3600}
              minHeight="190px"
            />
          </div>

          {/* Metadata de TC (si aplica) */}
          {task?.tipo === 'TC' && task?.datos_tc && (
            <div className="card" style={{ marginTop: '1rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1rem', color: '#fff', margin: 0 }}>Detalles de Publicación</h3>
                  <span className="fh-chip primary" style={{ fontSize: '0.65rem', padding: '1px 8px' }}>TC</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: (!!task.datos_tc.inamovible || (!isResponsible && !isDirectivo)) ? 'default' : 'pointer', fontSize: '0.85rem', color: '#fff', opacity: (!!task.datos_tc.inamovible || (!isResponsible && !isDirectivo)) ? 0.7 : 1 }}>
                    <input
                      type="checkbox"
                      checked={!!task.datos_tc.inamovible}
                      disabled={!!task.datos_tc.inamovible || (!isResponsible && !isDirectivo)}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        if (val) {
                          const ok = await modal.confirm({
                            title: 'Marcar como inamovible',
                            message: '⚠️ Atención: Una vez marcada como inamovible, no podrás desmarcarla posteriormente ni cambiar la fecha de publicación. ¿Estás seguro?',
                            okText: 'Sí, marcar como inamovible',
                            cancelText: 'Cancelar'
                          });
                          if (!ok) return;
                          performSave({ tc: { inamovible: true } }, 'manual');
                        }
                      }}
                    />
                    <FiLock size={14} /> Inamovible
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#fff' }}>
                    <input
                      type="checkbox"
                      checked={task.datos_tc.estado_publicacion_id === 2}
                      onChange={(e) => performSave({ tc: { estado_publicacion_id: e.target.checked ? 2 : 1 } }, 'manual')}
                    />
                    <FiCheckCircle size={14} /> Publicado
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#fff' }}>
                    <input
                      type="checkbox"
                      checked={task.datos_tc.estado_publicacion_id === 3}
                      onChange={(e) => performSave({ tc: { estado_publicacion_id: e.target.checked ? 3 : 1 } }, 'manual')}
                    />
                    <FiClock size={14} /> Postergado
                  </label>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.6rem' }}>Redes Sociales</h4>
                  <InlineTCMultiSelect
                    values={task.datos_tc.redes || []}
                    options={catalog?.tc_redes || []}
                    onChange={(ids) => performSave({ tc: { red_social_ids: ids } }, 'manual')}
                  />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.6rem' }}>Formatos</h4>
                  <InlineTCMultiSelect
                    values={task.datos_tc.formatos || []}
                    options={catalog?.tc_formatos || []}
                    onChange={(ids) => performSave({ tc: { formato_ids: ids } }, 'manual')}
                  />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.6rem' }}>Objetivo Negocio</h4>
                  <InlineTCSelect
                    valueId={task.datos_tc.objetivo_negocio_id}
                    options={catalog?.tc_obj_negocio || []}
                    placeholder="Sin objetivo"
                    onChange={(id) => performSave({ tc: { objetivo_negocio_id: id } }, 'manual')}
                  />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.6rem' }}>Objetivo Marketing</h4>
                  <InlineTCSelect
                    valueId={task.datos_tc.objetivo_marketing_id}
                    options={catalog?.tc_obj_marketing || []}
                    placeholder="Sin objetivo"
                    onChange={(id) => performSave({ tc: { objetivo_marketing_id: id } }, 'manual')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contenido Crudo - Material en bruto */}
          <div className={`content-section raw-content ${(rawUploading || hasRawActiveUploads) ? 'uploading' : ''}`}>
            <div className="section-header">
              <h3>Contenido Crudo</h3>
              <span className="hint">Material en bruto para editar</span>
            </div>

            {/* Error message */}
            {rawUploadError && (
              <div className="upload-error">
                <span>{rawUploadError}</span>
                <button onClick={() => setRawUploadError(null)}>✕</button>
              </div>
            )}

            {/* Loading overlay with progress */}
            {(rawUploading || hasRawActiveUploads) && (
              <div className="upload-overlay">
                {rawActiveUploads.length > 0 ? (
                  <div className="upload-progress-list">
                    {rawActiveUploads.map(u => (
                      <div key={u.id} className="upload-progress-item">
                        <div className="upload-info">
                          <span className="file-name">{u.fileName}</span>
                          <span className="progress-text">
                            {u.status === 'processing' ? 'Procesando...' : `${u.progress}%`}
                          </span>
                        </div>
                        <div className="progress-bar-container">
                          <div
                            className={`progress-bar ${u.status === 'processing' ? 'processing' : ''}`}
                            style={{ width: `${u.progress}%` }}
                          />
                          {u.status === 'uploading' && (
                            <button
                              className="cancel-btn"
                              onClick={() => uploadContext?.cancelUpload(u.id)}
                              title="Cancelar subida"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <p className="hint">Archivos grandes pueden tardar varios minutos</p>
                  </div>
                ) : (
                  <>
                    <div className="spinner"></div>
                    <p>Subiendo archivo...</p>
                    <p className="hint">Archivos grandes pueden tardar varios minutos</p>
                  </>
                )}
              </div>
            )}

            <div
              className={`raw-dropzone ${isOver ? 'is-over' : ''}`}
              onDrop={async (e) => {
                e.preventDefault();
                setIsOver(false);
                setRawUploadError(null);
                if (rawUploading) return;

                const filesArray = Array.from(e.dataTransfer?.files || []);
                if (!filesArray.length) return;

                // Validate file sizes
                const tooBig = filesArray.filter(f => f.size > MAX_FILE_SIZE);
                if (tooBig.length > 0) {
                  setRawUploadError(`Archivos muy grandes (máx ${formatFileSize(MAX_FILE_SIZE)}): ${tooBig.map(f => f.name).join(', ')}`);
                  return;
                }

                setRawUploading(true);
                try {
                  await upload(filesArray, false);
                } catch (err) {
                  setRawUploadError(err.message || 'Error al subir archivo');
                } finally {
                  setRawUploading(false);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!rawUploading) setIsOver(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false);
              }}
            >
              <input
                type="file"
                id="raw-content-input"
                multiple
                style={{ display: 'none' }}
                disabled={rawUploading}
                onChange={async (e) => {
                  setRawUploadError(null);
                  const filesArray = Array.from(e.target.files || []);
                  if (!filesArray.length) return;

                  // Validate file sizes
                  const tooBig = filesArray.filter(f => f.size > MAX_FILE_SIZE);
                  if (tooBig.length > 0) {
                    setRawUploadError(`Archivos muy grandes (máx ${formatFileSize(MAX_FILE_SIZE)}): ${tooBig.map(f => f.name).join(', ')}`);
                    e.target.value = '';
                    return;
                  }

                  setRawUploading(true);
                  try {
                    await upload(filesArray, false);
                  } catch (err) {
                    setRawUploadError(err.message || 'Error al subir archivo');
                  } finally {
                    setRawUploading(false);
                  }
                  e.target.value = '';
                }}
              />
              <p>Arrastra archivos o <label htmlFor="raw-content-input" className="file-select">selecciona</label></p>
              <button
                className="add-link-btn-inline"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddLink(false);
                }}
                title="Agregar link (Drive/Carpeta)"
              >
                <MdLink size={20} /> Agregar link
              </button>
            </div>

            {/* Lista de archivos crudos */}
            {adjuntos.filter(a => !a.es_embebido && !a.comentario_id).length > 0 && (
              <div className="raw-files-list">
                {adjuntos.filter(a => !a.es_embebido && !a.comentario_id).map(file => {
                  const type = getFileType(file);
                  const Icon = type === 'pdf' ? FaFilePdf :
                    type === 'word' ? FaFileWord :
                      type === 'excel' ? FaFileExcel :
                        type === 'zip' ? FaFileArchive :
                          type === 'html' ? FaFileCode :
                            type === 'folder' ? FaFolder :
                              type === 'video' ? FiEye : FaFileAlt;

                  const iconColor = type === 'pdf' ? '#ff3d00' :
                    type === 'word' ? '#2b579a' :
                      type === 'excel' ? '#217346' :
                        type === 'zip' ? '#fb8c00' :
                          type === 'html' ? '#e44d26' :
                            type === 'folder' ? '#FFD700' : '#94a3b8';

                  return (
                    <div key={file.id} className="raw-file-item">
                      <div className="file-info-icon">
                        <Icon style={{ color: iconColor }} />
                        {(type === 'folder' || (!!file.drive_url && type !== 'image' && type !== 'video')) ? (
                          <a
                            href={file.drive_url || getFileUrl(file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-name link-styled"
                          >
                            {file.nombre || 'Archivo'}
                          </a>
                        ) : (
                          <span className="file-name">{file.nombre || 'Archivo'}</span>
                        )}
                      </div>
                      <div className="file-actions">
                        <button
                          className="view-btn"
                          onClick={() => {
                            const isDrive = !!file.drive_url;
                            const isImageOrVideo = type === 'image' || type === 'video';

                            // Si es un link de Drive o carpeta, o un archivo que no es imagen/video y tiene URL externa, abrir en nueva pestaña
                            if (type === 'folder' || (isDrive && !isImageOrVideo)) {
                              window.open(file.drive_url || getFileUrl(file), '_blank');
                            } else {
                              // Solo abrir en fullscreen si es imagen/video o PDF/HTML (que tienen preview)
                              // Para el resto (word, excel, etc), si tienen driveId se ven por iframe en Fullscreen
                              setRawFullscreen({
                                url: getFileUrl(file),
                                name: file.nombre || 'Archivo',
                                type: type,
                                driveId: file.drive_file_id
                              });
                            }
                          }}
                        >
                          {(type === 'folder' || (!!file.drive_url && type !== 'image' && type !== 'video')) ? 'Abrir' : 'Ver'}
                        </button>
                        <button className="remove-btn" onClick={() => remove(file.id)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fullscreen modal for raw content */}
          {rawFullscreen && (
            <ImageFullscreen
              src={rawFullscreen.url}
              alt={rawFullscreen.name}
              type={rawFullscreen.type}
              driveId={rawFullscreen.driveId}
              onClose={() => setRawFullscreen(null)}
            />
          )}

          <TaskHistory taskId={Number(id)} key={historyRefresh} />


        </div>

        {/* RIGHT - Contenido Listo */}
        <div className="right" style={{ position: 'relative' }}>
          {/* Action buttons - always visible */}
          <div className="gallery-actions">
            <MdAddComment
              size={26}
              className={`action-icon ${showCommentsPopup ? 'active' : ''}`}
              onClick={() => setShowCommentsPopup(v => !v)}
              title="Comentarios"
            />
          </div>

          <ContentGallery
            taskId={taskId}
            esEmbebido={true}
            images={adjuntos.filter(a => a.es_embebido)}
            onUpload={async (files) => {
              try {
                await upload(files, true); // es_embebido = true
              } catch (err) {
                console.error('Error uploading:', err);
              }
            }}
            onRemove={async (imageId) => {
              try {
                await remove(imageId);
              } catch (err) {
                console.error('Error removing:', err);
              }
            }}
            title="Contenido Listo"
            showAddButton={true}
            onAddLink={() => handleAddLink(true)}
          />

          {/* Comments panel (kept mounted to persist draft) */}
          <div className="comments-popup-container"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              zIndex: 50,
              display: showCommentsPopup ? 'block' : 'none',
              pointerEvents: showCommentsPopup ? 'all' : 'none'
            }}
          >
            <TaskComments
              taskId={Number(taskId)}
              catalog={catalog}
              initialCommentId={initialCommentId}
            />
          </div>
        </div>

        {/* <TaskChecklist
            style={{display: 'none'}}
            taskId={Number(taskId)}
            onAfterChange={async () => {
              try {
                const next = await tareasApi.get(taskId)
                setTask(next)
                const estadoCodigo = next?.estado?.codigo || next?.estado_codigo
                const pct = Number(next?.progreso_pct) || 0
                if (pct === 100 && estadoCodigo !== 'finalizada') {
                  const ok = await modal.confirm({
                    title: 'Checklist completo',
                    message: 'El checklist está al 100%. ¿Marcar la tarea como finalizada?',
                    okText: 'Finalizar',
                    cancelText: 'Mantener en curso'
                  })
                  if (ok) {
                    const catEstados = catalog?.estados || catalog?.tareaEstados || []
                    const finalId = catEstados.find(e => e.codigo === 'finalizada')?.id
                    if (finalId) setTask(await tareasApi.setEstado(taskId, finalId))
                  }
                }
              } catch {}
            }}
          /> */}



      </div>
      <div className='people-detail'>
        {/* <button  onClick={()=>setEditPeople(false)}>Ver</button>
          <button  onClick={()=>setEditPeople(true)}>Editar</button> */}

        <AssignedPeople

          responsables={peopleForm.responsables}
          colaboradores={peopleForm.colaboradores}
          candidatesResp={catalog?.feders || []}
          candidatesCol={catalog?.feders || []}
          onChange={handlePeopleChange} // ← esto asegura persistencia

          disabled={!isResponsible && !isNivelB}

        />
        {(isResponsible || isNivelB) && (
          <PriorityBoostCheckbox
            taskId={Number(taskId)}
            enabled={task?.boost_manual > 0}
            onChange={handleBoostChange}
          />
        )}


      </div>

      {/* Modal de creación de subtarea */}
      {
        createSubtaskParentId && (
          <CreateTaskModal
            modalTitle="Nueva Subtarea"
            parentTaskId={Number(createSubtaskParentId)}
            initialData={{
              cliente_id: task?.cliente_id || task?.cliente?.id || null
            }}
            onClose={() => setCreateSubtaskParentId(null)}
            onCreated={(newTask) => {
              setCreateSubtaskParentId(null)
              toast?.success('Subtarea creada')
              // Recargar la tarea actual para actualizar la lista de subtareas
              tareasApi.get(id).then(setTask)
              onUpdated?.()
            }}
          />
        )
      }

      {/* Modal de familia de tareas */}
      {
        showFamilyModal && (
          <TaskFamilyModal
            taskId={Number(id)}
            currentTask={task}
            onClose={() => setShowFamilyModal(false)}
            onNavigate={(newId) => {
              setShowFamilyModal(false)
              navigate(`/tareas/${newId}`)
            }}
            onNewSubtask={(parentId) => {
              setShowFamilyModal(false)
              setCreateSubtaskParentId(parentId || id)
            }}
          />
        )
      }

    </div >
  )
}

/* === componente inline para fecha === */
function InlineDue({ value, onChange, disabled = false, inamovible = false }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value || '')
  const modal = useModal()
  const toast = useToast()

  useEffect(() => { setLocal(value || '') }, [value])

  const handleSave = async () => {
    setEditing(false)

    // Si no cambió, no hacer nada
    if (local === value) return

    // Validar fecha futura
    if (local) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(local + 'T23:59:59') < today) {
        toast?.error('La fecha no puede ser anterior a hoy');
        setLocal(value || '');
        return;
      }
    }

    // Si intenta borrar la fecha, pedir confirmación
    if (!local && value) {
      const ok = await modal.confirm({
        title: 'Quitar fecha de vencimiento',
        message: '¿Estás seguro de que querés quitar la fecha de vencimiento? La tarea quedará sin deadline.',
        okText: 'Quitar fecha',
        cancelText: 'Cancelar'
      })
      if (!ok) {
        setLocal(value) // restaurar
        return
      }
    }

    onChange?.(local)
  }

  if (disabled) {
    return (
      <span className="dueChip disabled" title={inamovible ? "Esta fecha es inamovible por política de TC" : "Solo los responsables pueden cambiar la fecha"}>
        {value ? new Date(value + 'T00:00:00').toLocaleDateString() : 'Sin fecha'}
        {inamovible && <span style={{ marginLeft: '4px' }}>🔒</span>}
      </span>
    )
  }

  if (!editing) {
    return (
      <button className="dueChip" type="button" onClick={() => setEditing(true)} title="Editar fecha de vencimiento">
        {value ? new Date(value + 'T00:00:00').toLocaleDateString() : 'Sin fecha'}
      </button>
    )
  }

  return (
    <div className="dueInputWrap">
      <input
        className="dueInput"
        type="date"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') { setLocal(value || ''); setEditing(false) }
        }}
        autoFocus
      />
    </div>
  )
}

/* === componente inline para cliente === */
function InlineClient({ valueId = null, valueName = '', valueColor = null, options = [], onChange, disabled = false }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(valueId ?? '')
  const selectRef = useRef(null)
  const toast = useToast()

  useEffect(() => { setLocal(valueId ?? '') }, [valueId])

  // Auto-focus y abrir el select cuando entra en modo edición
  useEffect(() => {
    if (editing && selectRef.current) {
      selectRef.current.focus()
      // Abrir el dropdown automáticamente
      selectRef.current.click()
    }
  }, [editing])

  const opts = useMemo(
    () => (options || []).slice().sort((a, b) =>
      String(a?.nombre || '').localeCompare(String(b?.nombre || ''))),
    [options]
  )

  const handleClick = () => {
    if (disabled) {
      toast?.error('Solo el responsable de la tarea puede cambiar el cliente');
      return;
    }
    setEditing(true);
  }

  if (!editing) {
    return (
      <button
        className={`clientChip ${disabled ? 'disabled' : ''}`}
        type="button"
        onClick={handleClick}
        title={disabled ? 'Solo el responsable puede cambiar' : 'Cambiar cliente'}
        style={{
          backgroundColor: valueColor || '#3B82F6'
        }}
      >
        {valueName || 'Sin cliente'}
        {!disabled && <MdKeyboardArrowDown style={{ position: 'relative', top: '2px' }} />}
        {disabled && <span className="lock-icon">🔒</span>}
      </button>
    )
  }

  return (
    <select
      ref={selectRef}
      className="clientSelect"
      value={local ?? ''}
      onChange={e => setLocal(e.target.value || '')}
      onBlur={() => { setEditing(false); onChange?.(local || null) }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
    >
      {opts.map(c => (
        <option key={c.id} value={c.id}>{c.nombre}</option>
      ))}
    </select>
  )
}
function InlineTCSelect({ valueId, options = [], onChange, placeholder = '—' }) {
  const [editing, setEditing] = useState(false);
  const label = options.find(o => o.id === valueId)?.nombre || placeholder;

  if (!editing) {
    return (
      <button className="inline-tc-trigger" onClick={() => setEditing(true)}>
        {label} <MdKeyboardArrowDown />
      </button>
    );
  }

  return (
    <select
      className="inline-tc-select"
      autoFocus
      value={valueId || ''}
      onBlur={() => setEditing(false)}
      onChange={(e) => {
        onChange(e.target.value ? Number(e.target.value) : null);
        setEditing(false);
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
    </select>
  );
}

function InlineTCMultiSelect({ values = [], options = [], onChange }) {
  const [editing, setEditing] = useState(false);
  const [localIds, setLocalIds] = useState([]);

  // Sincronizar local al abrir
  useEffect(() => {
    if (editing) {
      setLocalIds(values.map(v => v.id));
    }
  }, [editing, values]);

  if (!editing) {
    return (
      <div className="inline-tc-multi-trigger" onClick={() => setEditing(true)}>
        {values.length ? values.map(v => (
          <span key={v.id} className="fh-chip small">{v.nombre}</span>
        )) : <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>Sin seleccionar...</span>}
        <button className="add-btn"><MdAdd /></button>
      </div>
    );
  }

  const toggle = (id) => {
    if (localIds.includes(id)) {
      setLocalIds(localIds.filter(i => i !== id));
    } else {
      setLocalIds([...localIds, id]);
    }
  };

  const handleDone = () => {
    setEditing(false);
    onChange(localIds);
  };

  return (
    <div className="inline-tc-multi-popover">
      <div className="pop-header">
        <span>Seleccionar opciones</span>
        <div className="header-actions">
          <button className="cancel-btn-text" onClick={() => setEditing(false)}>Cancelar</button>
          <button className="done-btn" onClick={handleDone}>Listo</button>
        </div>
      </div>
      <div className="pop-options">
        {options.map(o => (
          <label key={o.id} className={`pop-option ${localIds.includes(o.id) ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={localIds.includes(o.id)}
              onChange={() => toggle(o.id)}
            />
            {o.nombre}
          </label>
        ))}
      </div>
    </div>
  );
}

/* === componente inline para tipo de tarea === */
function InlineType({ value, onChange, disabled = false, isResponsible, isDirectivo, user, peopleForm }) {
  const toast = useToast()

  const typeStyles = {
    'STD': { bg: 'rgba(255,255,255,0.05)', color: '#fff', border: 'rgba(255,255,255,0.1)' },
    'TC': { bg: '#3B82F6', color: '#fff', border: '#3B82F6' },
    'IT': { bg: '#10B981', color: '#fff', border: '#10B981' }
  }

  const currentStyle = typeStyles[value] || typeStyles['STD']

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        className="typeSelect"
        disabled={disabled}
        style={{
          fontSize: '9px',
          padding: '0 8px 0 2px',
          background: currentStyle.bg,
          color: currentStyle.color,
          border: `1px solid ${currentStyle.border}`,
          borderRadius: '3px',
          maxHeight: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          appearance: 'none',
          WebkitAppearance: 'none',
          width: 'auto',
          minWidth: '30px',
          lineHeight: '14px',
          outline: 'none',
          transform: 'scale(0.9)',
          textTransform: 'uppercase',
          opacity: disabled ? 0.6 : 1,
          transformOrigin: 'left center'
        }}
        value={value}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            toast?.error("No tienes permisos para editar el tipo de tarea.");
          }
        }}
        onChange={e => {
          onChange?.(e.target.value)
        }}
        title={disabled ? "No tenés permisos para cambiar el tipo de tarea" : "Cambiar tipo de tarea"}
      >
        <option value="STD" style={{ fontSize: '10px', background: '#1a202c' }}>ESTÁNDAR</option>
        <option value="TC" style={{ fontSize: '10px', background: '#1a202c' }}>TC</option>
        <option value="IT" style={{ fontSize: '10px', background: '#1a202c' }}>IT</option>
      </select>
      {
        !disabled && (
          <MdKeyboardArrowDown
            size={7} // Flecha aún más pequeña
            style={{
              position: 'absolute',
              right: '6px',
              pointerEvents: 'none',
              color: '#fff'
            }}
          />
        )
      }
    </div >
  )
}
