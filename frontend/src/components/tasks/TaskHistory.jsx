import React, { useState, useEffect } from 'react'
import { tareasApi } from '../../api/tareas'
import GlobalLoader from '../loader/GlobalLoader.jsx'
import './task-history.scss'

const TIPO_CAMBIO_LABELS = {
    creacion: 'Creación',
    estado: 'Cambios de estado',
    cliente: 'Cambios de cliente',
    deadline: 'Cambios de deadline',
    adjunto: 'Carga de archivos',
    responsable: 'Responsable',
    colaborador: 'Colaborador'
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
                <div style={{ position: 'relative', minHeight: 150 }}>
                    <GlobalLoader size={80} />
                </div>
            ) : history.length === 0 ? (
                <div className="empty">No hay cambios registrados</div>
            ) : (
                <>
                    <div className="historyList">
                        {history.map((entry) => (
                            <div key={entry.id} className="historyEntry" >

                                <span className="name">
                                    {entry.feder_nombre} {entry.feder_apellido}:
                                </span>
                                <span className="description" >
                                    {entry.descripcion || `${ACCION_LABELS[entry.accion] || entry.accion} ${TIPO_CAMBIO_LABELS[entry.tipo_cambio] || entry.tipo_cambio}`}
                                </span>
                                <span className="timestamp">{formatDate(entry.created_at)}</span>
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
