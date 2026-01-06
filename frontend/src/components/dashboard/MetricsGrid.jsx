// /frontend/src/components/dashboard/MetricsGrid.jsx
import './metrics.scss'
import MetricCard from './MetricCard'

export default function MetricsGrid({ data }) {
  const metrics = data ?? { tareas_hoy: 0, tareas_periodo: 0, tareas_prioritarias: 0, notif_unread: 0, tareas_en_revision: 0, periodo: 'semana' }

  const items = [
    { k: 'tareas_prioritarias', label: 'Urgentes / Prioritarias', value: metrics.tareas_prioritarias || 0 },
    { k: 'tareas_periodo', label: `Pendientes (${metrics.periodo === 'mes' ? 'del mes' : 'esta semana'})`, value: metrics.tareas_periodo || 0 },
    { k: 'notif_unread', label: 'Mensajes sin leer', value: metrics.notif_unread || 0 },
  ]

  if (metrics.is_directivo) {
    items.unshift({ k: 'tareas_en_revision', label: 'En revisión (Global)', value: metrics.tareas_en_revision || 0 });
  }

  return (
    <section className="card mt16">
      <div className="metricsGrid">
        {items.map(m => (
          <MetricCard key={m.k} title={m.label} value={m.value} />
        ))}
      </div>
    </section>
  )
}
