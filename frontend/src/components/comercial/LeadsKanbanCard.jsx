// /frontend/src/components/comercial/LeadsKanbanCard.jsx
import React from 'react'
import { FiUser, FiClock, FiExternalLink, FiCheckCircle } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import ContextMenu from '../common/ContextMenu'

export default function LeadsKanbanCard({ lead, onPointerDown, onClick }) {
    const statusColor = lead.status?.color || '#94a3b8'

    const menuItems = [
        {
            label: 'Abrir Lead',
            icon: <FiExternalLink />,
            onClick: () => onClick?.(lead.id)
        }
    ]

    return (
        <ContextMenu items={menuItems}>
            <article
                className="fh-k-task leads-card"
                onPointerDown={onPointerDown}
                onClick={() => onClick?.(lead.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.(lead.id)}
            >
                <div className="fh-k-row">
                    <div className="fh-k-client" title={lead.empresa || 'Sin empresa'}>
                        {lead.empresa || 'Sin empresa'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                            className="fh-k-status-badge"
                            style={{
                                fontSize: '0.65rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: `${statusColor}15`,
                                color: statusColor,
                                border: `1px solid ${statusColor}30`,
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {lead.status?.nombre || '—'}
                        </div>
                        {lead.open_tasks_count > 0 && (
                            <div
                                title={`${lead.open_tasks_count} tareas pendientes`}
                                style={{
                                    fontSize: '0.65rem',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                }}
                            >
                                <FiCheckCircle style={{ fontSize: '0.7rem' }} /> {lead.open_tasks_count}
                            </div>
                        )}
                    </div>
                </div>

                <div className="fh-k-title" title={lead.nombre}>
                    {lead.nombre} {lead.apellido}
                </div>

                <div className="lead-meta-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div className="source-tag" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                        {lead.fuente?.nombre || '—'}
                    </div>
                    <div className="time-info" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiClock /> {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: es }).replace('hace ', '')}
                    </div>
                </div>

                <div className="fh-k-people" style={{ marginTop: '10px' }}>
                    <div className="fh-k-role">
                        <span className="fh-k-roleLabel">Resp.</span>
                        <div className="resp-avatar-mini" title={lead.responsable?.nombre}>
                            {lead.responsable?.nombre?.charAt(0) || '?'}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginLeft: '6px' }}>
                            {lead.responsable?.nombre?.split(' ')[0]}
                        </span>
                    </div>
                </div>
            </article>
        </ContextMenu >
    )
}
