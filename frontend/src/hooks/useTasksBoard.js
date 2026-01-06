// /frontend/src/hooks/useTasksBoard.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tareasApi } from '../api/tareas'

export const STAGES = [
  { code: 'inbox', name: 'Bandeja de entrada' },
  { code: 'today', name: 'Hoy' },
  { code: 'week', name: 'Esta semana' },
  { code: 'month', name: 'Este mes' },
]

const emptyColumns = () => Object.fromEntries(STAGES.map(s => [s.code, []]))

const stageFromDue = (iso) => {
  // Las tareas nuevas o sin stage asignado SIEMPRE van a inbox primero
  return 'inbox'
}

/**
 * params → filtros del backend (/tareas)
 * p.ej.: { solo_mias:true, include_archivadas:false, q, cliente_id, estado_id, limit, orden_by, sort }
 */
export default function useTasksBoard(
  params = { solo_mias: true, include_archivadas: false, limit: 200, orden_by: 'prioridad', sort: 'desc' }
) {
  const [loading, setLoading] = useState(true)
  const [columns, setColumns] = useState(emptyColumns())
  const [rows, setRows] = useState([])
  const tasksRef = useRef(new Map()) // id -> tarea completa del backend (último fetch)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { rows: r } = await tareasApi.list(params)

      // Filtro frontend: excluir aprobadas y canceladas por defecto (a menos que se filtre explícitamente por estado)
      const filteredRows = r;

      tasksRef.current = new Map(filteredRows.map(t => [t.id, t]))
      setRows(filteredRows)

      // mapear a columnas del kanban (preferir stage/orden guardados por usuario)
      const cols = emptyColumns()
      filteredRows.forEach(t => {
        const stage = t.kanban_stage || stageFromDue(t.vencimiento)

        // Mapear responsables: extraer datos del feder anidado
        const responsables = (t.responsables || []).map(r => ({
          id: r.feder?.id || r.feder_id,
          nombre: r.feder?.nombre || r.nombre,
          apellido: r.feder?.apellido || r.apellido,
          avatar_url: r.feder?.avatar_url || r.avatar_url,
          es_lider: r.es_lider
        }))

        // Mapear colaboradores: extraer datos del feder anidado
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
          status: { code: t.estado_codigo, name: t.estado_nombre },
          responsables,
          colaboradores,
          kanbanOrder: Number.isFinite(t.kanban_orden) ? t.kanban_orden : Number.MAX_SAFE_INTEGER
        }
        if (!cols[stage]) cols[stage] = []
        cols[stage].push(item)
      })

      // ordenar por orden explícito; luego por due; luego por id
      for (const s of STAGES) {
        cols[s.code].sort((a, b) =>
          (a.kanbanOrder - b.kanbanOrder) ||
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

  // mover dentro del kanban (optimista)
  const moveTask = async ({ fromCol, fromIndex, toCol, toIndex }) => {
    // id antes de mutar estado (para persistir)
    const movingId = columns?.[fromCol]?.[fromIndex]?.id

    setColumns(prev => {
      // clonar shallow por columna
      const next = { ...prev, [fromCol]: [...(prev[fromCol] || [])], [toCol]: [...(prev[toCol] || [])] }
      // mismo array si es misma columna
      const sameCol = fromCol === toCol
      const source = next[fromCol]
      const target = sameCol ? source : next[toCol]

      const [item] = source.splice(fromIndex, 1)
      if (!item) return prev

      const L = target.length
      const idx = Math.max(0, Math.min(toIndex ?? L, L))
      target.splice(idx, 0, item)

      // re-normalizar orden de ambas columnas afectadas
      next[fromCol].forEach((it, i) => { it.kanbanOrder = i })
      if (!sameCol) next[toCol].forEach((it, i) => { it.kanbanOrder = i })

      return next
    })

    // Persistimos posición del usuario
    try {
      if (movingId != null) {
        await tareasApi.moveKanban(movingId, { stage: toCol, orden: toIndex ?? 0 })
      }
    } catch {
      // opcional: rollback/refetch/toast
    }
  }

  const board = useMemo(() => ({ view: 'kanban', columns }), [columns])

  return { loading, board, rows, moveTask, refetch: fetchAll, STAGES }
}