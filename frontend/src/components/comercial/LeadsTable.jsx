import React from 'react'
import { format } from 'date-fns'
import { FiChevronRight, FiUser } from 'react-icons/fi'
import './LeadsTable.scss'

export default function LeadsTable({ leads = [], loading, onRowClick }) {
    if (loading) return <div className="leads-loading">Cargando leads...</div>

    return (
        <div className="LeadsTable">
            <table className="fh-table">
                <thead>
                    <tr>
                        <th>Empresa / Contacto</th>
                        <th>Responsable</th>
                        <th>Etapa</th>
                        <th>Estado</th>
                        <th>Actualizado</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {leads.map(lead => (
                        <tr key={lead.id} onClick={() => onRowClick?.(lead.id)} className="clickable-row">
                            <td>
                                <div className="lead-main-info">
                                    <span className="lead-empresa">
                                        {lead.empresa || `${lead.nombre} ${lead.apellido || ''}`}
                                    </span>
                                    {(lead.nombre && lead.empresa) && (
                                        <span className="lead-sub">
                                            <FiUser /> {lead.nombre} {lead.apellido}
                                        </span>
                                    )}
                                    <span className="lead-contact">{lead.email || lead.telefono || 'Sin contacto'}</span>
                                </div>
                            </td>
                            <td>
                                <div className="responsable-cell">
                                    {lead.responsable?.nombre || '—'}
                                </div>
                            </td>
                            <td>
                                <span className="badge-etapa">{lead.etapa?.nombre}</span>
                            </td>
                            <td>
                                <span className="badge-status" style={{ backgroundColor: lead.status?.color }}>
                                    {lead.status?.nombre}
                                </span>
                            </td>
                            <td>
                                <span className="date-cell">
                                    {format(new Date(lead.updated_at), 'dd/MM/yy HH:mm')}
                                </span>
                            </td>
                            <td className="actions-cell">
                                <FiChevronRight className="go-ico" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
