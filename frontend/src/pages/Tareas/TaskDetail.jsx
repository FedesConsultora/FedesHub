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
import ParticipantsEditor from '../../components/tasks/ParticipantsEditor.jsx'
import useContentEditable from '../../hooks/useContentEditable'
import { useToast } from '../../components/toast/ToastProvider.jsx'
import { MdKeyboardArrowDown, MdAddComment, MdAdd, MdAttachFile } from 'react-icons/md'
import { FaRegSave, FaStar, FaTrash } from "react-icons/fa";
import TaskHistory from '../../components/tasks/TaskHistory.jsx'
import PriorityBoostCheckbox from '../../components/tasks/PriorityBoostCheckbox.jsx'
import TitleTooltip from '../../components/tasks/TitleTooltip.jsx'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import { useUploadContext } from '../../context/UploadProvider.jsx'
import { useTaskAttachments } from '../../pages/Tareas/hooks/useTaskAttachments'
import ContentGallery from '../../components/tasks/ContentGallery.jsx'
import ImageFullscreen from '../../components/common/ImageFullscreen.jsx'
import GlobalLoader from '../../components/loader/GlobalLoader.jsx'
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

export default function TaskDetail({ taskId, onUpdated, onClose }) {
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
  const [tab, setTab] = useState('desc')
  const [form, setForm] = useState({ titulo: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [peopleForm, setPeopleForm] = useState({
    responsables: [],
    colaboradores: []
  });
  const [showCommentsPopup, setShowCommentsPopup] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);

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

    const isResp = currentResponsables.some(r =>
      (r.id === user.id) || (r.feder_id === user.id)
    )

    const isColab = currentColaboradores.some(c =>
      (c.id === user.id) || (c.feder_id === user.id)
    )

    setIsResponsible(isResp)
    setIsCollaborator(isColab)
  }, [peopleForm.responsables, peopleForm.colaboradores, user?.id])


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
    const [t, cat] = await Promise.all([
      tareasApi.get(taskId),

      tareasApi.catalog().catch((err) => {
        console.error('ERROR LOADING CATALOG:', err)
        return {}
      })

    ])

    setTask(t)
    setHistoryRefresh(prev => prev + 1) // Trigger history refresh
    setCatalog(cat || {})
    setForm({ titulo: t?.titulo || '', descripcion: t?.descripcion || '' })
    document.title = `${t?.titulo || 'Tarea'}`
  }, [id])

  useEffect(() => { (async () => { await reload() })() }, [reload])


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
    const next = await tareasApi.setEstado(taskId, estado_id)
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
  const clienteNombre = task?.cliente?.nombre || task?.cliente_nombre || '—'
  const hitoNombre = task?.hito?.nombre || task?.hito_nombre || null
  const vencimientoISO = task?.vencimiento || null
  const progreso = Number(task?.progreso_pct) || 0
  const prioridad = task?.prioridad_num
  const boostManual = task?.boost_manual || 0
  const clienteColor = task?.cliente?.color || task?.cliente_color || null

  const responsables = mapResp(task?.Responsables || task?.responsables || [])
  const colaboradores = mapCol(task?.Colaboradores || task?.colaboradores || [])

  const isFavorita = !!(task.is_favorita || task.favorita)

  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString() } catch { return '' } }

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


      {/* === Header sticky === */}
      <div className="taskHeader">
        <div className="titleWrap">
          {/* Título con truncamiento visual */}
          <div className="titleSection">
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

          {/* Meta info - ahora puede hacer wrap */}
          <div className="meta">
            <span className="inlineDue">
              <InlineDue
                value={toInputDate(vencimientoISO)}
                onChange={handleDueChange}
                disabled={!isResponsible && !isDirectivo}
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
                disabled={!isResponsible && !isNivelB}
              />
            </span>

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

      </div>

      <div className="grid">
        {/* LEFT */}
        <div className="left">
          <div className="card" style={{ minHeight: '300px' }}>
            <div className="cardHeader">
              <div className="desc">
                <p>Descripción</p>
                {/* <button className={`fh-chip ${tab==='childs'?'primary':''}`} onClick={()=>setTab('childs')}>Tareas hijas</button> */}
              </div>
            </div>

            {tab === 'desc' ? (
              // Descripción con editor de texto enriquecido
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
            ) : (
              <SubtasksPanel
                parentId={Number(id)}
                defaultClienteId={task?.cliente_id || task?.cliente?.id || null}
                catalog={catalog}
              />
            )}
          </div>

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
                    <p className="hint">Los videos pueden tardar varios minutos</p>
                  </div>
                ) : (
                  <>
                    <div className="spinner"></div>
                    <p>Subiendo archivo...</p>
                    <p className="hint">Los videos pueden tardar varios minutos</p>
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
            </div>

            {/* Lista de archivos crudos */}
            {adjuntos.filter(a => !a.es_embebido && !a.comentario_id).length > 0 && (
              <div className="raw-files-list">
                {adjuntos.filter(a => !a.es_embebido && !a.comentario_id).map(file => {
                  const isVideoFile = file.mime?.startsWith('video/') ||
                    file.nombre?.toLowerCase().match(/\.(mp4|webm|mov|avi)$/);
                  return (
                    <div key={file.id} className="raw-file-item">
                      <span className="file-name">{file.nombre || 'Archivo'}</span>
                      <div className="file-actions">
                        <button
                          className="view-btn"
                          onClick={() => setRawFullscreen({
                            url: getFileUrl(file),
                            name: file.nombre || 'Archivo',
                            isVideo: !!isVideoFile
                          })}
                        >
                          Ver
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
              isVideo={rawFullscreen.isVideo}
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
            <TaskComments taskId={Number(taskId)} catalog={catalog} />
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


    </div >
  )
}

/* === componente inline para fecha === */
function InlineDue({ value, onChange, disabled = false }) {
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
      <span className="dueChip disabled" title="Solo los responsables pueden cambiar la fecha">
        {value ? new Date(value + 'T00:00:00').toLocaleDateString() : 'Sin fecha'}
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
          backgroundColor: valueColor || '#3B82F6',
          color: '#ffffff',
          border: `2px solid ${valueColor || '#3B82F6'}`,
          fontWeight: '500'
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
