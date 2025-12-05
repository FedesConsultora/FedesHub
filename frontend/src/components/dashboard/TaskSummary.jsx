// /frontend/src/components/dashboard/TaskSummary.jsx
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import KanbanBoard from '../tasks/KanbanBoard'
import TaskList from '../tasks/TaskList'
import { tareasApi } from '../../api/tareas'
import './tasks.scss'

/**
 * Props:
 * - onCreate: fn()
 * - onOpenTask: fn(taskId)
 * - variant: 'kanban' | 'list' (default 'kanban')
 */
export default function TaskSummary({ onCreate, onOpenTask, variant = 'kanban' }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (variant !== 'list') return
    let alive = true
    setLoading(true)
    tareasApi.list({ solo_mias: true, include_archivadas: false, limit: 50, orden_by: 'prioridad', sort: 'desc' })
      .then(({ rows }) => { if (alive) setRows(rows || []) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [variant])

  const topRows = useMemo(() => (rows || []).map(t => ({
    id: t.id,
    titulo: t.titulo,
    cliente_nombre: t.cliente_nombre,
    estado_nombre: t.estado_nombre,
    vencimiento: t.vencimiento,
    progreso_pct: t.progreso_pct ?? 0
  })), [rows])

  return (
    <section className="dashSection">
      <header className="dashHead">
        <div className="left">
          <Link className="view-tareas" to='/tareas'>Mis tareas</Link>

        </div>

        <button type="button" style={{ padding: '8px 12px', width: 'auto' }} className="submit" onClick={onCreate}>
          + Nueva tarea
        </button>
      </header>

      <div className="mt8">
        {variant === 'kanban' ? (
          // Kanban compacto, máximo 4 visibles por columna
          <KanbanBoard hideInbox compact={true} maxRows={4} onOpenTask={onOpenTask} />
        ) : (
          // Lista compacta, recortada a 4 filas
          <TaskList onOpenTask={onOpenTask} rows={topRows} loading={loading} maxRows={4} dense showHeader={false} />
        )}
      </div>
    </section>
  )
}