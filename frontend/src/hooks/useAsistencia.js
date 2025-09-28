// src/hooks/useAsistencia.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { asistenciaApi } from '../api/asistencia'

const isoNow = () => new Date().toISOString()
const pad = (n) => String(n).padStart(2, '0')

// HH:MM seguro aunque vengan NaN/undefined/strings
export const fmtHM = (minsLike) => {
  const mins = Math.max(0, Math.round(Number(minsLike) || 0))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${pad(h)}:${pad(m)}`
}

// HH:MM:SS seguro aunque vengan NaN/undefined/strings
export const fmtHMS = (secsLike) => {
  const s = Math.max(0, Math.floor(Number(secsLike) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${pad(h)}:${pad(m)}:${pad(ss)}`
}

const secsBetween = (fromIso, to = Date.now()) =>
  Math.max(0, Math.floor((new Date(to) - new Date(fromIso)) / 1000))

function todayRange() {
  const d = new Date()
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const end   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))
  return { desde: start.toISOString(), hasta: end.toISOString() }
}

export default function useAsistencia(pollMs = 20000) {
  const [open, setOpen] = useState(null)
  const [todaySeconds, setTodaySeconds] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const timer = useRef(null)
  const poller = useRef(null)

  const computeToday = useCallback(async () => {
    const { desde, hasta } = todayRange()
    const { rows = [] } = await asistenciaApi.me.list({ desde, hasta })
    // Si el backend trae segundos_trabajados, lo usamos. Si no, caemos a minutos*60.
    const totalSec = rows.reduce((acc, r) => {
      const secs = Number(r.segundos_trabajados)
      const mins = Number(r.minutos_trabajados)
      return acc + (Number.isFinite(secs) ? Math.max(0, Math.floor(secs)) : Math.max(0, Math.round(mins || 0) * 60))
    }, 0)
    setTodaySeconds(totalSec)
  }, [])

  const startTick = useCallback((atIso) => {
    if (timer.current) clearInterval(timer.current)
    if (!atIso) { setElapsedSec(0); return }
    setElapsedSec(secsBetween(atIso))
    timer.current = setInterval(() => setElapsedSec(secsBetween(atIso)), 1000)
  }, [])

  const stopTick = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setElapsedSec(0)
  }, [])

  const refresh = useCallback(async () => {
    const row = await asistenciaApi.me.open()
    setOpen(row)
    if (row?.check_in_at) startTick(row.check_in_at)
    else stopTick()
    await computeToday()
  }, [computeToday, startTick, stopTick])

  useEffect(() => {
    refresh()
    poller.current = setInterval(refresh, pollMs)
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(poller.current); poller.current = null
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVis)
      stopTick()
    }
  }, [pollMs, refresh, stopTick])

  const checkIn = useCallback(async (modalidad_codigo) => {
    await asistenciaApi.me.checkIn({
      at: isoNow(),
      origen_codigo: 'web',
      modalidad_codigo,
    })
    await refresh()
  }, [refresh])

  const checkOut = useCallback(async () => {
    await asistenciaApi.me.checkOut({ at: isoNow(), origen_codigo: 'web' })
    await refresh()
  }, [refresh])

  const isOpen = !!open
  const elapsedMins = useMemo(() => Math.floor(elapsedSec / 60), [elapsedSec])
  const todayMinutes = useMemo(() => Math.floor(todaySeconds / 60), [todaySeconds])

  return {
    open, isOpen,
    elapsedSec, elapsedMins,
    fmtElapsed: fmtHMS(elapsedSec),
    todaySeconds, todayMinutes,
    refresh,
    checkInOficina: () => checkIn('oficina'),
    checkInHome:    () => checkIn('remoto'),
    checkOut,
  }
}
