// frontend/src/hooks/useFeders.js
import { useCallback, useEffect, useMemo, useState } from 'react'
import { federsApi } from '../api/feders'

const DEFAULT_PARAMS = { limit: 50, offset: 0, q:'', celula_id:'', estado_id:'', is_activo:'' }

export default function useFeders(initial = {}) {
  const [params, setParams] = useState({ ...DEFAULT_PARAMS, ...initial })
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [catalog, setCatalog] = useState({ estados:[], modalidades:[], dias:[], celulas:[] })

  // catálogos
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const cat = await federsApi.catalog()
        if (alive) setCatalog(cat)
      } catch (e) {
        if (alive) setError(e)
      }
    })()
    return () => { alive = false }
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { rows, total } = await federsApi.list({
        ...params,
        celula_id: params.celula_id || undefined,
        estado_id: params.estado_id || undefined,
        is_activo: params.is_activo === '' ? undefined : (params.is_activo === 'true')
      })
      setRows(rows)
      setTotal(total)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => { fetchList() }, [fetchList])

  const page = useMemo(() => Math.floor((params.offset || 0) / (params.limit || 50)) + 1, [params])
  const pages = useMemo(() => Math.max(1, Math.ceil(total / (params.limit || 50))), [total, params.limit])

  const setPage = (p) => {
    const L = params.limit || 50
    const np = Math.max(1, Math.min(p, Math.max(1, Math.ceil(total / L))))
    setParams(prev => ({ ...prev, offset: (np-1) * L }))
  }

  const setFilter = (patch) => setParams(prev => ({ ...prev, offset:0, ...patch }))

  return { rows, total, loading, error, catalog, params, setParams: setFilter, page, pages, setPage, refetch: fetchList }
}
