// frontend/src/components/comercial/LeadsKanban.jsx
import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import './LeadsKanban.scss'

export default function LeadsKanban({ rows, stages, loading }) {
    const columns = useMemo(() => {
        if (!stages) return []
        return stages.map(s => ({
            ...s,
            leads: rows.filter(r => r.etapa_id === s.id)
        }))
    }, [rows, stages])

    if (loading) return <div className="kanban-loading">Cargando pipeline...</div>

    return (
        <div className="LeadsKanban">
            {columns.map(col => (
                <div key={col.id} className="kanban-column">
                    <header>
                        <h3>{col.nombre}</h3>
                        <span className="count">{col.leads.length}</span>
                    </header>

                    <div className="kanban-cards">
                        {col.leads.map(lead => (
                            <Link to={`/comercial/leads/${lead.id}`} key={lead.id} className="kanban-card card">
                                <h4>{lead.empresa || `${lead.nombre} ${lead.apellido || ''}`}</h4>
                                <div className="card-footer">
                                    <span className="responsable">{lead.responsable?.nombre?.split(' ')[0]}</span>
                                    <span className="status-dot" style={{ backgroundColor: lead.status?.color }} title={lead.status?.nombre} />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
