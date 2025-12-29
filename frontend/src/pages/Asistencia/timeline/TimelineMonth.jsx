import { groupByFederAndDay } from "./timeline.utils"
import './timeline-month.scss'

export default function TimelineMonth({ payload, onNavigate, currentFecha }) {
    if (!payload?.items?.length) return null

    const yyyyMmDd = (date) => {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
    }
    const grouped = groupByFederAndDay(payload.items)

    const dateRef = new Date(currentFecha + 'T12:00:00') // Use midday to avoid TZ issues
    const year = dateRef.getFullYear()
    const month = dateRef.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const daysInMonth = lastDayOfMonth.getDate()

    // Día de la semana del primer día
    const startWeekday = firstDayOfMonth.getDay()

    // Array con todos los días del mes
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))

    // Construir calendario como filas de semanas
    const calendarCells = []
    // Celdas vacías antes del primer día
    for (let i = 0; i < startWeekday; i++) calendarCells.push(null)
    // Agregar días del mes
    monthDays.forEach(d => calendarCells.push(d))
    // Completar la última fila si no termina en sábado
    while (calendarCells.length % 7 !== 0) calendarCells.push(null)

    const monthName = dateRef.toLocaleString('es-AR', { month: 'long', year: 'numeric' })
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

    return (
        <div className="timeline-month">
            <div className="tm-month-name">{monthName}</div>

            {grouped.map(f => (
                <div key={f.feder_id} className="tm-person">
                    <h3 className="tm-name">{f.nombre}</h3>

                    {/* FILA DE DÍAS DE LA SEMANA */}
                    <div className="tm-weekdays">
                        {weekdays.map((wd, idx) => (
                            <div key={idx} className="tm-weekday">{wd}</div>
                        ))}
                    </div>

                    {/* CALENDARIO */}
                    <div className="tm-calendar">
                        {calendarCells.map((d, idx) => {
                            if (!d) return <div key={`empty-${idx}`} className="tm-day empty"></div>

                            const key = yyyyMmDd(d)
                            const minutes = f.days[key]?.minutes ?? 0
                            return (
                                <div
                                    key={key}
                                    className={`tm-day ${minutes ? 'has-data' : 'empty'} clickable`}
                                    title={minutes ? `${(minutes / 60).toFixed(2)} h` : 'Ver día'}
                                    onClick={() => onNavigate(key, 'day')}
                                >
                                    <span className="day-num">{d.getDate()}</span>
                                    {minutes > 0 && (
                                        <span className="day-hours">{(minutes / 60).toFixed(1)}h</span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
