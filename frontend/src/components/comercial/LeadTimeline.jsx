// frontend/src/components/comercial/LeadTimeline.jsx
import React, { useState } from 'react'
import { format } from 'date-fns'
import { FiMessageSquare, FiFileText, FiRefreshCw, FiCheckCircle, FiXCircle, FiTrendingUp } from 'react-icons/fi'
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
            <form className="nota-form card" onSubmit={handleSubmitNota}>
                <textarea
                    placeholder="Escribe una nota sobre este lead..."
                    value={nota}
                    onChange={e => setNota(e.target.value)}
                    rows={3}
                />
                <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={submitting || !nota.trim()}>
                        {submitting ? 'Guardando...' : 'Postear Nota'}
                    </button>
                </div>
            </form>

            <div className="timeline-list">
                {events.map((ev, i) => (
                    <div key={ev.id || i} className={`timeline-item ${ev.timelineType}`}>
                        <div className="timeline-icon">
                            {ev.timelineType === 'nota' && <FiMessageSquare />}
                            {ev.timelineType === 'history' && <HistoryIcon type={ev.tipo_evento} />}
                        </div>
                        <div className="timeline-content card">
                            <header>
                                <span className="autor">{ev.autor?.nombre || 'Sistema'}</span>
                                <span className="fecha">{format(new Date(ev.created_at), 'dd/MM/yyyy HH:mm')}</span>
                            </header>
                            <div className="body">
                                {ev.timelineType === 'nota' ? ev.contenido : ev.descripcion}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function HistoryIcon({ type }) {
    switch (type) {
        case 'cambio_estado': return <FiRefreshCw />
        case 'cambio_etapa': return <FiTrendingUp />
        case 'negociacion_ganada': return <FiCheckCircle style={{ color: '#10b981' }} />
        case 'negociacion_perdida': return <FiXCircle style={{ color: '#ef4444' }} />
        case 'conversion_cliente': return <FiCheckCircle style={{ color: '#8b5cf6' }} />
        default: return <FiFileText />
    }
}
