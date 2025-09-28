import React from 'react'
import { Link } from 'react-router-dom'
import './ClientesTable.scss'

export default function ClientesTable({ rows, loading }) {
  return (
    <div className="ClientesTable tableWrap">
      <table className="clientes" aria-describedby="clientes-table-caption">
        <caption id="clientes-table-caption" className="srOnly">Resultados de clientes</caption>
        <thead>
          <tr>
            <th>Cliente</th><th>Célula</th><th>Tipo</th><th>Estado</th>
            <th className="num">Pond.</th><th className="num">Tareas (abiertas / total)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>
                <Link to={`/clientes/${r.id}`} className="name">
                  <strong>{r.nombre}</strong>{' '}{r.alias && <span className="muted">({r.alias})</span>}
                </Link>
                <div className="muted small">{r.email || '—'} {r.telefono ? ` · ${r.telefono}` : ''}</div>
              </td>
              <td>{r.celula_nombre}</td>
              <td>{r.tipo_nombre}</td>
              <td>{r.estado_nombre}</td>
              <td className="num">{r.ponderacion}</td>
              <td className="num">{r.tareas_abiertas ?? 0} / {r.total_tareas ?? 0}</td>
            </tr>
          ))}
          {!loading && rows.length === 0 && <tr><td colSpan={6} className="empty">Sin resultados</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
