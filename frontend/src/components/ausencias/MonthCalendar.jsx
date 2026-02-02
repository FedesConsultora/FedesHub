import { useMemo, useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import './MonthCalendar.scss'

const two = n => String(n).padStart(2, '0')

export default function MonthCalendar({ year, month, rows = [], holidays = new Map(), onDayClick, onPrev, onNext, onRangeSelect }) {
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)

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

  const label = ((str) => str.charAt(0).toUpperCase() + str.slice(1))(new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' }))
  const today = new Date(); const todayStr = `${today.getFullYear()}-${two(today.getMonth() + 1)}-${two(today.getDate())}`

  const isSelected = (dateStr) => {
    if (!dragStart || !dragEnd) return false
    const d = new Date(dateStr + 'T00:00:00')
    const s = new Date(dragStart + 'T00:00:00')
    const e = new Date(dragEnd + 'T00:00:00')
    const min = s < e ? s : e
    const max = s < e ? e : s
    return d >= min && d <= max
  }

  const handleMouseDown = (dateStr) => {
    setDragStart(dateStr)
    setDragEnd(dateStr)
  }

  const handleMouseEnter = (dateStr) => {
    if (dragStart) setDragEnd(dateStr)
  }

  const handleMouseUp = () => {
    if (dragStart && dragEnd) {
      if (dragStart === dragEnd) {
        onDayClick?.(dragStart)
      } else {
        const s = new Date(dragStart + 'T00:00:00')
        const e = new Date(dragEnd + 'T00:00:00')
        const minDate = s < e ? dragStart : dragEnd
        const maxDate = s < e ? dragEnd : dragStart
        onRangeSelect?.(minDate, maxDate)
      }
    }
    setDragStart(null)
    setDragEnd(null)
  }

  return (
    <div className="aus-month-container" onMouseLeave={() => { setDragStart(null); setDragEnd(null) }}>
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
            const selected = isSelected(dateStr)
            const holidayName = holidays.get(dateStr)
            const isNonWorking = weekend || !!holidayName
            const showDetails = items.length > 0 && !isNonWorking

            return (
              <button
                className={`day ${showDetails ? 'busy' : ''} ${showDetails && pendientes.length ? 'has-pending' : ''} ${weekend ? 'wknd' : ''} ${isToday ? 'today' : ''} ${selected ? 'selected' : ''} ${holidayName ? 'is-holiday' : ''}`}
                key={idx}
                onMouseDown={() => handleMouseDown(dateStr)}
                onMouseEnter={() => handleMouseEnter(dateStr)}
                onMouseUp={handleMouseUp}
                title={(holidayName ? `Feriado: ${holidayName}\n` : '') + `${items.length || 0} ausencias`}
              >
                <span className="num">{d}</span>
                {showDetails && (
                  <>
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
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <button className="nav-btn next" onClick={onNext} title="Mes siguiente"><FaChevronRight /></button>
    </div>
  )
}
