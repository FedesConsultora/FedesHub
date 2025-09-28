// frontend/src/components/clients/ClienteTasksMini.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import '../../pages/Clientes/clienteDetail.scss'
export default function ClienteTasksMini({ tareas = [], clienteId }) {
  if (!tareas.length) return <div className="muted">Sin tareas</div>
  return (
    <>
      <ul className="tareas">
        {tareas.map(t => (
          <li key={t.id}>
            <Link to={`/tareas/${t.id}`} className="tTitle">{t.titulo}</Link>
            <div className="muted small">
              Estado: {t.estado_nombre || '—'} · Vence: {t.vencimiento ? new Date(t.vencimiento).toLocaleDateString() : '—'}
            </div>
          </li>
        ))}
      </ul>
      <div className="more">
        <Link to={`/tareas?cliente_id=${clienteId}`}>ver todas →</Link>
      </div>
    </>
  )
}
