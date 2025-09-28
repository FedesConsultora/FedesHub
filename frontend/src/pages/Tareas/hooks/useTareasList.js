// frontend/src/pages/tareas/hooks/useTareasList.js
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { tareasApi } from '../../../api/tareas'

export const PageSize = 24

const parseParams = (search) => {
  const p = new URLSearchParams(search)
  const pick = (k, d='') => p.get(k) ?? d
  const num  = (k) => { const v = p.get(k); return v ? Number(v) : '' }
  return {
    q: pick('q'),
    cliente_id: num('cliente_id'),
    estado_id: num('estado_id'),
    impacto_id: num('impacto_id'),
    urgencia_id: num('urgencia_id'),
    vencimiento_from: pick('vencimiento_from'),
    vencimiento_to:   pick('vencimiento_to'),
    order_by: pick('order_by','prioridad'),
    sort:     pick('sort','desc'),
    page:     Number(p.get('page') ?? 0)
  }
}

const toQuery = (f) => {
  const p = new URLSearchParams()
  for (const [k,v] of Object.entries(f)) {
    if (v === '' || v == null) continue
    p.set(k, v)
  }
  return p.toString()
}

export function useTareasList(){
  const { search } = useLocation()
  const navigate = useNavigate()

  const [filters, setFilters] = useState(() => parseParams(search))
  const [catalog, setCatalog] = useState({ estados:[], impactos:[], urgencias:[], clientes:[] })
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sync desde URL → estado
  useEffect(() => { setFilters(parseParams(search)) }, [search])

  // fetch catálogo una vez
  useEffect(() => {
    (async () => {
      try{
        const cat = await tareasApi.catalog()
        setCatalog(cat)
      }catch(e){ console.error(e) }
    })()
  }, [])

  const fetchList = useCallback(async (cur) => {
    setLoading(true); setError('')
    try{
      const params = { ...cur, limit: PageSize, offset: (cur.page||0) * PageSize }
      const res = await tareasApi.list(params)
      setRows(res.rows || [])
      setTotal(res.total || 0)
    }catch(e){
      console.error(e); setError('No se pudo cargar el listado')
    }finally{
      setLoading(false)
    }
  }, [])

  // listar al cambiar filtros
  useEffect(() => { fetchList(filters) }, [fetchList, filters])

  const setFilter = (patch) => {
    const next = { ...filters, ...patch, page: 0 }
    navigate({ search: toQuery(next) }, { replace:false })
  }

  const setPage = (page) => {
    const next = { ...filters, page }
    navigate({ search: toQuery(next) }, { replace:false })
  }

  const refetch = () => fetchList(filters)

  return { catalog, rows, total, loading, error, filters, setFilter, setPage, refetch }
}
