// /frontend/src/hooks/useTasksBoard.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tareasApi } from '../api/tareas'
import { useAuthCtx } from '../context/AuthContext'
import { useToast } from '../components/toast/ToastProvider'

export const STAGES = [
  { code: 'pendiente', name: 'Pendiente' },
  { code: 'en_curso', name: 'En curso' },
  { code: 'desarrollado', name: 'Desarrollado' },
  { code: 'revision', name: 'En Revisión' },
  { code: 'aprobada', name: 'Aprobada' },
  { code: 'cancelada', name: 'Cancelada' },
];

const emptyColumns = () => Object.fromEntries(STAGES.map(s => [s.code, []]))

/**
 * params → filtros del backend (/tareas)
 * p.ej.: { solo_mias:true, include_archivadas:false, q, cliente_id, estado_id, limit, orden_by, sort }
 */
export default function useTasksBoard(
  params = { solo_mias: true, include_archivadas: false, include_finalizadas: false, limit: 200, orden_by: 'prioridad', sort: 'desc' }
) {
  const { user, roles } = useAuthCtx() || {}
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [columns, setColumns] = useState(emptyColumns())
  const [rows, setRows] = useState([])
  const tasksRef = useRef(new Map()) // id -> tarea completa del backend (último fetch)

  const isDirectivo = useMemo(() => roles?.includes('NivelB') || roles?.includes('NivelA'), [roles])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { rows: r } = await tareasApi.list(params)

      const now = new Date();
      const mappedRows = r.map(t => {
        const vDate = t.vencimiento ? new Date(t.vencimiento) : null;
        const fDate = t.finalizada_at ? new Date(t.finalizada_at) : null;
        const isFinal = ['aprobada', 'cancelada', 'finalizada'].includes(t.estado_codigo);

        // La tarea es vencida si NO está finalizada y el vencimiento ya pasó
        const isVencida = !isFinal && vDate && (vDate < now);

        return {
          ...t,
          estado_nombre: t.estado_nombre === 'Revisión' ? 'En Revisión' : t.estado_nombre,
          vencida: !!isVencida
        }
      });

      tasksRef.current = new Map(mappedRows.map(t => [t.id, t]))
      setRows(mappedRows)

      const cols = emptyColumns()
      mappedRows.forEach(t => {
        // En esta vista, usamos estado_codigo como stage
        const stage = t.estado_codigo || 'pendiente'

        // Mapear responsables
        const responsables = (t.responsables || []).map(r => ({
          id: r.feder?.id || r.feder_id,
          nombre: r.feder?.nombre || r.nombre,
          apellido: r.feder?.apellido || r.apellido,
          avatar_url: r.feder?.avatar_url || r.avatar_url,
          es_lider: r.es_lider
        }))

        // Mapear colaboradores
        const colaboradores = (t.colaboradores || []).map(c => ({
          id: c.feder?.id || c.feder_id,
          nombre: c.feder?.nombre || c.nombre,
          apellido: c.feder?.apellido || c.apellido,
          avatar_url: c.feder?.avatar_url || c.avatar_url,
          rol: c.rol
        }))

        const item = {
          id: t.id,
          title: t.titulo,
          due: t.vencimiento,
          prioridad: t.prioridad_num ?? t.prioridad ?? 0,
          boost_manual: t.boost_manual ?? 0,
          client: { id: t.cliente_id, name: t.cliente_nombre, weight: t.cliente_ponderacion ?? 0 },
          status: { code: t.estado_codigo, name: t.estado_nombre === 'Revisión' ? 'En Revisión' : t.estado_nombre },
          responsables,
          colaboradores,
          kanbanOrder: Number.isFinite(t.kanban_orden) ? t.kanban_orden : Number.MAX_SAFE_INTEGER,
          vencida: t.vencida
        }

        if (cols[stage]) {
          cols[stage].push(item)
        } else {
          // Si por alguna razón el código no existe en STAGES (e.g. inconsistencia)
          if (!cols['pendiente']) cols['pendiente'] = []
          cols['pendiente'].push(item)
        }
      })

      // Ordenar por prioridad/vencimiento ya que no usamos kanban_orden para estados
      // Pero para mantener compatibilidad con el componente KanbanBoard que usa indices, mantenemos la lógica de orden
      for (const s of STAGES) {
        cols[s.code].sort((a, b) =>
          (b.prioridad - a.prioridad) ||
          ((new Date(a.due || '9999-12-31')) - (new Date(b.due || '9999-12-31'))) ||
          (a.id - b.id)
        )
        // normalizar índices en memoria
        cols[s.code].forEach((it, i) => { it.kanbanOrder = i })
      }

      setColumns(cols)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Determinar si puede cambiar a un estado específico (duplicado de TaskStatusCard para coherencia en Kanban)
  const canChangeTo = (task, toCol) => {
    if (isDirectivo) return true

    const isResponsible = task.responsables?.some(r => Number(r.id) === Number(user?.id))
    const isCollaborator = task.colaboradores?.some(c => Number(c.id) === Number(user?.id))

    if (!isResponsible && !isCollaborator) return false

    if (toCol === 'aprobada' || toCol === 'cancelada') return false
    return true
  }

  const moveTask = async ({ fromCol, fromIndex, toCol, toIndex }) => {
    const task = columns[fromCol]?.[fromIndex]
    if (!task) return

    if (fromCol === toCol) {
      // Reordenamiento interno no soportado por ahora en vista de estados (se ordena por prioridad)
      return
    }

    if (!canChangeTo(task, toCol)) {
      toast?.error('No tienes acceso a cambiar la tarea al estado seleccionado')
      return
    }

    // Mapear stage a ID de estado
    // Necesitamos el catálogo de estados para obtener el ID real
    try {
      const cat = await tareasApi.catalog()
      const estado = cat.estados?.find(e => e.codigo === toCol)
      if (!estado) throw new Error('Estado no encontrado')

      // Optimista
      setColumns(prev => {
        const next = { ...prev, [fromCol]: [...prev[fromCol]], [toCol]: [...prev[toCol]] }
        const [item] = next[fromCol].splice(fromIndex, 1)
        item.status = { code: toCol, name: estado.nombre === 'Revisión' ? 'En Revisión' : estado.nombre }
        next[toCol].push(item)
        // Re-ordenar target
        next[toCol].sort((a, b) => (b.prioridad - a.prioridad) || ((new Date(a.due || '9999-12-31')) - (new Date(b.due || '9999-12-31'))) || (a.id - b.id))
        next[toCol].forEach((it, i) => { it.kanbanOrder = i })
        return next
      })

      await tareasApi.setEstado(task.id, estado.id)
      toast?.success(`Estado actualizado a ${estado.nombre === 'Revisión' ? 'En Revisión' : estado.nombre}`)
    } catch (e) {
      toast?.error(e?.message || 'No se pudo actualizar el estado')
      fetchAll() // Rollback
    }
  }

  const board = useMemo(() => ({ view: 'kanban', columns }), [columns])

  return { loading, board, rows, moveTask, canChangeTo, refetch: fetchAll, STAGES }
}
