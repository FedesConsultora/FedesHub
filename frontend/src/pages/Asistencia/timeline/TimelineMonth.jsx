import { groupByFederAndDay } from "./timeline.utils"
import './timeline-month.scss'

export default function TimelineMonth({ payload }) {
    if (!payload?.items?.length) return null

    const yyyyMmDd = (date) => date.toISOString().slice(0, 10)
    const grouped = groupByFederAndDay(payload.items)

    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()

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

    const monthName = today.toLocaleString('es-AR', { month: 'long', year: 'numeric' })
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
                                    className={`tm-day ${minutes ? 'has-data' : 'empty'}`}
                                    title={minutes ? `${(minutes / 60).toFixed(2)} h` : ''}
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
