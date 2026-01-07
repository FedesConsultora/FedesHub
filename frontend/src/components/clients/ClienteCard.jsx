import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getContrastColor, getCleanInitials } from '../../utils/ui'
import './ClienteCard.scss'

export default function ClienteCard({ c }) {
  const nav = useNavigate()
  const goTasks = (e) => { e.stopPropagation(); nav(`/tareas?cliente_id=${c.id}`) }
  const goClient = () => nav(`/clientes/${c.id}`)

  const initials = getCleanInitials(c.nombre)
  const bgColor = c.color || '#3B82F6'
  const textColor = getContrastColor(bgColor)

  return (
    <article
      className="ClienteCard"
      role="button"
      tabIndex={0}
      onClick={goClient}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goClient()}
      aria-label={`Ver detalle de ${c.nombre}`}
      title="Click para ver información"
    >
      {/* layout: avatar | main | actions */}
      <div className="cardGrid">
        <div
          className="avatar"
          aria-hidden="true"
          style={{
            backgroundColor: bgColor,
            borderColor: bgColor,
            color: textColor
          }}
        >
          {initials}
        </div>

        <div className="main">
          <header className="head">
            <div className="name">
              <strong>{c.nombre}</strong>{' '}
              {c.alias && <span className="muted">({c.alias})</span>}
            </div>
            <div className="meta">
              {c.tipo_nombre && <span className="badge">{c.tipo_nombre}</span>}
              {c.estado_nombre && <span className={`badge ${c.estado_nombre?.toLowerCase()}`}>{c.estado_nombre}</span>}
              <span className="badge">Pond. {c.ponderacion ?? '—'}</span>
            </div>
          </header>

          <div className="row info">
            <div className="line muted">
              {c.email || '—'}{c.telefono ? ` · ${c.telefono}` : ''}
            </div>
            {/* Célula removed */}
          </div>

          <div className="row kpis">
            <div className="kpi">
              <div className="val">{c.tareas_abiertas ?? 0}</div>
              <div className="lbl">Abiertas</div>
            </div>
            <div className="kpi">
              <div className="val">{c.total_tareas ?? 0}</div>
              <div className="lbl">Totales</div>
            </div>
          </div>
        </div>

        <aside className="actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn ghost infoBtn" onClick={goClient}>Ver información</button>
          <button className="btn primary tasksBtn" onClick={goTasks} title="Ir a tareas">Ver tareas →</button>
        </aside>
      </div>
    </article>
  )
}
