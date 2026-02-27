import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gastosApi } from '../../api/gastos'
import { federsApi } from '../../api/feders'
import { format } from 'date-fns'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext'
import { useToast } from '../../components/toast/ToastProvider'
import Modal from '../../components/ui/Modal'
import ModalPanel from '../Tareas/components/ModalPanel'
import FederBubblesFilter from '../../components/common/FederBubblesFilter'
import GastoForm from './GastoForm'
import GastoDetail from './GastoDetail'
import { FiCheck, FiX, FiDollarSign, FiClock } from 'react-icons/fi'
import FHTooltip from '../../components/common/FHTooltip'
import './gastos.scss'

const DIRECTIVO_ROLES = ['NivelA', 'NivelB', 'Directivo', 'RRHH']

const formatMoney = (n, currency = 'ARS') => {
    if (!n && n !== 0) return '$0'
    const symbolMap = { ARS: '$', USD: 'u$s', EUR: '€' }
    const symbol = symbolMap[currency] || symbolMap.ARS
    return symbol + ' ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function GastosListPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const toast = useToast()
    const { roles, hasPerm } = useAuthCtx() || {}
    const isDirectivo = (roles || []).some(r => DIRECTIVO_ROLES.includes(r))
    const isGastoManager = hasPerm('gastos', 'manage') || hasPerm('*', '*')
    const canSeeAll = isGastoManager // Solo el manager ve el panel administrativo

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState(() => isGastoManager ? 'pendiente' : null)
    const [selectedFederIds, setSelectedFederIds] = useState([])
    const { id: routeId } = useParams()
    const [openGastoId, setOpenGastoId] = useState(null)

    // Sync openGastoId with routeId
    React.useEffect(() => {
        if (routeId) {
            setOpenGastoId(Number(routeId))
        } else {
            setOpenGastoId(null)
        }
    }, [routeId])

    // Reject modal state
    const [rejectTarget, setRejectTarget] = useState(null)
    const [rejectMotivo, setRejectMotivo] = useState('')

    // Build query params
    const listParams = {}
    if (statusFilter) listParams.estado = statusFilter

    // Multi-select feder filtering
    if (selectedFederIds.length > 0) {
        listParams.feder_id = selectedFederIds
    }

    const { data: gastos, isLoading, isError, error } = useQuery({
        queryKey: ['gastos', statusFilter, selectedFederIds],
        queryFn: () => gastosApi.list(listParams),
        retry: 1
    })

    // Summary scoped to selected feders or global
    const summaryParams = selectedFederIds.length > 0 ? { feder_id: selectedFederIds } : {}
    const { data: summary, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['gastos-summary', selectedFederIds],
        queryFn: () => gastosApi.summary(summaryParams),
        retry: 1
    })

    const { data: feders } = useQuery({
        queryKey: ['feders-list'],
        queryFn: () => federsApi.list(),
        enabled: canSeeAll,
        staleTime: 5 * 60 * 1000
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, estado, motivo }) => gastosApi.updateStatus(id, { estado, motivo }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gastos'] })
            queryClient.invalidateQueries({ queryKey: ['gastos-summary'] })
            toast?.success('Estado actualizado')
        },
        onError: (err) => {
            toast?.error(err?.fh?.message || err?.message || 'Error al cambiar estado')
        }
    })

    const handleChangeStatus = (gastoId, estado) => {
        if (estado === 'rechazado') {
            setRejectTarget(gastoId)
            return
        }
        statusMutation.mutate({ id: gastoId, estado })
    }

    const confirmReject = () => {
        if (!rejectMotivo.trim() || !rejectTarget) return
        statusMutation.mutate({ id: rejectTarget, estado: 'rechazado', motivo: rejectMotivo })
        setRejectTarget(null)
        setRejectMotivo('')
    }

    const toggleFilter = (estado) => {
        setStatusFilter(prev => prev === estado ? null : estado)
    }

    // Handle feder bubbles selection (single select mode removed, now multi-select)
    const handleFederChange = (ids) => {
        setSelectedFederIds(ids)
    }

    if (isError) return (
        <div className="gastos-page">
            <div className="detail-reject-banner" style={{ maxWidth: '600px' }}>
                <div className="reject-title">Error al cargar el módulo</div>
                <div className="reject-body">{error?.fh?.message || error?.message || 'Hubo un problema de conexión con el servidor'}</div>
                <button className="fh-btn" style={{ marginTop: '0.75rem' }} onClick={() => window.location.reload()}>Reintentar</button>
            </div>
        </div>
    )

    const isPageLoading = isLoading || isSummaryLoading

    const cards = [
        { key: null, label: 'Total', value: summary?.count || 0, monto: summary?.total, type: 'total', showMonto: true },
        { key: 'pendiente', label: 'Pendientes', value: summary?.pendiente || 0, monto: summary?.monto_pendiente, type: 'pendiente', showMonto: true },
        { key: 'aprobado', label: 'Aprobados', value: summary?.aprobado || 0, monto: summary?.monto_aprobado, type: 'aprobado', showMonto: true },
        { key: 'rechazado', label: 'Rechazados', value: summary?.rechazado || 0, monto: summary?.monto_rechazado, type: 'rechazado', showMonto: canSeeAll },
        { key: 'reintegrado', label: 'Reintegrados', value: summary?.reintegrado || 0, monto: summary?.monto_reintegrado, type: 'reintegrado', showMonto: true },
    ]

    const federsArray = Array.isArray(feders) ? feders : (feders?.rows || feders?.data || [])

    const countTxt = `${(gastos || []).length} resultados`

    return (
        <div className="gastos-page">
            {/* Blurred overlay loader */}
            {isPageLoading && (
                <div className="gastos-loader-overlay">
                    <div className="gastos-spinner">
                        <div className="spinner-ring" />
                        <span>Cargando gastos...</span>
                    </div>
                </div>
            )}

            <header className="toolbar card">
                <div className="left">
                    <h1>{canSeeAll ? 'Gastos — Panel Administrativo' : 'Mis Gastos'}</h1>
                    <div className="counter">{countTxt}</div>
                </div>

                <div className="right">
                    <button
                        className="submit"
                        onClick={() => setIsModalOpen(true)}
                    >
                        + Nuevo Gasto
                    </button>
                </div>
            </header>

            <div className="summary-cards">
                {cards.map(c => (
                    <div
                        key={c.type}
                        className={`card ${c.type} ${statusFilter === c.key ? 'active' : ''}`}
                        onClick={() => toggleFilter(c.key)}
                    >
                        <div className="label">{c.label}</div>
                        <div className="value">{c.value}</div>
                        {c.showMonto && c.monto > 0 && (
                            <div className="card-monto">ARS {formatMoney(c.monto)}</div>
                        )}
                    </div>
                ))}
            </div>

            <div className="filters-and-bubbles">
                <div className="filter-actions-group">
                    {/* Active status filter badge */}
                    {statusFilter && (
                        <div className="active-filter-badge">
                            Filtrando: <span className={`status-badge ${statusFilter}`}>{statusFilter}</span>
                            <button className="clear-filter" onClick={() => setStatusFilter(null)}>✕</button>
                        </div>
                    )}

                    {canSeeAll && federsArray.length > 0 && (
                        <FederBubblesFilter
                            feders={federsArray}
                            selectedIds={selectedFederIds}
                            onChange={handleFederChange}
                        />
                    )}
                </div>
            </div>

            <div className="gastos-table">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            {canSeeAll && <th>Solicitante</th>}
                            <th>Descripción</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            {isGastoManager && <th>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {(gastos || []).length === 0 ? (
                            <tr className="empty-row">
                                <td colSpan={isGastoManager ? 6 : (canSeeAll ? 5 : 4)}>
                                    {statusFilter ? `No hay gastos con estado "${statusFilter}"` : 'No hay gastos registrados'}
                                </td>
                            </tr>
                        ) : (
                            gastos.map(g => (
                                <tr key={g.id} onClick={() => setOpenGastoId(g.id)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        {g.fecha ? format(new Date(g.fecha), 'dd/MM/yyyy') : '-'}
                                    </td>
                                    {canSeeAll && (
                                        <td className="solicitante-cell">
                                            {g.feder?.avatar_url && (
                                                <img src={g.feder.avatar_url} alt="" className="solicitante-avatar" />
                                            )}
                                            <span>{g.feder?.nombre} {g.feder?.apellido}</span>
                                        </td>
                                    )}
                                    <td>
                                        {g.descripcion}
                                    </td>
                                    <td>
                                        {formatMoney(g.monto, g.moneda)}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${g.estado}`}>{g.estado}</span>
                                    </td>
                                    {isGastoManager && (
                                        <td className="actions-cell">
                                            {g.estado !== 'aprobado' && g.estado !== 'reintegrado' && (
                                                <FHTooltip text="Aprobar">
                                                    <button className="action-btn approve" onClick={e => { e.stopPropagation(); handleChangeStatus(g.id, 'aprobado') }}><FiCheck /></button>
                                                </FHTooltip>
                                            )}
                                            {g.estado !== 'rechazado' && (
                                                <FHTooltip text="Rechazar">
                                                    <button className="action-btn reject" onClick={e => { e.stopPropagation(); handleChangeStatus(g.id, 'rechazado') }}><FiX /></button>
                                                </FHTooltip>
                                            )}
                                            {g.estado === 'aprobado' && (
                                                <FHTooltip text="Reintegrar">
                                                    <button className="action-btn reimburse" onClick={e => { e.stopPropagation(); handleChangeStatus(g.id, 'reintegrado') }}><FiDollarSign /></button>
                                                </FHTooltip>
                                            )}
                                            {g.estado !== 'pendiente' && (
                                                <FHTooltip text="Volver a pendiente">
                                                    <button className="action-btn reset" onClick={e => { e.stopPropagation(); handleChangeStatus(g.id, 'pendiente') }}><FiClock /></button>
                                                </FHTooltip>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Reject modal */}
            <Modal
                open={!!rejectTarget}
                onClose={() => { setRejectTarget(null); setRejectMotivo('') }}
                title="Rechazar gasto"
                footer={
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="fh-btn" onClick={() => { setRejectTarget(null); setRejectMotivo('') }}>Cancelar</button>
                        <button
                            className="fh-btn"
                            onClick={confirmReject}
                            disabled={!rejectMotivo.trim()}
                            style={{ background: 'rgba(255,82,82,0.2)', color: '#ff5252', borderColor: 'rgba(255,82,82,0.4)' }}
                        >
                            Confirmar rechazo
                        </button>
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

            {/* Create form */}
            <GastoForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['gastos'] })
                    queryClient.invalidateQueries({ queryKey: ['gastos-summary'] })
                }}
            />

            {/* Detail Drawer */}
            {openGastoId && (
                <ModalPanel
                    open={!!openGastoId}
                    onClose={() => {
                        setOpenGastoId(null)
                        navigate('/gastos')
                    }}
                >
                    <GastoDetail
                        taskId={openGastoId}
                        onClose={() => {
                            setOpenGastoId(null)
                            navigate('/gastos')
                        }}
                        onUpdated={() => {
                            queryClient.invalidateQueries({ queryKey: ['gastos'] })
                            queryClient.invalidateQueries({ queryKey: ['gastos-summary'] })
                        }}
                    />
                </ModalPanel>
            )}
        </div>
    )
}
