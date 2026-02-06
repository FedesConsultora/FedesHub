import { useRef, useState, useMemo } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import './YearCalendar.scss'
const two = n => String(n).padStart(2, '0')

export default function YearCalendar({ year, monthIdx, setMonthIdx, byDate, holidays = new Map(), onDayClick, onRangeSelect }) {
  const scrollRef = useRef(null)
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)

  const scroll = (dir) => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const scrollAmount = container.clientWidth // Desplaza un "view" completo (3 meses)
    container.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
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
    <div className="aus-year-container" onMouseUp={handleMouseUp} onMouseLeave={() => { setDragStart(null); setDragEnd(null) }}>
      <button className="nav-btn prev" onClick={() => scroll('left')}><FaChevronLeft /></button>

      <div className="aus-year" ref={scrollRef}>
        {Array.from({ length: 12 }, (_, m) => (
          <Month key={m}
            year={year}
            month={m}
            active={m === monthIdx}
            setActive={() => setMonthIdx(m)}
            byDate={byDate}
            holidays={holidays}
            onDayClick={onDayClick}
            dragStart={dragStart}
            dragEnd={dragEnd}
            setDragStart={setDragStart}
            setDragEnd={setDragEnd}
          />
        ))}
      </div>

      <button className="nav-btn next" onClick={() => scroll('right')}><FaChevronRight /></button>
    </div>
  )
}

function Month({ year, month, active, setActive, byDate, holidays, dragStart, dragEnd, setDragStart, setDragEnd }) {
  const label = ((str) => str.charAt(0).toUpperCase() + str.slice(1))(new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' }))
  const cells = useMemo(() => {
    const arr = []
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const wd = (date.getDay() + 6) % 7 // 0=Mon, ..., 6=Sun
      if (wd < 5) {
        if (arr.length === 0) {
          for (let i = 0; i < wd; i++) arr.push(null)
        }
        arr.push(d)
      }
    }
    return arr
  }, [year, month])

  const today = new Date(); const t = `${today.getFullYear()}-${two(today.getMonth() + 1)}-${two(today.getDate())}`

  const isSelected = (dateStr) => {
    if (!dragStart || !dragEnd) return false
    const d = new Date(dateStr + 'T00:00:00')
    const s = new Date(dragStart + 'T00:00:00')
    const e = new Date(dragEnd + 'T00:00:00')
    const min = s < e ? s : e
    const max = s < e ? e : s
    return d >= min && d <= max
  }

  return (
    <div className={`aus-month ${active ? 'active' : ''}`} onMouseEnter={setActive}>
      <div className="hdr">{label}</div>
      <div className="dow">{['L', 'M', 'X', 'J', 'V'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="grid">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="day empty" />
          const dateStr = `${year}-${two(month + 1)}-${two(d)}`
          const hits = byDate.get(dateStr) || []
          const hasPending = hits.some(h => h.estado_codigo === 'pendiente')
          const hasDenied = hits.some(h => h.estado_codigo === 'denegada')
          const hasCanceled = hits.some(h => h.estado_codigo === 'cancelada')
          const hasApproved = hits.some(h => h.estado_codigo === 'aprobada')
          const statusCls = hasPending ? 'st-pendiente' : hasDenied ? 'st-denegada' : hasCanceled ? 'st-cancelada' : (hasApproved ? 'st-aprobada' : '')
          const isToday = (dateStr === t)
          const selected = isSelected(dateStr)
          const holidayName = holidays.get(dateStr)
          const isNonWorking = !!holidayName
          const showIndicators = hits.length > 0 && !isNonWorking

          return (
            <button
              key={idx}
              className={`day ${showIndicators ? 'busy' : ''} ${showIndicators ? statusCls : ''} ${showIndicators && hasPending ? 'has-pending' : ''} ${isToday ? 'today' : ''} ${selected ? 'selected' : ''} ${holidayName ? 'is-holiday' : ''}`}
              title={(holidayName ? `Feriado: ${holidayName}\n` : '') + hits.map(h => `${h.tipo_nombre} (${h.estado_codigo})`).join('\n')}
              onMouseDown={() => { setDragStart(dateStr); setDragEnd(dateStr) }}
              onMouseEnter={() => { if (dragStart) setDragEnd(dateStr) }}
            >
              <span className="num">{d}</span>
              {showIndicators && <span className="dots">{hits.length}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
