// src/hooks/useCalendario.js
import { useEffect, useMemo, useState, useCallback } from 'react'
import { calendarioApi } from '../api/calendario'
import { parseApiError } from '../api/client'

const two = (n)=>String(n).padStart(2,'0')
export const isoDate = (d)=>`${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`

// ───────────────────────────────────────────────────────────────────────────────
// Catálogo  (defensivo: si algún endpoint no existe, devuelve [])
export function useCalendarioCatalog() {
  const [loading, setLoading] = useState(true)
  const [tipos, setTipos] = useState([])        // (puede venir vacío si el backend no lo expone)
  const [vis, setVis] = useState([])
  const [evtTipos, setEvtTipos] = useState([])
  const [asisTipos, setAsisTipos] = useState([])
  const [syncDirs, setSyncDirs] = useState([])
  const [error, setError] = useState(null)

  useEffect(()=> {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)

        // Intentamos traer todo; si algo falta, cae en []
        const [t, v, e, a, s] = await Promise.all([
          // algunos backends no tienen “calendarioTipos”; lo tratamos como opcional
          calendarioApi?.catalog?.calendarioTipos?.().catch(()=>[]) ?? [],
          calendarioApi.catalog.visibilidades().catch(()=>[]),
          calendarioApi.catalog.eventoTipos().catch(()=>[]),
          calendarioApi.catalog.asistentesTipos().catch(()=>[]),
          calendarioApi.catalog.syncDirecciones().catch(()=>[])
        ])

        if (!mounted) return
        setTipos(t || [])
        setVis(v || [])
        setEvtTipos(e || [])
        setAsisTipos(a || [])
        setSyncDirs(s || [])
      } catch (e) {
        if (mounted) setError(parseApiError(e))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return { loading, error, tipos, vis, evtTipos, asisTipos, syncDirs }
}

// ───────────────────────────────────────────────────────────────────────────────
// Mis calendarios (usa /calendars?scope=mine)
export function useMisCalendarios(params = {}) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  useEffect(()=> {
    let mounted = true
    ;(async ()=>{
      try {
        setLoading(true)
        const data = await calendarioApi.calendars.mine(params)
        if (mounted) setRows(data?.rows || data || [])
      } catch (e) {
        if (mounted) setError(parseApiError(e))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)])

  return { loading, error, rows, setRows }
}

// ───────────────────────────────────────────────────────────────────────────────
// Eventos (params correctos: start/end/calendario_ids) + refetch
export function useEventos({ from, to, calendarIds = [] }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!from || !to) return
    try {
      setLoading(true)
      const params = {
        start: from,
        end: to,
        // sólo enviar calendario_ids si hay selección real
        ...(calendarIds.length ? { calendario_ids: calendarIds.join(',') } : {})
      }
      const data = await calendarioApi.events.list(params)
      // el backend devuelve { events, overlays } → priorizamos .events
      setRows(data?.events || data?.rows || data || [])
    } catch (e) {
      setError(parseApiError(e))
    } finally {
      setLoading(false)
    }
  }, [from, to, calendarIds.join(',')])

  useEffect(() => { refetch() }, [refetch])

  return { loading, error, rows, setRows, refetch }
}

// ───────────────────────────────────────────────────────────────────────────────
// Board mensual (cursor)
export function useCalendarBoard(initDate = new Date()) {
  const [cursor, setCursor] = useState(new Date(initDate.getFullYear(), initDate.getMonth(), 1))
  const first = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor])
  const last  = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor])

  const from = useMemo(() => isoDate(first), [first])
  const to   = useMemo(() => isoDate(last),  [last])

  return {
    year: cursor.getFullYear(),
    monthIdx: cursor.getMonth(),
    from, to,
    setMonthIdx: (m) => setCursor(d => new Date(d.getFullYear(), m, 1)),
    prev: () => setCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)),
    next: () => setCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)),
    today: () => setCursor(new Date()),
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Google Bridge (cuenta, remotos, vínculos y acciones)
// Nota: tu backend no expone /calendario/google/account; manejamos sólo lo disponible.
// Si GET /calendario/google/calendars devuelve 400 => “sin cuenta” (lo tratamos suave).
export function useGoogleBridge(autoLoad = true) {
  const [loading, setLoading]   = useState(!!autoLoad)
  const [error, setError]       = useState(null)

  const [account, setAccount]   = useState(null)  // { email?, vinculos? } si en el futuro lo exponés
  const [locals, setLocals]     = useState([])    // calendarios locales del usuario
  const [remotes, setRemotes]   = useState([])    // calendarios de Google (si hay cuenta)
  const [vinculos, setVinculos] = useState([])    // canales/watch vinculados (si se expone)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // 1) locales (siempre)
      const mine = await calendarioApi.calendars.mine().catch(() => ({ rows: [] }))
      setLocals(mine?.rows || mine || [])

      // 2) remotos Google (puede fallar con 400 si no hay cuenta)
      try {
        const gcal = await calendarioApi.google.listCalendars()
        setRemotes(gcal?.rows || gcal?.items || gcal || [])
        // account/vínculos no existen hoy; dejamos placeholders limpios
        setAccount(prev => prev || null)
        setVinculos(prev => prev || [])
      } catch (e) {
        const pe = parseApiError(e)
        if (pe.status === 400) {
          // No hay cuenta conectada → UI debe ofrecer "Conectar Google"
          setRemotes([])
          setAccount(null)
          setVinculos([])
        } else {
          throw e
        }
      }
    } catch (e) {
      setError(parseApiError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (autoLoad) load() }, [autoLoad, load])

  // Acciones Google
  const connect = useCallback(() => {
    const url = calendarioApi.google.connectUrl()
    const w = window.open(url, '_blank', 'width=520,height=640')
    const timer = setInterval(() => {
      if (w?.closed) { clearInterval(timer); load() }
    }, 700)
  }, [load])

  const link = useCallback(async (calLocalId, googleId, direccion_codigo = 'both') => {
    await calendarioApi.google.link({
      calendario_local_id: calLocalId,
      google_calendar_id:  String(googleId),
      direccion_codigo
    })
    await load()
  }, [load])

  const syncOne = useCallback(async (calLocalId) => {
    await calendarioApi.google.syncOne(calLocalId)
    await load()
  }, [load])

  const startWatch = useCallback(async (calLocalId) => {
    await calendarioApi.google.startWatch(calLocalId)
    await load()
  }, [load])

  const stopWatch = useCallback(async (channel_id, resource_id) => {
    await calendarioApi.google.stopWatch(channel_id, resource_id)
    await load()
  }, [load])

  return {
    loading, error,
    account, locals, remotes, vinculos,
    reload: load,
    connect, link, syncOne, startWatch, stopWatch
  }
}
// ───────────────────────────────────────────────────────────────────────────────
// TODOS los calendarios (scope configurable)
export function useCalendarios(params = {}) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async ()=>{
      try {
        setLoading(true)
        const data = await calendarioApi.calendars.list({ scope:'all', ...params })
        if (mounted) setRows(data?.rows || data || [])
      } catch (e) { if (mounted) setError(parseApiError(e)) }
      finally { if (mounted) setLoading(false) }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)])

  return { loading, error, rows, setRows }
}