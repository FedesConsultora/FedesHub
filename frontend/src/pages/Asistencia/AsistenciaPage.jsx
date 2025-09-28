// src/pages/asistencia/AsistenciaPage.jsx
import { useEffect, useState } from 'react'
import usePermission from '../../hooks/usePermissions'
import { asistenciaApi } from '../../api/asistencia'
import TimelineDay from './timeline/TimelineDay'
import './timeline/timeline.scss'

export default function AsistenciaPage() {
  const { can } = usePermission()
  const canReport = can('asistencia','report')
  const [tab, setTab] = useState(canReport ? 'equipo' : 'mi')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10))
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!canReport && tab === 'equipo') setTab('mi')
  }, [canReport, tab])

  return (
    <div className="asst-page">
      <div className="asst-head fh-row">
        <h1 className="ttl">Asistencia</h1>
        <div className="grow" />
        {canReport && tab==='equipo' && (
          <input
            className="fh-input"
            placeholder="Buscar persona…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        )}
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="fh-input" />
      </div>

      <div className="asst-tabs">
        <button className={`tab ${tab==='mi' ? 'active' : ''}`} onClick={() => setTab('mi')}>
          Mi asistencia
        </button>
        {canReport && (
          <button className={`tab ${tab==='equipo' ? 'active' : ''}`} onClick={() => setTab('equipo')}>
            Equipo
          </button>
        )}
      </div>

      {tab === 'mi'      && <TimelineWrapper fecha={fecha} scope="me"   />}
      {tab === 'equipo'  && canReport && <TimelineWrapper fecha={fecha} scope="global" q={q} />}
    </div>
  )
}

function TimelineWrapper({ fecha, scope, q='' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true); setError(null)

    const fn = scope === 'me' ? asistenciaApi.me.timelineDia : asistenciaApi.timelineDia
    const params = scope === 'me' ? { fecha } : { fecha, q }

    fn(params)
      .then(d => alive && setData(d))
      .catch(e => {
        const status = e?.response?.status
        const msg = e?.response?.data?.message || e.message
        alive && setError(status ? `${status} · ${msg}` : msg)
      })
      .finally(() => alive && setLoading(false))

    return () => { alive = false }
  }, [fecha, scope, q])

  if (loading) return <div className="fh-skel">Cargando…</div>
  if (error)   return <div className="fh-err">{error}</div>
  if (!data?.items?.length) return <div className="fh-empty">Sin registros.</div>

  return <TimelineDay payload={data} startHour={5} />
}