// src/pages/asistencia/timeline/TimelineDay.jsx
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { formatDuration } from './timeline.utils'
import AttendanceBadge from '../../../components/common/AttendanceBadge.jsx'
import useAttendanceStatus, { getModalidad } from '../../../hooks/useAttendanceStatus.js'

// ... (helpers)
const minsFromMidnight = (iso) => {
  const d = new Date(iso)
  const midnight = new Date(d); midnight.setHours(0, 0, 0, 0)
  return (d - midnight) / 60000
}
const pctOfDay = (mins) => (mins / 1440) * 100
const isTodayLocal = (yyyyMmDd) => {
  const now = new Date()
  const d = new Date(`${yyyyMmDd}T00:00:00`)
  return now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth() && now.getDate() === d.getDate()
}
const nowMinsLocal = () => {
  const n = new Date(); const m = new Date(n); m.setHours(0, 0, 0, 0)
  return (n - m) / 60000
}
const toH = (m) => formatDuration(m)
const two = (n) => String(n).padStart(2, '0')
const fmtRange = (sIso, eIso) => {
  const s = new Date(sIso); const e = new Date(eIso)
  return `${two(s.getHours())}:${two(s.getMinutes())}–${two(e.getHours())}:${two(e.getMinutes())}`
}

export default function TimelineDay({ payload, startHour = 5 }) {
  const fecha = payload?.fecha
  const jornada_min = payload?.jornada_min ?? 480
  const items = payload?.items ?? []
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])

  const federIds = useMemo(
    () => Array.isArray(items) ? items.map(p => p.feder_id) : [],
    [items]
  )

  const { statuses } = useAttendanceStatus(federIds)

  // refs
  const rootRef = useRef(null)     // scroller
  const hoursRef = useRef(null)     // header
  const cellRef = useRef(null)     // para medir ancho de 1 hora

  // Medimos header y lo reservamos
  useLayoutEffect(() => {
    const elRoot = rootRef.current
    const elHours = hoursRef.current
    if (!elRoot || !elHours) return
    const applyHeaderHeight = () => {
      const h = elHours.getBoundingClientRect().height || 34
      elRoot.style.setProperty('--tl-hours-h', `${Math.ceil(h)}px`)
    }
    applyHeaderHeight()
    const ro = new ResizeObserver(applyHeaderHeight)
    ro.observe(elHours)
    return () => ro.disconnect()
  }, [])

  // Scroll inicial a startHour (p. ej., 5:00)
  useEffect(() => {
    const elRoot = rootRef.current
    if (!elRoot) return
    const go = () => {
      const styles = getComputedStyle(elRoot)
      const fixedCol = parseFloat(styles.getPropertyValue('--tl-fixed-col')) || 220
      const anyCell = cellRef.current || elRoot.querySelector('.track-cell')
      const hourW = anyCell ? anyCell.getBoundingClientRect().width : 36
      const target = Math.max(0, fixedCol + hourW * startHour)
      elRoot.scrollLeft = Math.min(target, elRoot.scrollWidth - elRoot.clientWidth)
    }
    requestAnimationFrame(go)
    const ro = new ResizeObserver(() => requestAnimationFrame(go))
    ro.observe(elRoot)
    return () => ro.disconnect()
  }, [startHour, items?.length])

  return (
    <div className="timeline-root" ref={rootRef} role="region" aria-label="Línea de tiempo de asistencia">
      <div className="timeline-meta">
        <span>Fecha: <b>{fecha}</b></span>
        <span>Jornada objetivo: <b>{Math.round(jornada_min / 60)} h</b></span>
        <span className="muted">Vista desplazada a partir de <b>{two(startHour)}:00</b></span>
      </div>

      {/* CABECERA DE HORAS (fila propia; sticky) */}
      <div className="timeline-hours sticky-top" ref={hoursRef}>
        <div className="person-col" />
        {hours.map(h => <div key={h} className="hour-cell">{h}:00</div>)}
      </div>

      {/* CUERPO: respeta el alto del header con padding-top */}
      <div className="timeline-body">
        {items.map((p, idx) => {
          const obj = p.resumen ?? { worked_min: 0, jornada_min }
          const faltan = Math.max(0, obj.jornada_min - obj.worked_min)
          const pct = Math.min(1, obj.worked_min / obj.jornada_min)

          return (
            <div key={p.feder_id} className={`timeline-row ${idx % 2 ? 'odd' : ''}`}>
              {/* Col fija izquierda */}
              <div className="person-col sticky-left">
                <div className="person-name-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  <div className="person-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.feder_apellido ?? p.apellido}, {p.feder_nombre ?? p.nombre}
                  </div>
                  <div style={{ position: 'relative', width: '16px', height: '16px', flexShrink: 0 }}>
                    <AttendanceBadge modalidad={getModalidad(statuses, p.feder_id)} size={16} />
                  </div>
                </div>
                <div className="person-progress"><div className="bar" style={{ width: `${pct * 100}%` }} /></div>
                <div className="person-meta">
                  <span>{toH(obj.worked_min)} / {toH(obj.jornada_min)}</span>
                  {faltan > 0 ? <span className="warn"> · faltan {toH(faltan)}</span> : <span className="ok"> · completo</span>}
                </div>
              </div>

              {/* Pista (24h) + overlay de bloques */}
              <div className="track-layer">
                <div className="cells">
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="track-cell"
                      ref={i === 0 ? cellRef : null}
                    >
                      <i />
                    </div>
                  ))}
                </div>

                <div className="blocks-layer">
                  {(p.bloques ?? []).map(b => {
                    const s = minsFromMidnight(b.start)
                    const e = minsFromMidnight(b.end)
                    const w = Math.max(0, e - s)
                    return (
                      <div
                        key={b.id}
                        className={`block ${b.abierto ? 'open' : ''}`}
                        style={{ left: `${pctOfDay(s)}%`, width: `${pctOfDay(w)}%` }}
                        title={`${fmtRange(b.start, b.end)}${b.abierto ? ' · abierto' : ''}`}
                      >
                        <span className="label">{fmtRange(b.start, b.end)}{b.abierto ? ' •' : ''}</span>
                      </div>
                    )
                  })}

                  {isTodayLocal(fecha) && (
                    <div className="now-line" style={{ left: `${pctOfDay(nowMinsLocal())}%` }}>
                      <div className="now-dot" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}