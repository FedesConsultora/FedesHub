import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiTrash2, FiClock, FiCheck, FiX, FiDollarSign, FiArrowLeft } from 'react-icons/fi'
import { gastosApi } from '../../api/gastos'
import { format } from 'date-fns'
import { useAuthCtx } from '../../context/AuthContext'
import { useToast } from '../../components/toast/ToastProvider'
import Modal from '../../components/ui/Modal'
// Import the Tareas task-detail styles so we get all the same classes (.taskDetail, .taskHeader, .grid, etc.)
import '../Tareas/task-detail.scss'
import './gastos.scss'

const DIRECTIVO_ROLES = ['NivelA', 'NivelB', 'Directivo', 'RRHH']

// Inline editable field component
function EditableField({ label, value, onSave, type = 'text', children }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')
    const toast = useToast()

    const start = useCallback(() => {
        setDraft(value ?? '')
        setEditing(true)
    }, [value])

    const save = useCallback(async () => {
        try {
            await onSave(draft)
            setEditing(false)
        } catch {
            toast?.error('Error al guardar')
        }
    }, [draft, onSave, toast])

    const cancel = () => setEditing(false)

    if (editing) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="section-label">{label}</span>
                {type === 'textarea' ? (
                    <textarea
                        className="fh-input"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        autoFocus
                        style={{ minHeight: 80, padding: '10px 12px', resize: 'vertical' }}
                    />
                ) : type === 'select' ? (
                    children({ draft, setDraft })
                ) : (
                    <input
                        className="fh-input"
                        type={type}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        autoFocus
                        style={{ padding: '8px 12px' }}
                    />
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="fh-btn" style={{ background: 'rgba(76,175,80,0.15)', color: '#4caf50', borderColor: 'rgba(76,175,80,0.3)' }} onClick={save}><FiCheck /> Guardar</button>
                    <button className="fh-btn" onClick={cancel}><FiX /> Cancelar</button>
                </div>
            </div>
        )
    }

    return (
        <div onClick={start} style={{ cursor: 'text' }}>
            <span className="section-label">{label}</span>
            <div className="ttl" style={{ fontSize: '0.95rem', fontWeight: 400, padding: '6px 4px' }}>
                {value || <span style={{ color: 'rgba(255,255,255,0.3)' }}>Sin valor — click para editar</span>}
            </div>
        </div>
    )
}

export default function GastoDetail({ taskId, onClose, onUpdated }) {
    const queryClient = useQueryClient()
    const toast = useToast()
    const { roles, user, hasPerm } = useAuthCtx() || {}
    const isGastoManager = hasPerm?.('gastos', 'manage') || hasPerm?.('*', '*')
    const isDirectivo = (roles || []).some(r => DIRECTIVO_ROLES.includes(r))

    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectMotivo, setRejectMotivo] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const { data: gasto, isLoading } = useQuery({
        queryKey: ['gasto', taskId],
        queryFn: () => gastosApi.getById(taskId),
        enabled: !!taskId
    })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['gasto', taskId] })
        queryClient.invalidateQueries({ queryKey: ['gastos'] })
        queryClient.invalidateQueries({ queryKey: ['gastos-summary'] })
        if (onUpdated) onUpdated()
    }

    const updateMutation = useMutation({
        mutationFn: (body) => gastosApi.update(taskId, body),
        onSuccess: () => {
            invalidate()
            toast?.success('Gasto actualizado')
        },
        onError: (err) => toast?.error(err?.fh?.message || 'Error al actualizar')
    })

    const statusMutation = useMutation({
        mutationFn: (body) => gastosApi.updateStatus(taskId, body),
        onSuccess: () => {
            invalidate()
            toast?.success('Estado actualizado')
            setShowRejectModal(false)
            setRejectMotivo('')
        },
        onError: (err) => toast?.error(err?.fh?.message || 'Error al cambiar estado')
    })

    const requestReceiptMutation = useMutation({
        mutationFn: () => gastosApi.requestReceipt(taskId),
        onSuccess: () => {
            invalidate()
            toast?.success('Comprobante solicitado correctamente')
        },
        onError: (err) => toast?.error(err?.fh?.message || 'Error al solicitar comprobante')
    })

    const deleteMutation = useMutation({
        mutationFn: () => gastosApi.delete(taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gastos'] })
            queryClient.invalidateQueries({ queryKey: ['gastos-summary'] })
            toast?.success('Gasto eliminado')
            onClose()
        },
        onError: (err) => toast?.error(err?.fh?.message || 'Error al eliminar')
    })

    const handleSaveField = useCallback((field) => async (value) => {
        await updateMutation.mutateAsync({ [field]: value })
    }, [updateMutation])

    const formatCurrency = (amount, currency) => {
        const symbolMap = { ARS: '$', USD: 'u$s', EUR: '€' }
        const symbol = symbolMap[currency] || symbolMap.ARS
        return (
            <span>
                <span style={{ fontSize: '0.8em', opacity: 0.6, marginRight: 4 }}>{symbol}</span>
                {parseFloat(amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.3)', marginLeft: 6, fontWeight: 500 }}>{currency}</span>
            </span>
        )
    }

    const handleReject = () => {
        if (!rejectMotivo.trim()) return
        statusMutation.mutate({ estado: 'rechazado', motivo: rejectMotivo })
    }

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

    if (isLoading) return (
        <div className="taskDetail">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
                <div className="spinner-ring" style={{ width: 38, height: 38, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#44718D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Cargando gasto...</span>
            </div>
        </div>
    )

    if (!gasto) return (
        <div className="taskDetail">
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Gasto no encontrado</div>
        </div>
    )

    const isOwner = user?.feder_id === gasto.feder_id
    // 🔥 El GastoManager NO puede editar el contenido (monto, desc, fecha). Solo el dueño puede si está pendiente.
    const canEdit = isOwner && gasto.estado === 'pendiente'
    const canDelete = (isOwner && !isDirectivo && gasto.estado === 'pendiente') || isGastoManager

    return (
        <div className="taskDetail">
            {/* ── Sticky Header ── */}
            <header className="taskHeader">
                <button className="back-to-list-btn" onClick={onClose}>
                    <FiArrowLeft /> Volver
                </button>

                <div className="titleWrap">
                    <div className="titleSection">
                        <div className="ttl">{gasto.descripcion || `Gasto #${gasto.id}`}</div>
                    </div>
                    <div className="meta">
                        <span className={`status-badge lg ${gasto.estado}`}>{gasto.estado}</span>
                        {canDelete && (
                            <button className="deleteBtn" onClick={() => setShowDeleteConfirm(true)} title="Eliminar gasto">
                                <FiTrash2 />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Two-column body ── */}
            <div className="grid" style={{ marginTop: '1rem' }}>

                {/* ── LEFT COLUMN ── */}
                <div className="left">

                    {/* Datos del gasto */}
                    <div className="fh-card" style={{ padding: '1.5rem' }}>
                        <div className="fh-row" style={{ gap: '2.5rem', flexWrap: 'wrap' }}>
                            {/* Fecha */}
                            <div style={{ flex: 1, minWidth: 140 }}>
                                {canEdit ? (
                                    <EditableField
                                        label="Fecha"
                                        value={gasto.fecha ? gasto.fecha.split('T')[0] : ''}
                                        onSave={handleSaveField('fecha')}
                                        type="date"
                                    />
                                ) : (
                                    <>
                                        <span className="section-label">Fecha</span>
                                        <div style={{ color: '#e8eef6', marginTop: 4, fontSize: '1rem', fontWeight: 500 }}>{gasto.fecha ? format(new Date(gasto.fecha), 'dd/MM/yyyy') : '—'}</div>
                                    </>
                                )}
                            </div>

                            {/* Monto */}
                            <div style={{ flex: 1, minWidth: 140 }}>
                                {canEdit ? (
                                    <EditableField
                                        label="Monto"
                                        value={String(gasto.monto ?? '')}
                                        onSave={handleSaveField('monto')}
                                        type="number"
                                    />
                                ) : (
                                    <>
                                        <span className="section-label">Monto</span>
                                        <div style={{ color: '#4dd0e1', fontWeight: 800, fontSize: '1.4rem', marginTop: 4, letterSpacing: '-0.5px' }}>
                                            {formatCurrency(gasto.monto, gasto.moneda)}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Moneda */}
                            <div style={{ flex: 1, minWidth: 120 }}>
                                {canEdit ? (
                                    <EditableField
                                        label="Moneda"
                                        value={gasto.moneda}
                                        onSave={handleSaveField('moneda')}
                                        type="select"
                                    >
                                        {({ draft, setDraft }) => (
                                            <select className="fh-input" value={draft} onChange={e => setDraft(e.target.value)} autoFocus>
                                                <option value="ARS">ARS</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        )}
                                    </EditableField>
                                ) : (
                                    <>
                                        <span className="section-label">Moneda</span>
                                        <div style={{ color: '#e8eef6', marginTop: 4 }}>{gasto.moneda}</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="fh-card">
                        {canEdit ? (
                            <EditableField
                                label="Descripción"
                                value={gasto.descripcion}
                                onSave={handleSaveField('descripcion')}
                                type="textarea"
                            />
                        ) : (
                            <>
                                <span className="section-label">Descripción</span>
                                <div style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {gasto.descripcion}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Adjuntos */}
                    {gasto.adjuntos?.length > 0 && (
                        <div className="fh-card">
                            <span className="section-label">Adjuntos ({gasto.adjuntos.length})</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                                {gasto.adjuntos.map(adj => {
                                    const isImage = adj.mime_type?.startsWith('image/')
                                    let rawUrl = (adj.url || '').replace(/\\/g, '/')
                                    const idx = rawUrl.indexOf('uploads/')
                                    if (idx > 0) rawUrl = rawUrl.substring(idx)
                                    const fileUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE}/${rawUrl}`
                                    return (
                                        <a key={adj.id} href={fileUrl} target="_blank" rel="noopener noreferrer"
                                            className="adjunto-item-premium"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '12px 16px',
                                                borderRadius: 14,
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                textDecoration: 'none',
                                                color: '#e8eef6',
                                                transition: 'all 0.2s ease'
                                            }}>
                                            {isImage
                                                ? <img src={fileUrl} alt="" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
                                                : <div style={{ fontSize: '1.5rem', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(68,113,141,0.15)', borderRadius: 8 }}>📄</div>}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#fff' }}>{adj.nombre}</div>
                                                {adj.size && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{(adj.size / 1024).toFixed(0)} KB</div>}
                                            </div>
                                            <div style={{ opacity: 0.4, fontSize: '0.8rem' }}>Abrir ↗</div>
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Banner de rechazo — usa la clase de task-detail.scss */}
                    {gasto.estado === 'rechazado' && gasto.motivo_rechazo && (
                        <div className="cancelReasonBanner">
                            <div className="bannerLabel">Motivo del rechazo</div>
                            <div className="bannerText">{gasto.motivo_rechazo}</div>
                        </div>
                    )}

                    {/* Historial */}
                    {gasto.historial?.length > 0 && (
                        <div className="fh-card">
                            <span className="section-label">Historial de cambios</span>
                            <div className="history-timeline" style={{ marginTop: 12 }}>
                                {gasto.historial.map(h => (
                                    <div key={h.id} className="history-item">
                                        <div className="dot" />
                                        <div className="history-content">
                                            <div className="time">{format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}hs</div>
                                            <div className="desc">{h.descripcion}</div>
                                            {h.user?.email && <div className="user">por {h.user.email.split('@')[0]}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="right">

                    {/* Solicitante */}
                    <div className="fh-card">
                        <span className="section-label">Solicitante</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                            {gasto.feder?.avatar_url && (
                                <img src={gasto.feder.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                            )}
                            <div>
                                <div style={{ fontWeight: 600, color: '#e8eef6' }}>{gasto.feder?.nombre} {gasto.feder?.apellido}</div>
                                {gasto.user?.email && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{gasto.user.email}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Acciones del Manager */}
                    {isGastoManager && (
                        <div className="fh-card">
                            <span className="section-label">Acciones</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                {gasto.estado === 'pendiente' && (!gasto.adjuntos || gasto.adjuntos.length === 0) && (
                                    <button
                                        className="fh-btn"
                                        style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', width: '100%', fontWeight: 600 }}
                                        onClick={() => requestReceiptMutation.mutate()}
                                        disabled={requestReceiptMutation.isPending}
                                    >
                                        <FiClock /> Solicitar Comprobante
                                    </button>
                                )}
                                {gasto.estado !== 'aprobado' && gasto.estado !== 'reintegrado' && (
                                    <button
                                        className="fh-btn"
                                        style={{ background: 'rgba(76,175,80,0.12)', borderColor: 'rgba(76,175,80,0.3)', color: '#4caf50', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', width: '100%', fontWeight: 600 }}
                                        onClick={() => statusMutation.mutate({ estado: 'aprobado' })}
                                        disabled={statusMutation.isPending}
                                    >
                                        <FiCheck /> Aprobar Gasto
                                    </button>
                                )}
                                {gasto.estado !== 'rechazado' && (
                                    <button
                                        className="fh-btn"
                                        style={{ background: 'rgba(244,67,54,0.12)', borderColor: 'rgba(244,67,54,0.3)', color: '#f44336', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', width: '100%', fontWeight: 600 }}
                                        onClick={() => setShowRejectModal(true)}
                                        disabled={statusMutation.isPending}
                                    >
                                        <FiX /> Rechazar Gasto
                                    </button>
                                )}
                                {gasto.estado === 'aprobado' && (
                                    <button
                                        className="fh-btn"
                                        style={{ background: 'rgba(33,150,243,0.12)', borderColor: 'rgba(33,150,243,0.3)', color: '#2196f3', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', width: '100%', fontWeight: 600 }}
                                        onClick={() => statusMutation.mutate({ estado: 'reintegrado' })}
                                        disabled={statusMutation.isPending}
                                    >
                                        <FiDollarSign /> Reintegrar Importe
                                    </button>
                                )}
                                {gasto.estado !== 'pendiente' && (
                                    <button
                                        className="fh-btn"
                                        style={{ background: 'rgba(255,193,7,0.12)', borderColor: 'rgba(255,193,7,0.3)', color: '#ffc107', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', width: '100%', fontWeight: 600 }}
                                        onClick={() => statusMutation.mutate({ estado: 'pendiente' })}
                                        disabled={statusMutation.isPending}
                                    >
                                        <FiClock /> Volver a Pendiente
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modales ── */}
            <Modal
                open={showRejectModal}
                onClose={() => { setShowRejectModal(false); setRejectMotivo('') }}
                title="Rechazar gasto"
                footer={
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="fh-btn" onClick={() => { setShowRejectModal(false); setRejectMotivo('') }}>Cancelar</button>
                        <button
                            className="fh-btn"
                            style={{ background: 'rgba(244,67,54,0.15)', color: '#f44336', borderColor: 'rgba(244,67,54,0.4)' }}
                            onClick={handleReject}
                            disabled={!rejectMotivo.trim() || statusMutation.isPending}
                        >Confirmar rechazo</button>
                    </div>
                }
            >
                <div style={{ padding: '0.5rem' }}>
                    <label className="section-label">Motivo del rechazo *</label>
                    <textarea
                        className="fh-input"
                        style={{ minHeight: 100, padding: '10px 12px', marginTop: 8, resize: 'vertical', width: '100%' }}
                        placeholder="Explicá el motivo..."
                        value={rejectMotivo}
                        onChange={e => setRejectMotivo(e.target.value)}
                        autoFocus
                    />
                </div>
            </Modal>

            <Modal
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Eliminar gasto"
                footer={
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="fh-btn" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
                        <button
                            className="fh-btn"
                            style={{ background: 'rgba(244,67,54,0.15)', color: '#f44336', borderColor: 'rgba(244,67,54,0.4)' }}
                            onClick={() => deleteMutation.mutate()}
                            disabled={deleteMutation.isPending}
                        >Eliminar</button>
                    </div>
                }
            >
                <p style={{ padding: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>¿Estás seguro? Esta acción no se puede deshacer.</p>
            </Modal>
        </div>
    )
}
