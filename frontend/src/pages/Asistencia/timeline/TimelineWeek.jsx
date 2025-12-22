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

export default function TimelineWeek({ payload }) {
  const grouped = groupByFederAndDay(payload.items)

  if (!grouped.length) {
    return <div className="timeline-week empty">Sin registros</div>
  }

  return (
    <div className="timeline-week">
      <table className="week-table">
        <thead>
          <tr>
            <th className="name-col">Persona</th>
            {WEEK_DAYS.map(d => (
              <th key={d.key} className={d.weekend ? 'weekend' : ''}>
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

                {WEEK_DAYS.map(d => {
                  const dayEntry = Object.values(f.days).find(
                    x => getDayKey(x.date) === d.key
                  )

                  const minutes = dayEntry?.minutes ?? 0
                  totalMinutes += minutes

                  return (
                    <td
                      key={d.key}
                      className={d.weekend ? 'weekend' : ''}
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
