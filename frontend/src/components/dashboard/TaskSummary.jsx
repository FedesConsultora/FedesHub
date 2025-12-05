// /frontend/src/components/dashboard/TaskSummary.jsx
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import KanbanBoard from '../tasks/KanbanBoard'
import TaskList from '../tasks/TaskList'
import { tareasApi } from '../../api/tareas'
import './tasks.scss'

/**
 * Props:
 * - onCreate: fn()
 * - variant: 'kanban' | 'list' (default 'kanban')
 */
export default function TaskSummary({ onCreate, variant = 'kanban' }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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

  const handleOpenTask = (taskId) => {
    navigate(`/tareas?taskId=${taskId}`)
  }

  return (
    <section className="dashSection">
      <header className="dashHead">
        <div className="left">
          <h3>Mis tareas</h3>
          <Link className="viewMore" to="/tareas">Ver más →</Link>
        </div>

        <button type="button" style={{ padding: '8px 12px', width: 'auto' }} className="submit" onClick={onCreate}>
          + Nueva tarea
        </button>
      </header>

      <div className="mt8">
        {variant === 'kanban' ? (
          // Kanban compacto, máximo 4 visibles por columna
          <KanbanBoard compact={true} maxRows={4} onOpenTask={handleOpenTask} />
        ) : (
          // Lista compacta, recortada a 4 filas
          <TaskList rows={topRows} loading={loading} maxRows={4} dense showHeader={false} />
        )}
      </div>
    </section>
  )
}