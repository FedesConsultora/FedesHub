// /frontend/src/components/dashboard/MetricsGrid.jsx
import './metrics.scss'
import MetricCard from './MetricCard'

export default function MetricsGrid({ data }) {
  const metrics = data ?? {
    tareas_pendientes: 0,
    tareas_en_curso: 0,
    tareas_en_revision: 0,
    tareas_aprobadas_semana: 0
  }

  const items = [
    { k: 'tareas_pendientes', label: 'Pendientes', value: metrics.tareas_pendientes || 0 },
    { k: 'tareas_en_curso', label: 'En Curso', value: metrics.tareas_en_curso || 0 },
    { k: 'tareas_en_revision', label: 'En Revisión', value: metrics.tareas_en_revision || 0 },
    { k: 'tareas_aprobadas_semana', label: 'Aprobadas esta semana', value: metrics.tareas_aprobadas_semana || 0 },
  ]

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
