// src/hooks/useAusencias.js
import { useEffect, useMemo, useState } from 'react'
import { ausenciasApi } from '../api/ausencias'
import usePermission from './usePermissions'

// Utilidad
const two = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`
const clamp = (n,min,max) => Math.max(min, Math.min(max, n))

// Convierte ausencia (unidad=dia/hora) -> {dias, horas}
export function normalizeAmount(row, workdayHours = 8) {
  if (row.unidad_codigo === 'hora') {
    const h = Number(row.duracion_horas || 0)
    return { dias: h / workdayHours, horas: h }
  }
  // días
  const d1 = new Date(row.fecha_desde+'T00:00:00')
  const d2 = new Date(row.fecha_hasta+'T00:00:00')
  const days = Math.floor((d2 - d1)/86400000) + 1
  const dias = row.es_medio_dia ? 0.5 : days
  return { dias, horas: dias*workdayHours }
}

export function useSaldos(yearStr) {
  const [data, setData] = useState({ saldos: [], tipos: [], loading: true, error: null })
  useEffect(() => {
    let alive = true
    setData(s => ({ ...s, loading: true, error: null }))
    Promise.all([
      ausenciasApi.cuotas.meSaldo({ fecha: `${yearStr}-12-31` }),
      ausenciasApi.catalog.tipos()
    ])
    .then(([saldos, tipos]) => alive && setData({ saldos, tipos, loading:false, error:null }))
    .catch(e => alive && setData({ saldos:[], tipos:[], loading:false, error: e?.message || 'Error' }))
    return () => { alive = false }
  }, [yearStr])
  return data
}

export function useAusenciasYear(yearStr, federId = null) {
  const [state, setState] = useState({ rows:[], loading:true, error:null })
  useEffect(() => {
    let alive = true
    const desde = `${yearStr}-01-01`, hasta = `${yearStr}-12-31`
    setState(s => ({ ...s, loading:true, error:null }))
    ausenciasApi.aus.list({ feder_id: federId || undefined, desde, hasta })
      .then(rows => alive && setState({ rows, loading:false, error:null }))
      .catch(e => alive && setState({ rows:[], loading:false, error:e?.message || 'Error' }))
    return () => { alive = false }
  }, [yearStr, federId])
  return state
}

export function useAusenciasBoard(yearStr) {
  const { can } = usePermission()
  const canApprove = can('ausencias','approve')
  const canAssign  = can('ausencias','assign')

  const today = new Date()
  const year  = Number(yearStr)
  const [monthIdx, setMonthIdx] = useState(clamp(today.getFullYear()===year ? today.getMonth() : 0,0,11))

  const saldos = useSaldos(yearStr)
  const aus = useAusenciasYear(yearStr)

  // mapa por día → array de ausencias aprobadas
  const byDate = useMemo(() => {
    const map = new Map()
    for (const r of aus.rows) {
      // pintamos sólo aprobadas (igual podemos sombrear pendientes si se desea)
      if (r.estado_codigo !== 'aprobada') continue
      let d = new Date(r.fecha_desde+'T00:00:00')
      const end = new Date(r.fecha_hasta+'T00:00:00')
      while (d <= end) {
        const k = ymd(d)
        const arr = map.get(k) || []
        arr.push(r)
        map.set(k, arr)
        d = new Date(d.getTime() + 86400000)
      }
    }
    return map
  }, [aus.rows])

  return { monthIdx, setMonthIdx, saldos, aus, byDate, canApprove, canAssign }
}
