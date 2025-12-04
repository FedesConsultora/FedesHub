import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './ClienteCard.scss'

export default function ClienteCard({ c }) {
  const nav = useNavigate()
  const goTasks = () => nav(`/tareas?cliente_id=${c.id}`)
  const goClient = (e) => { e.stopPropagation(); nav(`/clientes/${c.id}`) }

  // Iniciales simples (fallback)
  const initials = (c.nombre || '').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()

  return (
    <article
      className="ClienteCard"
      role="button"
      tabIndex={0}
      onClick={goTasks}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goTasks()}
      aria-label={`Ver tareas de ${c.nombre}`}
      title="Click para ver tareas"
    >
      {/* layout: avatar | main | actions */}
      <div className="cardGrid">
        <div className="avatar" aria-hidden="true">{initials || 'C'}</div>

        <div className="main">
          <header className="head">
            <div className="name" onClick={goClient}>
              <strong>{c.nombre}</strong>{' '}
              {c.alias && <span className="muted" >({c.alias})</span>}
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
            <div className="line">
              Célula:{' '}
              <Link to={`/celulas/${c.celula_id}`} onClick={(e) => e.stopPropagation()}>
                {c.celula_nombre}
              </Link>
            </div>
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
          <button className="btn ghost" onClick={goClient}>Ver información</button>
          <button className="btn primary" onClick={goTasks} title="Ir a tareas">Ver tareas →</button>
        </aside>
      </div>
    </article>
  )
}
