// frontend/src/components/clients/ClienteContactList.jsx
import React from 'react'
import '../../pages/Clientes/clienteDetail.scss'

export default function ClienteContactList({ contactos = [] }) {
  if (!contactos.length) return <div className="muted">Sin contactos</div>
  return (
    <ul className="contactos">
      {contactos.map(c => (
        <li key={c.id}>
          <div className="row">
            <strong>{c.nombre}</strong> {c.es_principal && <span className="tag">principal</span>}
          </div>
          <div className="muted">
            {c.cargo ? `${c.cargo} · ` : ''}{c.email || '—'}{c.telefono ? ` · ${c.telefono}` : ''}
          </div>
        </li>
      ))}
    </ul>
  )
}
