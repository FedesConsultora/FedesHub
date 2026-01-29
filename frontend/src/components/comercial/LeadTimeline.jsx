import React, { useState, useRef } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    FiMessageSquare, FiActivity, FiPaperclip, FiX, FiPlus
} from 'react-icons/fi'
import './LeadTimeline.scss'

const linkify = (text = '') => {
    if (!text) return ''
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const withBr = escaped.replace(/\n/g, '<br/>')
    return withBr.replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
}

export default function LeadTimeline({ lead, onAddNota, showOnly = 'all' }) {
    const [nota, setNota] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [files, setFiles] = useState([])
    const [showComposer, setShowComposer] = useState(false)
    const fileInputRef = useRef(null)

    const handleSubmitNota = async (e) => {
        e.preventDefault()
        if (!nota.trim() && files.length === 0) return
        setSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('contenido', nota)
            files.forEach(f => formData.append('files', f))
            await onAddNota(formData)
            setNota('')
            setFiles([])
            setShowComposer(false)
        } finally {
            setSubmitting(false)
        }
    }

    const events = [
        ...(showOnly === 'all' || showOnly === 'notas' ? (lead.notas || []).map(n => ({ ...n, timelineType: 'nota' })) : []),
        ...(showOnly === 'all' || showOnly === 'history' ? (lead.historial || []).map(h => ({ ...h, timelineType: 'history' })) : [])
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return (
        <div className="LeadTimeline">
            {showOnly === 'notas' && (
                <div className="notas-header">
                    {!showComposer ? (
                        <button className="btn-add-note" onClick={() => setShowComposer(true)}>
                            <FiPlus /> Crear nota
                        </button>
                    ) : (
                        <button className="btn-cancel-note" onClick={() => setShowComposer(false)}>
                            <FiX /> Cancelar
                        </button>
                    )}
                </div>
            )}

            {showOnly === 'notas' && showComposer && (
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

                        {files.length > 0 && (
                            <div className="selected-files">
                                {files.map((f, idx) => (
                                    <div key={idx} className="file-tag">
                                        <FiPaperclip size={12} />
                                        <span className="ellipsis">{f.name}</span>
                                        <button type="button" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}><FiX size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="input-footer">
                            <div className="footer-left">
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const newFiles = Array.from(e.target.files)
                                        setFiles(prev => [...prev, ...newFiles])
                                        e.target.value = null
                                    }}
                                />
                                <button type="button" className="btn-attach" onClick={() => fileInputRef.current.click()}>
                                    <FiPaperclip /> Adjuntar archivos
                                </button>
                                <span className="hint">Ctrl + Enter para postear</span>
                            </div>
                            <button type="submit" className="btn-post" disabled={submitting || (!nota.trim() && files.length === 0)}>
                                {submitting ? 'Guardando...' : 'Postear Nota'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {showOnly === 'history' && (
                <div className="history-filters-bar">
                    <span className="history-count">{events.length} eventos registrados</span>
                    <button className="btn-full-history">
                        <FiActivity /> Ver historial completo
                    </button>
                </div>
            )}

            <div className="timeline-items">
                {events.length === 0 ? (
                    <div className="empty-history">
                        <FiActivity />
                        <p>{showOnly === 'history' ? 'No hay eventos en el historial.' : 'No hay notas aún.'}</p>
                    </div>
                ) : (
                    events.map((ev, i) => (
                        <div key={ev.id || i} className={`event-card ${ev.timelineType}`}>
                            {ev.timelineType === 'nota' ? (
                                <>
                                    <div className="event-icon"><FiMessageSquare /></div>
                                    <div className="event-content">
                                        <header>
                                            <div className="user-info">
                                                <div className="avatar">{ev.autor?.nombre?.charAt(0) || 'S'}</div>
                                                <span className="name">{ev.autor?.nombre || 'Sistema'}</span>
                                            </div>
                                            <span className="date">{format(new Date(ev.created_at), "d 'de' MMMM, HH:mm", { locale: es })}</span>
                                        </header>
                                        <div className="body">
                                            <div className="nota-text" dangerouslySetInnerHTML={{ __html: linkify(ev.contenido) }} />
                                            {ev.adjuntos?.length > 0 && (
                                                <div className="nota-attachments">
                                                    {ev.adjuntos.map(adj => (
                                                        <a key={adj.id} href={adj.url} target="_blank" rel="noreferrer" className="attachment-link">
                                                            <FiPaperclip />
                                                            <span>{adj.nombre_original}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="history-line">
                                    <span className="name">{ev.autor?.nombre || 'Sistema'}:</span>
                                    <span className="description">{ev.descripcion}</span>
                                    <span className="timestamp">{format(new Date(ev.created_at), "dd/MM HH:mm", { locale: es })}</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
