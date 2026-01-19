import React, { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    FiMessageSquare, FiClock, FiPlusCircle, FiRepeat, FiCheckCircle,
    FiXCircle, FiArrowRight, FiUser, FiActivity
} from 'react-icons/fi'
import './LeadTimeline.scss'

export default function LeadTimeline({ lead, onAddNota }) {
    const [nota, setNota] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmitNota = async (e) => {
        e.preventDefault()
        if (!nota.trim()) return
        setSubmitting(true)
        try {
            await onAddNota(nota)
            setNota('')
        } finally {
            setSubmitting(false)
        }
    }

    const events = [
        ...(lead.notas || []).map(n => ({ ...n, timelineType: 'nota' })),
        ...(lead.historial || []).map(h => ({ ...h, timelineType: 'history' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return (
        <div className="LeadTimeline">
            <div className="timeline-header">
                <h3>Actividad y Notas</h3>
            </div>

            <form className="nota-input-area" onSubmit={handleSubmitNota}>
                <div className="input-box">
                    <textarea
                        placeholder="Agregar una nota o comentario..."
                        value={nota}
                        onChange={e => setNota(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmitNota(e)
                        }}
                    />
                    <div className="input-footer">
                        <span className="hint">Ctrl + Enter para postear</span>
                        <button type="submit" className="btn-post" disabled={submitting || !nota.trim()}>
                            {submitting ? 'Guardando...' : 'Postear Nota'}
                        </button>
                    </div>
                </div>
            </form>

            <div className="timeline-items">
                {events.length === 0 ? (
                    <div className="empty-history">
                        <FiActivity />
                        <p>No hay actividad registrada aún.</p>
                    </div>
                ) : (
                    events.map((ev, i) => (
                        <div key={ev.id || i} className={`event-card ${ev.timelineType}`}>
                            <div className="event-icon">
                                {ev.timelineType === 'nota' ? <FiMessageSquare /> : <HistoryIcon type={ev.tipo_evento} />}
                            </div>
                            <div className="event-content">
                                <header>
                                    <div className="user-info">
                                        <div className="avatar">
                                            {ev.autor?.nombre?.charAt(0) || 'S'}
                                        </div>
                                        <span className="name">{ev.autor?.nombre || 'Sistema'}</span>
                                    </div>
                                    <span className="date">
                                        {format(new Date(ev.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                                    </span>
                                </header>
                                <div className="body">
                                    {ev.timelineType === 'nota' ? (
                                        <div className="nota-text">{ev.contenido}</div>
                                    ) : (
                                        <div className="history-desc">{ev.descripcion}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function HistoryIcon({ type }) {
    switch (type) {
        case 'creacion': return <FiPlusCircle style={{ color: '#10b981' }} />
        case 'cambio_estado': return <FiRepeat style={{ color: '#3b82f6' }} />
        case 'cambio_etapa': return <FiArrowRight style={{ color: '#8b5cf6' }} />
        case 'negociacion_ganada': return <FiCheckCircle style={{ color: '#10b981' }} />
        case 'negociacion_perdida': return <FiXCircle style={{ color: '#ef4444' }} />
        case 'conversion_cliente': return <FiCheckCircle style={{ color: '#8b5cf6' }} />
        default: return <FiClock />
    }
}
