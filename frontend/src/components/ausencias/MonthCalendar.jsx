// src/components/ausencias/MonthCalendar.jsx
import { useMemo } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import './MonthCalendar.scss'

const two = n => String(n).padStart(2, '0')

export default function MonthCalendar({ year, month, rows = [], onDayClick, onPrev, onNext }) {
  const first = new Date(year, month, 1)
  const startWeekDay = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const map = useMemo(() => {
    const m = new Map()
    for (const r of rows) {
      const d1 = new Date(r.fecha_desde + 'T00:00:00')
      const d2 = new Date(r.fecha_hasta + 'T00:00:00')
      let d = new Date(Math.max(d1, new Date(year, month, 1)))
      const end = new Date(Math.min(d2, new Date(year, month + 1, 0)))
      while (d <= end) {
        const k = `${year}-${two(month + 1)}-${two(d.getDate())}`
        const arr = m.get(k) || []
        arr.push(r)
        m.set(k, arr)
        d = new Date(d.getTime() + 86400000)
      }
    }
    return m
  }, [rows, year, month])

  const label = new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })
  const today = new Date(); const todayStr = `${today.getFullYear()}-${two(today.getMonth() + 1)}-${two(today.getDate())}`

  return (
    <div className="aus-month-container">
      <button className="nav-btn prev" onClick={onPrev} title="Mes anterior"><FaChevronLeft /></button>

      <div className="aus-month-view">
        <div className="title">{label}</div>
        <div className="dow">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="grid">
          {cells.map((d, idx) => {
            if (!d) return <div key={idx} className="day empty" />
            const dateStr = `${year}-${two(month + 1)}-${two(d)}`
            const items = map.get(dateStr) || []
            const aprobadas = items.filter(i => i.estado_codigo === 'aprobada')
            const pendientes = items.filter(i => i.estado_codigo === 'pendiente')
            const denegadas = items.filter(i => i.estado_codigo === 'denegada')
            const canceladas = items.filter(i => i.estado_codigo === 'cancelada')
            const wd = new Date(year, month, d).getDay()
            const weekend = (wd === 0 || wd === 6)
            const isToday = (dateStr === todayStr)
            return (
              <button
                className={`day ${items.length ? 'busy' : ''} ${pendientes.length ? 'has-pending' : ''} ${weekend ? 'wknd' : ''} ${isToday ? 'today' : ''}`}
                key={idx}
                onClick={() => onDayClick?.(dateStr)}
                title={`${items.length || 0} ausencias`}
              >
                <span className="num">{d}</span>
                <div className="tags">
                  {!!aprobadas.length && <span className="tag ok">{aprobadas.length}</span>}
                  {!!pendientes.length && <span className="tag warn">{pendientes.length}</span>}
                  {!!denegadas.length && <span className="tag err">{denegadas.length}</span>}
                  {!!canceladas.length && <span className="tag cancel">{canceladas.length}</span>}
                </div>
                {items.slice(0, 3).map((r, i) => (
                  <div key={i} className={`chip ${r.estado_codigo}`}>
                    {r.tipo_nombre}
                  </div>
                ))}
                {items.length > 3 && <div className="more">+{items.length - 3} más…</div>}
              </button>
            )
          })}
        </div>
      </div>

      <button className="nav-btn next" onClick={onNext} title="Mes siguiente"><FaChevronRight /></button>
    </div>
  )
}
