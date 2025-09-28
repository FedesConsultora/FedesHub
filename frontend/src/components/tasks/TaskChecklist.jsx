// /frontend/src/components/tasks/TaskChecklist.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { tareasApi } from '../../api/tareas'
import { FaPlus, FaTrashAlt, FaGripVertical, FaChevronDown, FaChevronRight } from 'react-icons/fa'
import { useToast } from '../../components/toast/ToastProvider.jsx'
import { useModal } from '../../components/modal/ModalProvider.jsx'
import './TaskChecklist.scss'

export default function TaskChecklist({ taskId, onAfterChange }) {
  const toast = useToast()
  const modal = useModal()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTxt, setNewTxt] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTxt, setEditTxt] = useState('')
  const [showDone, setShowDone] = useState(false)

  // drag state
  const dragIdRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await tareasApi.getChecklist(taskId)
      setItems(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [taskId])

  const callAndRefresh = async (fn, okMsg=null) => {
    try {
      await fn()
      await load()
      await onAfterChange?.()
      if (okMsg) toast?.success(okMsg)
    } catch (e) {
      toast?.error(e?.message || 'Ocurrió un error')
    }
  }

  const add = async () => {
    const t = newTxt.trim()
    if (!t) return
    await callAndRefresh(() => tareasApi.addChecklist(taskId, t), 'Ítem agregado')
    setNewTxt('')
  }

  const toggle = async (it) => {
    await callAndRefresh(() => tareasApi.patchChecklistItem(it.id, { is_done: !it.is_done }))
  }

  const startEdit = (it) => { setEditingId(it.id); setEditTxt(it.titulo || '') }
  const commitEdit = async () => {
    const t = editTxt.trim()
    const id = editingId
    setEditingId(null)
    if (!id) return
    if (!t) {
      // si quedó vacío, preguntar eliminar
      const ok = await modal.confirm({
        title: 'Eliminar ítem',
        message: 'El texto quedó vacío. ¿Querés eliminar este ítem?',
        okText: 'Eliminar',
        cancelText: 'Cancelar'
      })
      if (!ok) return
      await callAndRefresh(() => tareasApi.deleteChecklistItem(id), 'Ítem eliminado')
      return
    }
    await callAndRefresh(() => tareasApi.patchChecklistItem(id, { titulo: t }), 'Ítem actualizado')
  }

  const del = async (it) => {
    const ok = await modal.confirm({
      title: 'Eliminar ítem',
      message: `¿Eliminar “${it.titulo}”?`,
      okText: 'Eliminar',
      cancelText: 'Volver'
    })
    if (!ok) return
    await callAndRefresh(() => tareasApi.deleteChecklistItem(it.id), 'Ítem eliminado')
  }

  // Ordenamiento: primero pendientes por orden, luego done
  const [pending, done] = useMemo(() => {
    const p = []; const d = []
    for (const it of items) (it.is_done ? d : p).push(it)
    const by = (a,b) => (a.orden ?? a.id) - (b.orden ?? b.id)
    p.sort(by); d.sort(by)
    return [p, d]
  }, [items])

  const onDragStart = (id) => (e) => {
    dragIdRef.current = id
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const onDrop = (targetId, list='pending') => async (e) => {
    e.preventDefault()
    const srcId = dragIdRef.current
    dragIdRef.current = null
    if (!srcId || srcId === targetId) return

    const base = list === 'pending' ? [...pending] : [...done]
    const other = list === 'pending' ? done : pending
    const srcIdx = base.findIndex(x => x.id === srcId)
    const dstIdx = base.findIndex(x => x.id === targetId)
    if (srcIdx < 0 || dstIdx < 0) return

    // mover en memoria
    const [moved] = base.splice(srcIdx, 1)
    base.splice(dstIdx, 0, moved)

    // construir orden consolidado (mantener el otro grupo igual)
    const newOrder = (list === 'pending' ? base.concat(other) : pending.concat(base))
    const payload = newOrder.map((it, i) => ({ id: it.id, orden: i + 1 }))

    await callAndRefresh(() => tareasApi.reorderChecklist(taskId, payload))
  }

  return (
    <div className="TaskChecklist card">
      <div className="cardHeader">
        <div className="title">Checklist</div>
        {!!done.length && (
          <button
            className="smallToggle"
            onClick={() => setShowDone(v => !v)}
            title={showDone ? 'Ocultar completados' : 'Mostrar completados'}
          >
            {showDone ? <FaChevronDown/> : <FaChevronRight/>}
            <span>{done.length} completado{done.length!==1 ? 's' : ''}</span>
          </button>
        )}
      </div>

      {/* Nueva línea */}
      <div className="newRow">
        <input
          className="newInput"
          value={newTxt}
          onChange={e=>setNewTxt(e.target.value)}
          placeholder="Nuevo ítem…"
          onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); add() } }}
          maxLength={200}
        />
        <button className="addBtn" onClick={add} title="Agregar ítem">
          <FaPlus/> <span>Agregar</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="skeleton">
          <div className="skl" /><div className="skl" /><div className="skl" />
        </div>
      )}

      {/* Lista */}
      {!loading && (
        <>
          {/* Pendientes */}
          <ul className="list" aria-label="Pendientes">
            {pending.map(it => (
              <li
                key={it.id}
                className={`item ${it.is_done ? 'done':''}`}
                draggable
                onDragStart={onDragStart(it.id)}
                onDragOver={onDragOver}
                onDrop={onDrop(it.id, 'pending')}
              >
                <span className="drag"><FaGripVertical/></span>
                <input
                  className="chk"
                  type="checkbox"
                  checked={!!it.is_done}
                  onChange={()=>toggle(it)}
                  aria-label="Marcar como hecho"
                />
                {editingId === it.id ? (
                  <input
                    className="editInput"
                    value={editTxt}
                    onChange={e=>setEditTxt(e.target.value)}
                    autoFocus
                    onBlur={commitEdit}
                    onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); e.currentTarget.blur() } if(e.key==='Escape'){ setEditingId(null) } }}
                    maxLength={200}
                  />
                ) : (
                  <button className="txtBtn" onClick={()=>startEdit(it)} title="Editar">
                    {it.titulo}
                  </button>
                )}
                <button className="rm" onClick={()=>del(it)} title="Eliminar"><FaTrashAlt/></button>
              </li>
            ))}
            {!pending.length && <li className="empty">Sin pendientes</li>}
          </ul>

          {/* Completados (colapsable) */}
          {done.length > 0 && showDone && (
            <ul className="list doneList" aria-label="Completados">
              {done.map(it => (
                <li
                  key={it.id}
                  className={`item done`}
                  draggable
                  onDragStart={onDragStart(it.id)}
                  onDragOver={onDragOver}
                  onDrop={onDrop(it.id, 'done')}
                >
                  <span className="drag"><FaGripVertical/></span>
                  <input
                    className="chk"
                    type="checkbox"
                    checked={!!it.is_done}
                    onChange={()=>toggle(it)}
                    aria-label="Desmarcar"
                  />
                  <span className="txt done">{it.titulo}</span>
                  <button className="rm" onClick={()=>del(it)} title="Eliminar"><FaTrashAlt/></button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}