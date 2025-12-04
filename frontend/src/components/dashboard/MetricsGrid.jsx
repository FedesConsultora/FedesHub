// /frontend/src/components/dashboard/MetricsGrid.jsx
import './metrics.scss'
import MetricCard from './MetricCard'

export default function MetricsGrid({ data }) {
  const metrics = data ?? { tareas_hoy: 2, tareas_semana: 3, clientes_activos: 1, reuniones_prox: 2, tareas_prioritarias: 2 }

  const items = [
    { k: 'tareas_prioritarias', label: 'Tareas prioritarias', value: metrics.tareas_prioritarias ?? 0 },
    { k: 'tareas_semana', label: 'Tareas semana', value: metrics.tareas_semana + metrics.tareas_hoy ?? 0 },
    { k: 'reuniones_prox', label: 'Próximas reuniones', value: metrics.eventos_prox ?? 0 },
  ]

  return (
    <section className="card mt16">
      <h3>Métricas rápidas</h3>
      <div className="metricsGrid">
        {items.map(m => (
          <MetricCard key={m.k} title={m.label} value={m.value} />
        ))}
      </div>
    </section>
  )
}
