import React from 'react'
import ClienteCard from './ClienteCard'
import './ClientesCards.scss'

export default function ClientesCards({ rows = [], loading }) {
  return (
    <div className="ClientesCards">
      {rows.map(c => <ClienteCard key={c.id} c={c} />)}
      {!loading && rows.length === 0 && <div className="empty">Sin resultados</div>}
    </div>
  )
}
