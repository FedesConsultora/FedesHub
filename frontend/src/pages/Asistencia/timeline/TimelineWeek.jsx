import { groupByFederAndDay } from './timeline.utils'
import './timeline-week.scss'

const WEEK_DAYS = [
  { key: 1, label: 'Lun' },
  { key: 2, label: 'Mar' },
  { key: 3, label: 'Mié' },
  { key: 4, label: 'Jue' },
  { key: 5, label: 'Vie' },
  { key: 6, label: 'Sáb', weekend: true },
  { key: 0, label: 'Dom', weekend: true },
]

const getDayKey = (yyyyMmDd) => {
  const d = new Date(`${yyyyMmDd}T00:00:00`)
  return d.getDay()
}

export default function TimelineWeek({ payload, onNavigate, currentFecha }) {
  const grouped = groupByFederAndDay(payload.items)

  const getWeekDaysWithDates = () => {
    const d = new Date(currentFecha + 'T12:00:00')
    const day = d.getDay() || 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day - 1))

    return WEEK_DAYS.map(wd => {
      const date = new Date(monday)
      // Lun=1, Mar=2... Sab=6, Dom=0 (7)
      const offset = wd.key === 0 ? 6 : wd.key - 1
      date.setDate(monday.getDate() + offset)
      return { ...wd, dateIso: date.toISOString().slice(0, 10) }
    })
  }

  const daysWithDates = getWeekDaysWithDates()

  if (!grouped.length) {
    return <div className="timeline-week empty">Sin registros</div>
  }

  return (
    <div className="timeline-week">
      <table className="week-table">
        <thead>
          <tr>
            <th className="name-col">Persona</th>
            {daysWithDates.map(d => (
              <th
                key={d.key}
                className={`${d.weekend ? 'weekend' : ''} clickable-header`}
                onClick={() => onNavigate(d.dateIso, 'day')}
                title={`Ver día ${d.dateIso}`}
              >
                {d.label}
              </th>
            ))}
            <th className="total-col">Total</th>
          </tr>
        </thead>

        <tbody>
          {grouped.map(f => {
            let totalMinutes = 0

            return (
              <tr key={f.feder_id}>
                <td className="name-col">{f.nombre}</td>

                {daysWithDates.map(d => {
                  const dayEntry = Object.values(f.days).find(
                    x => x.date === d.dateIso
                  )

                  const minutes = dayEntry?.minutes ?? 0
                  totalMinutes += minutes

                  return (
                    <td
                      key={d.key}
                      className={`${d.weekend ? 'weekend' : ''} clickable-cell ${minutes > 0 ? 'has-data' : ''}`}
                      onClick={() => onNavigate(d.dateIso, 'day')}
                      title={`Ver día ${d.dateIso}`}
                    >
                      {(minutes / 60).toFixed(2)} h
                    </td>
                  )
                })}

                <td className="total-col">
                  {(totalMinutes / 60).toFixed(2)} h
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
