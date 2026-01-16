import { useRef } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import './YearCalendar.scss'
const two = n => String(n).padStart(2, '0')

export default function YearCalendar({ year, monthIdx, setMonthIdx, byDate, onDayClick }) {
  const scrollRef = useRef(null)

  const scroll = (dir) => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const scrollAmount = container.clientWidth // Desplaza un "view" completo (3 meses)
    container.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  return (
    <div className="aus-year-container">
      <button className="nav-btn prev" onClick={() => scroll('left')}><FaChevronLeft /></button>

      <div className="aus-year" ref={scrollRef}>
        {Array.from({ length: 12 }, (_, m) => (
          <Month key={m}
            year={year}
            month={m}
            active={m === monthIdx}
            setActive={() => setMonthIdx(m)}
            byDate={byDate}
            onDayClick={onDayClick}
          />
        ))}
      </div>

      <button className="nav-btn next" onClick={() => scroll('right')}><FaChevronRight /></button>
    </div>
  )
}

function Month({ year, month, active, setActive, byDate, onDayClick }) {
  const label = ((str) => str.charAt(0).toUpperCase() + str.slice(1))(new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' }))
  const first = new Date(year, month, 1)
  const startWeekDay = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const today = new Date(); const t = `${today.getFullYear()}-${two(today.getMonth() + 1)}-${two(today.getDate())}`

  return (
    <div className={`aus-month ${active ? 'active' : ''}`} onMouseEnter={setActive}>
      <div className="hdr">{label}</div>
      <div className="dow">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="grid">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="day empty" />
          const dateStr = `${year}-${two(month + 1)}-${two(d)}`
          const hits = byDate.get(dateStr) || []
          const hasPending = hits.some(h => h.estado_codigo === 'pendiente')
          const hasDenied = hits.some(h => h.estado_codigo === 'denegada')
          const hasCanceled = hits.some(h => h.estado_codigo === 'cancelada')
          const hasApproved = hits.some(h => h.estado_codigo === 'aprobada')
          // prioridad visual: pendiente > denegada > cancelada > aprobada
          const statusCls = hasPending ? 'st-pendiente' : hasDenied ? 'st-denegada' : hasCanceled ? 'st-cancelada' : (hasApproved ? 'st-aprobada' : '')
          const wd = new Date(year, month, d).getDay()
          const weekend = (wd === 0 || wd === 6)
          const isToday = (dateStr === t)
          return (
            <button
              key={idx}
              className={`day ${hits.length ? 'busy' : ''} ${statusCls} ${hasPending ? 'has-pending' : ''} ${weekend ? 'wknd' : ''} ${isToday ? 'today' : ''}`}
              title={hits.map(h => `${h.tipo_nombre} (${h.estado_codigo})`).join('\n')}
              onClick={() => onDayClick?.(dateStr)}
            >
              <span className="num">{d}</span>
              {!!hits.length && <span className="dots">{hits.length}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}