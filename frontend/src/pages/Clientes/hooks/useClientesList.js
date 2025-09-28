import { useCallback, useEffect, useMemo, useState } from 'react'
import { clientesApi } from '../../../api/clientes'

export const PageSize = 25

export function useClientesList() {
  const [catalog, setCatalog] = useState({ tipos: [], estados: [], celulas: [], ponderaciones: [1,2,3,4,5] })
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtros (incluye fechas)
  const [filters, setFilters] = useState({
    q: '', celula_id: '', tipo_id: '', estado_id: '',
    ponderacion_min: '', ponderacion_max: '',
    created_from: '', created_to: '',
    order_by: 'nombre', order: 'asc', page: 0
  })

  const params = useMemo(() => ({
    q: filters.q || undefined,
    celula_id: filters.celula_id || undefined,
    tipo_id: filters.tipo_id || undefined,
    estado_id: filters.estado_id || undefined,
    ponderacion_min: filters.ponderacion_min || undefined,
    ponderacion_max: filters.ponderacion_max || undefined,
    created_from: filters.created_from || undefined,
    created_to: filters.created_to || undefined,
    order_by: filters.order_by,
    order: filters.order,
    limit: PageSize,
    offset: (filters.page || 0) * PageSize,
    with_metrics: true
  }), [filters])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [cat, list] = await Promise.all([ clientesApi.catalog(), clientesApi.list(params) ])
      setCatalog(cat)
      setRows(list.rows)
      setTotal(list.total)
    } catch (e) {
      console.error(e)
      setError(e?.fh?.message || e.message)
    } finally { setLoading(false) }
  }, [params])

  useEffect(() => { load() }, [load])

  const setPage = (p) => setFilters(f => ({ ...f, page: Math.max(0, p) }))
  const setFilter = (patch) => setFilters(f => ({ ...f, page: 0, ...patch }))

  return { catalog, rows, total, loading, error, filters, setFilter, setPage }
}
