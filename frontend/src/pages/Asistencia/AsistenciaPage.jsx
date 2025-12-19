// src/pages/asistencia/AsistenciaPage.jsx
import { useEffect, useState } from 'react'
import usePermission from '../../hooks/usePermissions'
import { asistenciaApi } from '../../api/asistencia'
import TimelineDay from './timeline/TimelineDay'
import TimelineWeek from './timeline/TimelineWeek'
import TimelineMonth from './timeline/TimelineMonth'

import { GrNext, GrPrevious } from "react-icons/gr";

import './timeline/timeline.scss'

const getRange = (isoDate, view) => {
  const d = new Date(isoDate)

  if (view === 'day') {
    return { from: isoDate, to: isoDate }
  }

  if (view === 'week') {
    const day = d.getDay() || 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day - 1))

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
      from: monday.toISOString().slice(0, 10),
      to: sunday.toISOString().slice(0, 10),
    }
  }

  if (view === 'month') {
    const first = new Date(d.getFullYear(), d.getMonth(), 1)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)

    return {
      from: first.toISOString().slice(0, 10),
      to: last.toISOString().slice(0, 10),
    }
  }
}

export default function AsistenciaPage() {
  const { can } = usePermission()
  const canReport = can('asistencia', 'report')
  const [tab, setTab] = useState(canReport ? 'equipo' : 'mi')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [q, setQ] = useState('')
  const [view, setView] = useState('day');
  const TODAY = new Date().toISOString().slice(0, 10)


  const addByView = (isoDate, delta, view) => {
    const d = new Date(isoDate)

    if (view === 'day') d.setDate(d.getDate() + delta)
    if (view === 'week') d.setDate(d.getDate() + delta * 7)
    if (view === 'month') d.setMonth(d.getMonth() + delta)

    return d.toISOString().slice(0, 10)
  }

  const goPrevDay = () => setFecha(f => addByView(f, -1, view))
  const goNextDay = () => setFecha(f => addByView(f, 1, view))
  const goToday = () => setFecha(TODAY)




  useEffect(() => {
    if (!canReport && tab === 'equipo') setTab('mi')
  }, [canReport, tab])

  return (
    <div className="asst-page">
      <div className="asst-head fh-row">
        <h1 className="ttl">Asistencia</h1>
        <div className="grow" />
        {canReport && tab === 'equipo' && (
          <input
            className="fh-input"
            placeholder="Buscar persona…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        )}

        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="fh-input" />
        <select
          style={{ maxWidth: '200px' }}
          className="fh-input asst-view-select"
          value={view}
          onChange={e => setView(e.target.value)}
        >
          <option value="day">Ver por día</option>
          <option value="week">Ver por semana</option>
          <option value="month">Ver por mes</option>
        </select>

        <button
          type="button"
          className="fh-btn"
          onClick={goPrevDay}
          title="Día anterior"
        >
          <GrPrevious style={{ position: 'relative', top: '3px', marginRight: '2px' }} />
        </button>

        <button
          type="button"
          className="fh-btn fh-btn-today"
          onClick={goToday}
          disabled={fecha === TODAY}
        >
          Hoy
        </button>

        <button
          type="button"
          className="fh-btn"
          onClick={goNextDay}
          title="Día siguiente"
        >
          <GrNext style={{ position: 'relative', top: '3px', marginLeft: '2px' }} />
        </button>

      </div>

      <div className="asst-tabs">
        <button className={`tab ${tab === 'mi' ? 'active' : ''}`} onClick={() => setTab('mi')}>
          Mi asistencia
        </button>
        {canReport && (
          <button className={`tab ${tab === 'equipo' ? 'active' : ''}`} onClick={() => setTab('equipo')}>
            Equipo
          </button>
        )}
      </div>

      {tab === 'mi' && <TimelineWrapper view={view}
        fecha={fecha} scope="me" />}
      {tab === 'equipo' && canReport && <TimelineWrapper view={view} fecha={fecha} scope="global" q={q} />}
    </div>
  )
}

function TimelineWrapper({ fecha, scope, q = '', view }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)

    const range = getRange(fecha, view)

    const fn =
      view === 'day'
        ? scope === 'me'
          ? asistenciaApi.me.timelineDia
          : asistenciaApi.timelineDia
        : scope === 'me'
          ? asistenciaApi.me.timelineRango
          : asistenciaApi.timelineRango

    const params =
      view === 'day'
        ? { fecha }
        : { desde: range.from, hasta: range.to, q }


    if (typeof fn !== 'function') {
      alive && setError('Vista no disponible aún')
      alive && setLoading(false)
      return () => { alive = false }
    }

    fn(params)
      .then(d => alive && setData(d))
      .catch(e => {
        const status = e?.response?.status
        const msg = e?.response?.data?.message || e.message
        alive && setError(status ? `${status} · ${msg}` : msg)
      })
      .finally(() => alive && setLoading(false))

    return () => { alive = false }
  }, [fecha, scope, q, view])

  if (loading) return <div className="fh-skel">Cargando…</div>
  if (error) return <div className="fh-err">{error}</div>
  if (!data?.items?.length) return <div className="fh-empty">Sin registros.</div>

  if (view === 'day') {
    return <TimelineDay payload={data} startHour={5} />
  }

  if (view === 'week') {
    return <TimelineWeek payload={data} />
  }

  if (view === 'month') {
    return <TimelineMonth payload={data} />
  }

  return null
}

