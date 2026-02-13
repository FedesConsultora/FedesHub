import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiTrash2 } from 'react-icons/fi'
import { gastosApi } from '../../api/gastos'
import { format } from 'date-fns'
import { useAuthCtx } from '../../context/AuthContext'
import { useToast } from '../../components/toast/ToastProvider'
import Modal from '../../components/ui/Modal'
import './gastos.scss'

const DIRECTIVO_ROLES = ['NivelA', 'NivelB', 'Directivo', 'RRHH']

export default function GastoDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const toast = useToast()
    const { roles, user } = useAuthCtx() || {}
    const isDirectivo = (roles || []).some(r => DIRECTIVO_ROLES.includes(r))

    // Modals
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectMotivo, setRejectMotivo] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Inline edit state — one field at a time
    const [editingField, setEditingField] = useState(null) // 'monto' | 'moneda' | 'fecha' | 'descripcion'
    const [editValue, setEditValue] = useState('')

    const { data: gasto, isLoading } = useQuery({
        queryKey: ['gasto', id],
        queryFn: () => gastosApi.getById(id)
    })

    const updateMutation = useMutation({
        mutationFn: (body) => gastosApi.update(id, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gasto', id] })
            queryClient.invalidateQueries({ queryKey: ['gastos'] })
            queryClient.invalidateQueries({ queryKey: ['gastos-summary'] })
            toast?.success('Gasto actualizado')
            setEditingField(null)
        },
        onError: (err) => toast?.error(err?.fh?.message || 'Error al actualizar')
    })

    const statusMutation = useMutation({
        mutationFn: (body) => gastosApi.updateStatus(id, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gasto', id] })
            queryClient.invalidateQueries({ queryKey: ['gastos'] })
            queryClient.invalidateQueries({ queryKey: ['gastos-summary'] })
            toast?.success('Estado actualizado')
            setShowRejectModal(false)
            setRejectMotivo('')
        },
        onError: (err) => toast?.error(err?.fh?.message || 'Error al cambiar estado')
    })

    const deleteMutation = useMutation({
        mutationFn: () => gastosApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gastos'] })
            queryClient.invalidateQueries({ queryKey: ['gastos-summary'] })
            toast?.success('Gasto eliminado')
            navigate('/gastos')
        },
        onError: (err) => toast?.error(err?.fh?.message || 'Error al eliminar')
    })

    if (isLoading) return (
        <div className="gastos-page">
            <div className="gastos-loader-overlay" style={{ position: 'relative', minHeight: '300px' }}>
                <div className="gastos-spinner"><div className="spinner-ring" /><span>Cargando gasto...</span></div>
            </div>
        </div>
    )
    if (!gasto) return <div className="gastos-page"><div className="detail-loading">Gasto no encontrado</div></div>

    const isOwner = user?.feder_id === gasto.feder_id
    const canEdit = isOwner
    const canDelete = isOwner && !isDirectivo

    const handleReject = () => {
        if (!rejectMotivo.trim()) return
        statusMutation.mutate({ estado: 'rechazado', motivo: rejectMotivo })
    }

    const startEdit = (field) => {
        setEditingField(field)
        if (field === 'fecha') {
            setEditValue(gasto.fecha ? gasto.fecha.split('T')[0] : '')
        } else {
            setEditValue(gasto[field] || '')
        }
    }

    const saveEdit = () => {
        if (!editingField) return
        const body = { [editingField]: editValue }
        updateMutation.mutate(body)
    }

    const cancelEdit = () => {
        setEditingField(null)
        setEditValue('')
    }

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

    return (
        <div className="gastos-page">
            <div className="detail-top-bar">
                <button className="fh-btn" onClick={() => navigate('/gastos')}>← Volver</button>
            </div>

            <div className="gasto-detail-card">
                {/* Header: Gasto title + estado + trash */}
                <div className="detail-header">
                    <h2>Gasto: {gasto.descripcion || `#${gasto.id}`}</h2>
                    <div className="detail-header-right">
                        <span className={`status-badge lg ${gasto.estado}`}>{gasto.estado}</span>
                        {canDelete && (
                            <button
                                className="icon-btn trash"
                                onClick={() => setShowDeleteConfirm(true)}
                                title="Eliminar gasto"
                            ><FiTrash2 size={16} /></button>
                        )}
                    </div>
                </div>

                {/* Solicitante */}
                {gasto.feder && (
                    <div className="detail-section">
                        <span className="detail-label">Solicitante</span>
                        <div className="detail-solicitante">
                            {gasto.feder.avatar_url && <img src={gasto.feder.avatar_url} alt="" className="solicitante-avatar" />}
                            <span className="detail-value">{gasto.feder.nombre} {gasto.feder.apellido}</span>
                        </div>
                    </div>
                )}

                {/* Editable fields */}
                <div className="detail-grid">
                    {/* Fecha */}
                    <div className="detail-field">
                        <span className="detail-label">
                            Fecha
                            {canEdit && editingField !== 'fecha' && (
                                <button className="inline-edit-btn" onClick={() => startEdit('fecha')} title="Editar fecha">✏️</button>
                            )}
                        </span>
                        {editingField === 'fecha' ? (
                            <div className="inline-edit-row">
                                <input type="date" className="fh-input" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                                <button className="inline-save" onClick={saveEdit}>✓</button>
                                <button className="inline-cancel" onClick={cancelEdit}>✕</button>
                            </div>
                        ) : (
                            <span className="detail-value">{gasto.fecha ? format(new Date(gasto.fecha), 'dd/MM/yyyy') : '-'}</span>
                        )}
                    </div>

                    {/* Monto */}
                    <div className="detail-field">
                        <span className="detail-label">
                            Monto
                            {canEdit && editingField !== 'monto' && (
                                <button className="inline-edit-btn" onClick={() => startEdit('monto')} title="Editar monto">✏️</button>
                            )}
                        </span>
                        {editingField === 'monto' ? (
                            <div className="inline-edit-row">
                                <input type="number" className="fh-input" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus step="0.01" />
                                <button className="inline-save" onClick={saveEdit}>✓</button>
                                <button className="inline-cancel" onClick={cancelEdit}>✕</button>
                            </div>
                        ) : (
                            <span className="detail-value accent">${parseFloat(gasto.monto).toLocaleString()} {gasto.moneda}</span>
                        )}
                    </div>

                    {/* Moneda */}
                    <div className="detail-field">
                        <span className="detail-label">
                            Moneda
                            {canEdit && editingField !== 'moneda' && (
                                <button className="inline-edit-btn" onClick={() => startEdit('moneda')} title="Editar moneda">✏️</button>
                            )}
                        </span>
                        {editingField === 'moneda' ? (
                            <div className="inline-edit-row">
                                <select className="fh-input" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus>
                                    <option value="ARS">ARS</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                                <button className="inline-save" onClick={saveEdit}>✓</button>
                                <button className="inline-cancel" onClick={cancelEdit}>✕</button>
                            </div>
                        ) : (
                            <span className="detail-value">{gasto.moneda}</span>
                        )}
                    </div>
                </div>

                {/* Descripcion */}
                <div className="detail-section">
                    <span className="detail-label">
                        Descripción
                        {canEdit && editingField !== 'descripcion' && (
                            <button className="inline-edit-btn" onClick={() => startEdit('descripcion')} title="Editar descripción">✏️</button>
                        )}
                    </span>
                    {editingField === 'descripcion' ? (
                        <div className="inline-edit-row" style={{ marginTop: '6px' }}>
                            <textarea
                                className="fh-input"
                                style={{ height: 'auto', minHeight: '80px', resize: 'vertical', padding: '10px 14px', flex: 1 }}
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                autoFocus
                            />
                            <button className="inline-save" onClick={saveEdit}>✓</button>
                            <button className="inline-cancel" onClick={cancelEdit}>✕</button>
                        </div>
                    ) : (
                        <div className="detail-description">{gasto.descripcion}</div>
                    )}
                </div>

                {/* Adjuntos */}
                {gasto.adjuntos?.length > 0 && (
                    <div className="detail-section">
                        <span className="detail-label">Comprobantes adjuntos ({gasto.adjuntos.length})</span>
                        <div className="detail-adjuntos">
                            {gasto.adjuntos.map(adj => {
                                const isImage = adj.mime_type?.startsWith('image/')
                                let rawUrl = (adj.url || '').replace(/\\/g, '/')
                                // Handle legacy absolute paths — extract from 'uploads/' onwards
                                const uploadsIdx = rawUrl.indexOf('uploads/')
                                if (uploadsIdx > 0) rawUrl = rawUrl.substring(uploadsIdx)
                                const fileUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE}/${rawUrl}`
                                return (
                                    <a key={adj.id} href={fileUrl} target="_blank" rel="noopener noreferrer" className="adjunto-item">
                                        {isImage
                                            ? <img src={fileUrl} alt={adj.nombre} className="adjunto-thumb" />
                                            : <div className="adjunto-icon">📄</div>}
                                        <div className="adjunto-meta">
                                            <span className="adjunto-name">{adj.nombre}</span>
                                            <span className="adjunto-size">{adj.size ? `${(adj.size / 1024).toFixed(0)} KB` : ''}</span>
                                        </div>
                                    </a>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Reject banner */}
                {gasto.estado === 'rechazado' && gasto.motivo_rechazo && (
                    <div className="detail-reject-banner">
                        <div className="reject-title">Motivo del rechazo</div>
                        <div className="reject-body">{gasto.motivo_rechazo}</div>
                    </div>
                )}

                {/* Directivo actions — show at all times, allow changing any estado */}
                {isDirectivo && (
                    <div className="detail-actions">
                        {gasto.estado !== 'aprobado' && (
                            <button className="action-btn-lg approve" onClick={() => statusMutation.mutate({ estado: 'aprobado' })}>
                                ✓ Aprobar
                            </button>
                        )}
                        {gasto.estado !== 'rechazado' && (
                            <button className="action-btn-lg reject" onClick={() => setShowRejectModal(true)}>
                                ✕ Rechazar
                            </button>
                        )}
                        {gasto.estado !== 'pendiente' && (
                            <button className="action-btn-lg" onClick={() => statusMutation.mutate({ estado: 'pendiente' })}
                                style={{ background: 'rgba(255,183,77,0.12)', color: '#ffb74d', borderColor: 'rgba(255,183,77,0.25)' }}>
                                ↩ Volver a pendiente
                            </button>
                        )}
                        {gasto.estado === 'aprobado' && (
                            <button className="action-btn-lg reimburse" onClick={() => statusMutation.mutate({ estado: 'reintegrado' })}>
                                💰 Reintegrar
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Historial — solo directivos */}
            {isDirectivo && gasto.historial?.length > 0 && (
                <div className="gasto-detail-card" style={{ marginTop: '1.5rem' }}>
                    <div className="detail-header">
                        <h3>Historial de cambios</h3>
                    </div>
                    <div className="historial-list">
                        {gasto.historial.map(h => (
                            <div key={h.id} className="historial-item">
                                <div className="historial-date">{format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}</div>
                                <div className="historial-desc">{h.descripcion}</div>
                                <div className="historial-user">Por: {h.user?.email}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            <Modal
                open={showRejectModal}
                onClose={() => { setShowRejectModal(false); setRejectMotivo('') }}
                title="Rechazar gasto"
                footer={
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="fh-btn" onClick={() => { setShowRejectModal(false); setRejectMotivo('') }}>Cancelar</button>
                        <button
                            className="fh-btn"
                            onClick={handleReject}
                            disabled={!rejectMotivo.trim()}
                            style={{ background: 'rgba(255,82,82,0.2)', color: '#ff5252', borderColor: 'rgba(255,82,82,0.4)' }}
                        >Confirmar rechazo</button>
                    </div>
                }
            >
                <div className="gasto-form">
                    <div className="form-group">
                        <label>Motivo del rechazo *</label>
                        <textarea
                            className="fh-input"
                            style={{ height: 'auto', minHeight: '100px', padding: '12px 14px', resize: 'vertical' }}
                            placeholder="Explique el motivo del rechazo..."
                            value={rejectMotivo}
                            onChange={e => setRejectMotivo(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
            </Modal>

            {/* Delete confirmation modal */}
            <Modal
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Eliminar gasto"
                footer={
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="fh-btn" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
                        <button
                            className="fh-btn"
                            onClick={() => deleteMutation.mutate()}
                            style={{ background: 'rgba(255,82,82,0.2)', color: '#ff5252', borderColor: 'rgba(255,82,82,0.4)' }}
                        >Eliminar</button>
                    </div>
                }
            >
                <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.5' }}>
                    ¿Querés eliminar este gasto? Esta acción no se puede deshacer.
                </p>
            </Modal>
        </div>
    )
}
