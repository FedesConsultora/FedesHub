// frontend/src/components/comercial/LeadsTable.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import './LeadsTable.scss'

export default function LeadsTable({ rows, loading }) {
    if (loading) return <div className="leads-loading">Cargando leads...</div>
    if (!rows?.length) return <div className="leads-empty">No se encontraron leads.</div>

    return (
        <div className="LeadsTable card">
            <table>
                <thead>
                    <tr>
                        <th>Lead / Empresa</th>
                        <th>Responsable</th>
                        <th>Etapa</th>
                        <th>Estado</th>
                        <th>Última actividad</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {rows.map(lead => (
                        <tr key={lead.id}>
                            <td>
                                <Link to={`/comercial/leads/${lead.id}`} className="lead-name">
                                    {lead.empresa || `${lead.nombre} ${lead.apellido || ''}`}
                                    {lead.alias && <span className="alias">({lead.alias})</span>}
                                </Link>
                                <div className="lead-contact">{lead.email || lead.telefono}</div>
                            </td>
                            <td>{lead.responsable?.nombre || 'Sin asignar'}</td>
                            <td>
                                <span className="badge-etapa">{lead.etapa?.nombre}</span>
                            </td>
                            <td>
                                <span className="badge-status" style={{ backgroundColor: lead.status?.color }}>
                                    {lead.status?.nombre}
                                </span>
                            </td>
                            <td>{format(new Date(lead.updated_at), 'dd/MM/yyyy HH:mm')}</td>
                            <td>
                                <Link to={`/comercial/leads/${lead.id}`} className="btn-view">Ver</Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
