// /frontend/src/components/dashboard/MetricsGrid.jsx
import './metrics.scss'
import MetricCard from './MetricCard'

export default function MetricsGrid({ data }) {
  const metrics = data ?? { tareas_hoy: 2, tareas_semana: 3, clientes_activos: 1, eventos_prox: 2 }

  const items = [
    { k:'tareas_hoy',       label:'Tareas para hoy',  value: metrics.tareas_hoy ?? 0 },
    { k:'tareas_semana',    label:'Tareas semana',    value: metrics.tareas_semana ?? 0 },
    { k:'clientes_activos', label:'Clientes activos', value: metrics.clientes_activos ?? 0 },
    { k:'eventos_prox',     label:'Próximos eventos', value: metrics.eventos_prox ?? 0 },
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
