// frontend/src/components/tasks/TaskHistory.jsx
import React, { useState, useEffect } from 'react'
import { tareasApi } from '../../api/tareas'
import './task-history.scss'

const TIPO_CAMBIO_LABELS = {
    estado: 'Estado',
    responsable: 'Responsable',
    colaborador: 'Colaborador',
    deadline: 'Fecha de vencimiento',
    fecha_inicio: 'Fecha de inicio',
    aprobacion: 'Aprobación',
    cliente: 'Cliente',
    hito: 'Hito',
    titulo: 'Título',
    descripcion: 'Descripción',
    impacto: 'Impacto',
    urgencia: 'Urgencia',
    etiqueta: 'Etiqueta',
    progreso: 'Progreso',
    archivado: 'Archivado',
    adjunto: 'Adjunto',
    relacion: 'Relación'
}

const ACCION_LABELS = {
    created: 'creó',
    updated: 'actualizó',
    deleted: 'eliminó',
    added: 'agregó',
    removed: 'quitó'
}

export default function TaskHistory({ taskId }) {
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState(null)
    const [page, setPage] = useState(0)
    const [total, setTotal] = useState(0)
    const limit = 20

    useEffect(() => {
        loadHistory()
    }, [taskId, filter, page])

    const loadHistory = async () => {
        try {
            setLoading(true)
            const params = {
                limit,
                offset: page * limit
            }
            if (filter) params.tipo_cambio = filter

            const data = await tareasApi.getHistorial(taskId, params)
            setHistory(data.rows || [])
            setTotal(data.total || 0)
        } catch (e) {
            console.error('Error loading history:', e)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        const date = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        return `${date} ${time}`
    }

    const renderValue = (value) => {
        if (!value) return <span className="empty">—</span>
        if (typeof value === 'object') {
            return <span className="value">{value.nombre || value.titulo || JSON.stringify(value)}</span>
        }
        return <span className="value">{String(value)}</span>
    }

    const totalPages = Math.ceil(total / limit)

    return (
        <div className="taskHistory">
            <div className="historyHeader">
                <h3>Historial de cambios</h3>
                <select
                    className="filterSelect"
                    value={filter || ''}
                    onChange={(e) => {
                        setFilter(e.target.value || null)
                        setPage(0)
                    }}
                >
                    <option value="">Todos los cambios</option>
                    {Object.entries(TIPO_CAMBIO_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="loading">Cargando historial...</div>
            ) : history.length === 0 ? (
                <div className="empty">No hay cambios registrados</div>
            ) : (
                <>
                    <div className="historyList">
                        {history.map((entry) => (
                            <div key={entry.id} className="historyEntry">
                                <div className="entryHeader">
                                    <div className="author">
                                        {entry.feder_avatar && (
                                            <img
                                                src={entry.feder_avatar}
                                                alt={`${entry.feder_nombre} ${entry.feder_apellido}`}
                                                className="avatar"
                                            />
                                        )}
                                        <span className="name">
                                            {entry.feder_nombre} {entry.feder_apellido}
                                        </span>
                                    </div>
                                    <span className="timestamp">{formatDate(entry.created_at)}</span>
                                </div>

                                <div className="entryBody">
                                    <div className="changeType">
                                        <span className="badge">{TIPO_CAMBIO_LABELS[entry.tipo_cambio] || entry.tipo_cambio}</span>
                                        <span className="action">{ACCION_LABELS[entry.accion] || entry.accion}</span>
                                    </div>

                                    {entry.descripcion && (
                                        <p className="description">{entry.descripcion}</p>
                                    )}

                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                disabled={page === 0}
                                onClick={() => setPage(p => p - 1)}
                            >
                                Anterior
                            </button>
                            <span className="pageInfo">
                                Página {page + 1} de {totalPages} ({total} cambios)
                            </span>
                            <button
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
