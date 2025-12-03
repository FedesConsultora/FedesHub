import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tareasApi } from '../../api/tareas'
import TaskStatusCard from '../../components/tasks/TaskStatusCard'

import AssignedPeople from '../../components/tasks/AssignedPeople'
import LabelChip from '../../components/common/LabelChip'
import TaskComments from '../../components/tasks/comments'
import TaskAttachments from '../../components/tasks/TaskAttachments.jsx'
import TaskChecklist from '../../components/tasks/TaskChecklist.jsx'
import { useModal } from '../../components/modal/ModalProvider.jsx'
import SubtasksPanel from '../../components/tasks/SubtasksPanel.jsx'
import ParticipantsEditor from '../../components/tasks/ParticipantsEditor.jsx'
import useContentEditable from '../../hooks/useContentEditable'
import { useToast } from '../../components/toast/ToastProvider.jsx'
import { MdKeyboardArrowDown } from 'react-icons/md'
import { FaRegSave, FaStar } from "react-icons/fa";
import { MdAddComment } from "react-icons/md";
import TaskHistory from '../../components/tasks/TaskHistory.jsx'
import PriorityBoostCheckbox from '../../components/tasks/PriorityBoostCheckbox.jsx'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import { useTaskAttachments } from '../../pages/Tareas/hooks/useTaskAttachments'
import './task-detail.scss'

/* === helpers normalization === */
const mapResp = (arr = []) => arr.map(r => r?.feder ? ({ ...r.feder, es_lider: !!r.es_lider, avatar_url: r.feder.avatar_url || null }) : r)
const mapCol = (arr = []) => arr.map(c => c?.feder ? ({ ...c.feder, rol: c.rol ?? null, avatar_url: c.feder.avatar_url || null }) : c)

/* === helpers fecha === */
const toInputDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
const fromInputDate = (val) => {
  if (!val) return null
  // set local a 23:59:59 para evitar TZ raras si mostramos solo fecha
  const [y, m, d] = val.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 23, 59, 59)
  return dt.toISOString()
}

export default function TaskDetail({ taskId, onUpdated, onClose }) {
  const { id: urlId } = useParams()
  const navigate = useNavigate()
  const modal = useModal()
  const toast = useToast()

  // Use taskId prop if provided, otherwise use id from URL params
  const id = taskId || urlId

  const [task, setTask] = useState(null)
  const [catalog, setCatalog] = useState(null)
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

  const { user } = useAuthCtx() || {}

  const { adjuntos, loading, add, remove, upload } = useTaskAttachments(id)


  const [isOver, setIsOver] = useState(false)

  const onDrop = async (e) => {
    e.preventDefault()
    setIsOver(false)
    const files = e.dataTransfer?.files
    if (files?.length) {
      try {
        await upload(Array.from(files)) // 🚀 Subida automática usando el hook
        console.log('Archivos subidos desde la segunda dropzone')
      } catch (err) {
        console.error('Error al subir archivos', err)
      }
    }
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setIsOver(true)
  }

  const onDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false)
  }

  console.log('----------------------------------------->', isResponsible)

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

  useEffect(() => {
    if (!task || !user?.id) return

    const normalizedResp = mapResp(task.responsables || task.Responsables || [])

    setIsResponsible(prev => prev || normalizedResp.some(r => r.id === user.id))

    const normalizedCol = mapCol(task.colaboradores || task.Colaboradores || [])
    setPeopleForm({ responsables: normalizedResp, colaboradores: normalizedCol })
  }, [task, user?.id])


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

      tareasApi.catalog().catch(() => ({}))

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


  const saveIfDirty = useCallback(async (source = 'auto') => {
    if (!dirty || !task || saving) return
    const patch = {}
    const currTitulo = (form.titulo ?? '').trim()
    const currDesc = (form.descripcion ?? '')
    if (currTitulo !== (task.titulo ?? '').trim()) patch.titulo = currTitulo
    if (currDesc !== (task.descripcion ?? '')) patch.descripcion = currDesc
    if (!Object.keys(patch).length) return

    console.log('[TaskDetail] Guardando cambios:', { taskId, patch })

    try {
      setSaving(true)
      const next = await tareasApi.update(taskId, patch)
      console.log('[TaskDetail] Guardado exitoso:', next)
      setTask(next)
      setHistoryRefresh(prev => prev + 1)
      setForm({ titulo: next?.titulo || '', descripcion: next?.descripcion || '' })
      toast?.success(source === 'auto' ? 'Cambios guardados' : 'Guardado')
    } catch (e) {
      console.error('[TaskDetail] Error al guardar:', e)
      toast?.error(e?.message || 'No se pudo guardar')
    } finally { setSaving(false) }
  }, [dirty, form, taskId, task, saving, toast])

  // dispara cada vez que cambia título/desc (debounce 800ms)
  useEffect(() => {
    if (!task) return
    const t = setTimeout(() => saveIfDirty('auto'), 800)
    return () => clearTimeout(t)
  }, [form.titulo, form.descripcion, task, saveIfDirty])

  // forzar guardado al salir del campo
  const flushOnBlur = () => saveIfDirty('blur')

  // beforeunload
  useEffect(() => {
    const onBeforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

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
  }

  if (!task) return <div className="taskDetail"><div className="card">Cargando…</div></div>

  // normalización
  const estadoCodigo = task?.estado?.codigo || task?.estado_codigo || 'pendiente'
  const aprobLabel = task?.aprobacionEstado?.nombre || task?.aprobacion_estado_nombre || null
  const etiquetas = task?.etiquetas || []
  const clienteNombre = task?.cliente?.nombre || task?.cliente_nombre || '—'
  const hitoNombre = task?.hito?.nombre || task?.hito_nombre || null
  const vencimientoISO = task?.vencimiento || null
  const progreso = Number(task?.progreso_pct) || 0
  const prioridad = task?.prioridad_num

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
          <div>
            {/* Título (autosave) */}
            <div
              className="ttl editable"
              data-placeholder="Escribí un título…"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              role="textbox"
              aria-label="Título de la tarea"
              ref={titleCE.ref}
              onInput={titleCE.handleInput}
              onBlur={flushOnBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
              onPaste={(e) => {
                e.preventDefault()
                const txt = (e.clipboardData?.getData('text/plain') ?? '').replace(/\n/g, ' ')
                document.execCommand?.('insertText', false, txt)
              }}
            />

          </div>
          {/* <div className="chips">
            {etiquetas.slice(0,6).map(e => <LabelChip key={e.id||e.codigo} label={e} />)}
          </div> */}
          <div className="meta">
            <span className="inlineDue">
              <InlineDue
                value={toInputDate(vencimientoISO)}
                onChange={handleDueChange}
                disabled={!isResponsible}
              />
            </span>
            <TaskStatusCard
              estadoCodigo={estadoCodigo}
              progresoPct={progreso}
              aprobLabel={aprobLabel}
              prioridad={prioridad}
              vencimientoISO={vencimientoISO}
              etiquetas={etiquetas}
              estadosCatalog={catalog?.estados || catalog?.tareaEstados || []}
              onPick={handleEstado}
            />
            <span className="inlineClient">

              <InlineClient
                valueId={task?.cliente?.id || task?.cliente_id || null}
                valueName={clienteNombre}
                options={catalog?.clientes || catalog?.clients || []}
                onChange={handleClientChange}

                disabled={!isResponsible}

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
              // Descripción (autosave)
              <div
                className="txt editable"
                style={{ minHeight: '190px' }}
                data-placeholder="Escribí la descripción…"
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Descripción de la tarea"
                ref={descCE.ref}
                onInput={descCE.handleInput}
                onBlur={flushOnBlur}
                onPaste={(e) => {
                  e.preventDefault()
                  const txt = e.clipboardData?.getData('text/plain') ?? ''
                  document.execCommand?.('insertText', false, txt)
                }}
              />
            ) : (
              <SubtasksPanel
                parentId={Number(id)}
                defaultClienteId={task?.cliente_id || task?.cliente?.id || null}
                catalog={catalog}
              />
            )}
          </div>
          <TaskAttachments
            taskId={Number(id)}
            onAfterChange={async () => {
              try {
                setTask(await tareasApi.get(id))
                setHistoryRefresh(prev => prev + 1)
              } catch { }
            }}
          />

          <TaskHistory taskId={Number(id)} key={historyRefresh} />


        </div>

        {/* RIGHT */}
        <div className="right" style={{ alignItems: 'center', position: 'relative' }}>
          <div className={`dropzone ${isOver ? 'is-over' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <p>Contenido Listo</p>
            <MdAddComment
              size={30}
              className="commentsToggleBtn"
              onClick={() => setShowCommentsPopup(v => !v)} />


          </div>
          {/* === Panel de comentarios === */}
          {showCommentsPopup && (
            <div className="comments"
              style={{
                position: 'absolute',
                top: 42,
                right: 0,
                height: 'calc(100% - 48px)'
              }}
            >
              <TaskComments taskId={Number(taskId)} catalog={catalog} />
            </div>
          )}

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

          disabled={!isResponsible}

        />
        {isResponsible && (
          <PriorityBoostCheckbox
            taskId={Number(taskId)}
            enabled={task?.boost_manual > 0}
            onChange={handleBoostChange}
          />
        )}


      </div>


    </div>
  )
}

/* === componente inline para fecha === */
function InlineDue({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value || '')
  useEffect(() => { setLocal(value || '') }, [value])

  if (!editing) {
    return (
      <button className="dueChip" type="button" onClick={() => setEditing(true)} title="Editar fecha de vencimiento">
        {value ? new Date(value).toLocaleDateString() : 'Sin fecha'}
      </button>
    )
  }
  return (
    <input
      className="dueInput"
      type="date"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { setEditing(false); onChange?.(local) }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
      autoFocus
    />
  )
}

/* === componente inline para cliente === */
function InlineClient({ valueId = null, valueName = '', options = [], onChange }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(valueId ?? '')
  useEffect(() => { setLocal(valueId ?? '') }, [valueId])

  const opts = useMemo(
    () => (options || []).slice().sort((a, b) =>
      String(a?.nombre || '').localeCompare(String(b?.nombre || ''))),
    [options]
  )

  if (!editing) {

    return (
      <>
        <button
          className="clientChip"
          type="button"
          onClick={() => setEditing(true)}
          title="Cambiar cliente"
        >
          {valueName || 'Sin cliente'}  <MdKeyboardArrowDown style={{ position: 'relative', top: '2px' }} />
        </button>

      </>
    )
  }

  return (
    <select
      className="clientSelect"
      value={local ?? ''}
      onChange={e => setLocal(e.target.value || '')}
      onBlur={() => { setEditing(false); onChange?.(local || null) }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
      autoFocus
    >
      {opts.map(c => (
        <option key={c.id} value={c.id}>{c.nombre}</option>
      ))}
    </select>
  )
}
