import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useClienteDetail } from './hooks/useClienteDetail'
import ClienteContactList from '../../components/clients/ClienteContactList'
import ClienteTasksMini from '../../components/clients/ClienteTasksMini'
import './clienteDetail.scss' // 👈 estilos locales a la página

export default function ClienteDetailPage() {
  const { id } = useParams()
  const { cliente, contactos, tareas, loading, error } = useClienteDetail(Number(id))

  if (loading) return (
    <div className="ClienteDetailPage"><div className="loading">Cargando…</div></div>
  )
  if (error) return (
    <div className="ClienteDetailPage"><div className="error">{error}</div></div>
  )
  if (!cliente) return null

  return (
    <div className="ClienteDetailPage">
      <header className="header">
        <div className="title">
          <h1>{cliente.nombre}</h1>
          {cliente.alias && <div className="alias">({cliente.alias})</div>}
        </div>

        <div className="meta">
          <span className="badge">{cliente.tipo_nombre}</span>
          <span className="badge">{cliente.estado_nombre}</span>
          <span className="badge">Pond. {cliente.ponderacion}</span>
          <Link to={`/celulas/${cliente.celula_id}`} className="link">{cliente.celula_nombre}</Link>
        </div>

        <div className="contactLine">
          <span>{cliente.email || '—'}</span>
          {cliente.telefono && <span> · {cliente.telefono}</span>}
          {cliente.sitio_web && (
            <a href={cliente.sitio_web} target="_blank" rel="noreferrer"> · sitio</a>
          )}
        </div>
      </header>

      <section className="stats">
        <div className="stat">
          <div className="kpi">{cliente.tareas_abiertas ?? 0}</div>
          <div className="label">Tareas abiertas</div>
        </div>
        <div className="stat">
          <div className="kpi">{cliente.total_tareas ?? 0}</div>
          <div className="label">Tareas totales</div>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Contactos</h2>
          <ClienteContactList contactos={contactos} />
        </div>

        <div className="panel">
          <h2>Tareas del cliente</h2>
          <ClienteTasksMini tareas={tareas} clienteId={cliente.id} />
        </div>
      </section>

      {!!(cliente.gerentes?.length) && (
        <section className="panel">
          <h2>“Tridente” / Roles de la célula</h2>
          <ul className="gerentes">
            {cliente.gerentes.map(g => (
              <li key={g.id}>
                <div className="row">
                  <strong>{g.apellido} {g.nombre}</strong>
                  <span className="muted"> · {g.rol_nombre}</span>
                  {g.es_principal && <span className="tag">principal</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
