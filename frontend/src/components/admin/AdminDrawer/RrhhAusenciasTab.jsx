import { useState, useEffect } from 'react'
import {
    FiUser, FiCalendar, FiClock, FiPlusCircle, FiList, FiCheckCircle,
    FiLoader, FiInfo, FiTrash2, FiSun, FiCloudRain, FiBookOpen,
    FiXCircle, FiGift, FiHeart, FiCoffee, FiBriefcase, FiAlertCircle, FiTag, FiZap, FiSettings, FiPaperclip
} from 'react-icons/fi'
import { api } from '../../../api/client'
import { ausenciasApi as AUS_API } from '../../../api/ausencias'
import Avatar from '../../Avatar'
import { useModal } from '../../modal/ModalProvider'
import { useToast } from '../../toast/ToastProvider'
import usePermission from '../../../hooks/usePermissions'
import './RrhhAusenciasTab.scss'

const ICON_MAP = {
    FiSun, FiCloudRain, FiBookOpen, FiUser, FiXCircle,
    FiGift, FiClock, FiHeart, FiCoffee, FiBriefcase,
    FiAlertCircle, FiTag, FiZap, FiCalendar
}

export default function RrhhAusenciasTab({ setActiveTab, onOpenConfig }) {
    const modal = useModal()
    const { can } = usePermission()
    const toast = useToast()
    const [feders, setFeders] = useState([])
    const [selectedFederId, setSelectedFederId] = useState('')
    const [tipos, setTipos] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [history, setHistory] = useState([])
    const [balances, setBalances] = useState([])
    const [pendings, setPendings] = useState([])
    const [allocPendings, setAllocPendings] = useState([])
    const [viewMode, setViewMode] = useState('assignment') // 'assignment' or 'pendings'

    const [form, setForm] = useState({
        tipo_id: '',
        cantidad_total: '',
        vigencia_desde: new Date().toISOString().split('T')[0],
        vigencia_hasta: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
        comentario: ''
    })
    const [status, setStatus] = useState(null)

    useEffect(() => {
        const loadAll = () => {
            fetchFeders()
            fetchTipos()
            fetchPendings()
            if (selectedFederId) fetchUserStatus(selectedFederId)
        }
        loadAll()

        const handlePush = (e) => {
            const types = ['ausencia', 'ausencia_tipo', 'ausencia_asignacion']
            if (types.includes(e.detail?.type)) {
                loadAll()
            }
        }
        window.addEventListener('fh:push', handlePush)
        return () => window.removeEventListener('fh:push', handlePush)
    }, [selectedFederId])

    useEffect(() => {
        if (selectedFederId) {
            fetchUserStatus(selectedFederId)
        } else {
            setHistory([])
            setBalances([])
        }
    }, [selectedFederId])

    const fetchFeders = async () => {
        try {
            const res = await api.get('/feders?limit=200&is_activo=true')
            setFeders(res.data.rows || [])
        } catch (e) {
            console.error('Error fetching feders', e)
        }
    }

    const fetchPendings = async () => {
        try {
            const [ausRes, allocRes] = await Promise.all([
                api.get('/ausencias?estado_codigo=pendiente'),
                api.get('/ausencias/asignacion/solicitudes?estado_codigo=pendiente')
            ])
            setPendings(ausRes.data || [])
            setAllocPendings(allocRes.data || [])
        } catch (e) {
            console.error('Error fetching pendings', e)
        }
    }

    const fetchTipos = async () => {
        try {
            const res = await api.get('/ausencias/tipos')
            setTipos(res.data || [])
        } catch (e) {
            console.error('Error fetching tipos', e)
        }
    }

    const fetchUserStatus = async (fid) => {
        setLoadingHistory(true)
        try {
            const [historyRes, balanceRes] = await Promise.all([
                api.get(`/ausencias/cuotas?feder_id=${fid}`),
                api.get(`/ausencias/saldos?feder_id=${fid}`)
            ])
            setHistory(Array.isArray(historyRes.data) ? historyRes.data : [])
            setBalances(Array.isArray(balanceRes.data) ? balanceRes.data : [])
        } catch (e) {
            console.error('Error fetching user status', e)
        } finally {
            setLoadingHistory(false)
        }
    }

    const handleAssign = async (e) => {
        e.preventDefault()
        if (!selectedFederId || !form.tipo_id || !form.cantidad_total || !form.comentario) {
            alert('Por favor completa todos los campos obligatorios.')
            return
        }

        setLoading(true)
        setStatus(null)
        try {
            const selectedTipo = tipos.find(t => t.id === parseInt(form.tipo_id))
            await api.post('/ausencias/cuotas', {
                feder_id: parseInt(selectedFederId),
                tipo_id: parseInt(form.tipo_id),
                unidad_codigo: selectedTipo?.unidad_codigo,
                cantidad_total: parseFloat(form.cantidad_total),
                vigencia_desde: form.vigencia_desde,
                vigencia_hasta: form.vigencia_hasta,
                comentario: form.comentario
            })
            setStatus({ type: 'success', message: 'Asignación realizada con éxito' })
            setForm({ ...form, cantidad_total: '', comentario: '' })
            fetchUserStatus(selectedFederId)
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.error || 'Error al asignar' })
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteQuota = async (id) => {
        if (!window.confirm('¿Eliminar esta asignación? El cupo del usuario se verá afectado.')) return
        try {
            await api.delete(`/ausencias/cuotas/${id}`)
            fetchUserStatus(selectedFederId)
        } catch (e) {
            alert(e.response?.data?.error || 'Error al eliminar')
        }
    }

    const handleAbsenceAction = async (id, action) => {
        try {
            await api.post(`/ausencias/${id}/${action}`)
            fetchPendings()
            if (selectedFederId) fetchUserStatus(selectedFederId)
            toast?.success(action === 'approve' ? 'Ausencia aprobada' : 'Ausencia rechazada')
            window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'ausencia' } }))
        } catch (e) {
            toast?.error(e.response?.data?.error || 'Error al procesar')
        }
    }

    const handleReview = async (id) => {
        if (!window.confirm('¿Deseas volver a poner esta solicitud en revisión (pendiente)?')) return
        try {
            // Re-abrir la solicitud usando PATCH para volver a estado pendiente (código 'pendiente')
            // El backend ya tiene una ruta PATCH /ausencias/:id que permite actualizar el estado
            // Necesitamos asegurarnos de que el estado_id 1 sea pendiente o usar el controller dedicado si existiera
            await api.patch(`/ausencias/${id}`, { estado_id: 1 }) // Asumiendo que 1 es 'pendiente' por convención de seeders
            if (selectedFederId) fetchUserStatus(selectedFederId)
            fetchPendings()
            toast?.success('Solicitud re-abierta')
            window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'ausencia' } }))
        } catch (e) {
            toast?.error(e.response?.data?.error || 'Error al re-abrir')
        }
    }

    const openCreateAbsence = (federId) => {
        const fed = feders.find(f => f.id == federId)
        modal.open({
            title: `Registrar Ausencia: ${fed ? fed.nombre + ' ' + fed.apellido : ''}`,
            width: 500,
            render: (close) => (
                <DirectAbsenceForm
                    federId={federId}
                    tipos={tipos}
                    onSave={async (data) => {
                        try {
                            await AUS_API.aus.create(data)
                            toast?.success('Ausencia registrada')
                            fetchUserStatus(federId)
                            fetchPendings()
                            window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'ausencia' } }))
                            close()
                        } catch (e) {
                            toast?.error(e.response?.data?.error || 'Error al registrar')
                        }
                    }}
                    onCancel={() => close()}
                />
            )
        })
    }

    const handleAllocAction = async (id, action) => {
        try {
            if (action === 'approve') {
                await AUS_API.asignacion.approve(id)
                toast?.success('Solicitud de cupo aprobada')
            } else {
                const comment = prompt('Motivo del rechazo:')
                if (comment === null) return
                await AUS_API.asignacion.deny(id, { comentario_admin: comment })
                toast?.success('Solicitud de cupo rechazada')
            }
            fetchPendings()
            window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'ausencia_asignacion' } }))
        } catch (e) {
            toast?.error('Error al procesar solicitud')
        }
    }

    return (
        <div className="rrhhAusenciasTab">
            <header className="tabInnerHead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3>Gestión de RRHH - Ausencias</h3>
                    <p>Asigna días u horas a los usuarios y revisa el historial de movimientos.</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {can('ausencias', 'manage') && (
                        <button className="fh-btn ghost sm" onClick={() => onOpenConfig ? onOpenConfig() : setActiveTab?.('ausencia_tipos')}>
                            <FiSettings /> Configurar Tipos
                        </button>
                    )}
                    <div className="segmented-selector">
                        <button className={viewMode === 'assignment' ? 'active' : ''} onClick={() => setViewMode('assignment')}>
                            <FiPlusCircle /> Asignación
                        </button>
                        <button className={viewMode === 'pendings' ? 'active' : ''} onClick={() => setViewMode('pendings')}>
                            <FiList /> Pendientes {(pendings.length + allocPendings.length) > 0 && <span className="badge">{(pendings.length + allocPendings.length)}</span>}
                        </button>
                    </div>
                </div>
            </header>

            {viewMode === 'assignment' ? (
                <div className="rrhhGrid" key={selectedFederId}>
                    {/* IZQUIERDA: FORMULARIO Y BALANCES */}
                    <div className="rrhhLeft">
                        <section className="rrhhCard userSelector">
                            <label>Seleccionar Usuario</label>
                            <select value={selectedFederId} onChange={(e) => setSelectedFederId(e.target.value)}>
                                <option value="">-- Elige un Feder --</option>
                                {feders.map(f => (
                                    <option key={f.id} value={f.id}>{f.nombre} {f.apellido}</option>
                                ))}
                            </select>
                        </section>

                        {selectedFederId && (
                            <>
                                <section className="rrhhCard currentBalances">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <h4 style={{ margin: 0 }}>Saldos Disponibles</h4>
                                        <button className="fh-btn primary sm" onClick={() => openCreateAbsence(selectedFederId)}>
                                            <FiPlusCircle /> Registrar Ausencia
                                        </button>
                                    </div>
                                    <div className="balanceList">
                                        {(!balances || balances.length === 0) && <p className="empty">Sin saldos vigentes.</p>}
                                        {Array.isArray(balances) && balances.map(b => {
                                            const Icon = ICON_MAP[b.tipo_icon] || FiTag
                                            return (
                                                <div key={b.tipo_id} className="balanceItem" style={{ borderLeftColor: b.tipo_color }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div className="bIcon" style={{ color: b.tipo_color, background: `${b.tipo_color}15` }}>
                                                            <Icon size={14} />
                                                        </div>
                                                        <span className="name">{b.tipo_nombre}</span>
                                                    </div>
                                                    <span className="value">{b.disponible} {b.unidad_codigo}s</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </section>

                                <section className="rrhhCard assignmentForm">
                                    <h4>Nueva Asignación</h4>
                                    <form onSubmit={handleAssign}>
                                        <div className="formRow">
                                            <label>Tipo de Ausencia</label>
                                            <select value={form.tipo_id} onChange={e => setForm({ ...form, tipo_id: e.target.value })} required>
                                                <option value="">-- Seleccionar --</option>
                                                {tipos.map(t => (
                                                    <option key={t.id} value={t.id}>{t.nombre} ({t.unidad_codigo})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="formRow">
                                            <label>Cantidad</label>
                                            <input type="number" step="0.5" value={form.cantidad_total} onChange={e => setForm({ ...form, cantidad_total: e.target.value })} placeholder="Ej: 5" required />
                                        </div>
                                        <div className="formGrid">
                                            <div className="formRow">
                                                <label>Vigencia Desde</label>
                                                <input type="date" value={form.vigencia_desde} onChange={e => setForm({ ...form, vigencia_desde: e.target.value })} required />
                                            </div>
                                            <div className="formRow">
                                                <label>Hasta</label>
                                                <input type="date" value={form.vigencia_hasta} onChange={e => setForm({ ...form, vigencia_hasta: e.target.value })} required />
                                            </div>
                                        </div>
                                        <div className="formRow">
                                            <label>Comentario / Motivo</label>
                                            <textarea value={form.comentario} onChange={e => setForm({ ...form, comentario: e.target.value })} placeholder="Obligatorio para auditoría..." required />
                                        </div>

                                        <button type="submit" className="btnSubmit" disabled={loading}>
                                            {loading ? <FiLoader className="spin" /> : <FiPlusCircle />}
                                            Asignar Cupo
                                        </button>
                                        {status && <div className={`statusMsg ${status.type}`}>{status.message}</div>}
                                    </form>
                                </section>
                            </>
                        )}
                    </div>

                    {/* DERECHA: HISTORIAL */}
                    <div className="rrhhRight">
                        <section className="rrhhCard historyCard">
                            <header className="cardHead">
                                <h4>Historial de Asignaciones</h4>
                                <FiList />
                            </header>

                            <div className="historyList">
                                {!selectedFederId && <p className="notice">Selecciona un usuario para ver su historial.</p>}
                                {selectedFederId && loadingHistory && <div className="loading"><FiLoader className="spin" /> Cargando historial...</div>}
                                {selectedFederId && !loadingHistory && (!history || history.length === 0) && <p className="empty">No hay registros de asignación.</p>}

                                {Array.isArray(history) && history.map(h => {
                                    const Icon = ICON_MAP[h.tipo_icon] || FiTag
                                    return (
                                        <div key={h.id} className={`historyItem ${h.estado_codigo || ''}`} style={{ borderLeftColor: h.tipo_color }}>
                                            <div className="itemTop">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div className="bIcon" style={{ color: h.tipo_color, background: `${h.tipo_color}15`, width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
                                                        <Icon size={12} />
                                                    </div>
                                                    <span className="tipo">{h.tipo_nombre}</span>
                                                    {h.estado_codigo && <span className={`status-pill ${h.estado_codigo}`}>{h.estado_codigo}</span>}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span className="qty">+{h.cantidad_total} {h.unidad_codigo}s</span>
                                                    {h.estado_codigo && (h.estado_codigo === 'aprobada' || h.estado_codigo === 'denegada') && (
                                                        <button className="fh-btn ghost sm" onClick={() => handleReview(h.id)} title="Revisar decisión">
                                                            Revisar
                                                        </button>
                                                    )}
                                                    <button className="btnTrash" onClick={() => handleDeleteQuota(h.id)} title="Eliminar asignación">
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="itemDates">
                                                <FiCalendar /> {h.vigencia_desde} al {h.vigencia_hasta}
                                            </div>
                                            <p className="comment">"{h.comentario}"</p>
                                            <div className="itemMeta">
                                                <span className="user">
                                                    <FiUser /> Por {h.admin_nombre ? `${h.admin_nombre} ${h.admin_apellido}` : `Admin (ID: ${h.asignado_por_user_id})`}
                                                </span>
                                                <span className="date"><FiClock /> {new Date(h.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            ) : (
                <div className="pendingsView">
                    {/* Sección Solicitude de Ausencia */}
                    <div className="pendingSection">
                        <h4 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: 'var(--fh-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiList /> Solicitudes de Ausencia ({pendings.length})
                        </h4>
                        {pendings.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, background: 'var(--fh-bg)', borderRadius: 12, marginBottom: 24 }}>No hay ausencias pendientes.</div>
                        ) : (
                            <div className="pendingsGrid" style={{ marginBottom: 32 }}>
                                {pendings.map(p => (
                                    <div key={p.id} className="pendingCard">
                                        <div className="pHead">
                                            <Avatar src={p.solicitante_avatar_url} name={p.solicitante_nombre} size={40} />
                                            <div className="pInfo">
                                                <span className="pName">{p.solicitante_nombre} {p.solicitante_apellido}</span>
                                                <span className="pEmail">{p.solicitante_email}</span>
                                            </div>
                                            <div className="pBadge">{p.tipo_nombre}</div>
                                        </div>
                                        <div className="pDates">
                                            <strong>Desde:</strong> {p.fecha_desde} <br />
                                            <strong>Hasta:</strong> {p.fecha_hasta}
                                            {p.mitad_dia_codigo && p.mitad_dia_codigo !== 'completo' && <span className="pTag">({p.mitad_dia_nombre})</span>}
                                        </div>
                                        {p.motivo && <p className="pComment" style={{ fontStyle: 'italic', color: 'var(--fh-muted)', marginBottom: 12 }}>"{p.motivo}"</p>}
                                        {p.archivo_url && (
                                            <div className="pAttachment" style={{ marginBottom: 16 }}>
                                                <a href={p.archivo_url} target="_blank" rel="noreferrer" className="file-link" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--fh-accent)', fontWeight: 600 }}>
                                                    <FiPaperclip /> Ver Documento Adjunto
                                                </a>
                                            </div>
                                        )}
                                        <div className="pActions">
                                            <button className="btnDeny" onClick={() => handleAbsenceAction(p.id, 'reject')}>Denegar</button>
                                            <button className="btnApprove" onClick={() => handleAbsenceAction(p.id, 'approve')}>Aprobar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sección Solicitudes de Asignación */}
                    <div className="pendingSection" style={{ marginTop: 32 }}>
                        <h4 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: 'var(--fh-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiPlusCircle /> Solicitudes de Cupo Extra ({allocPendings.length})
                        </h4>
                        {allocPendings.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, background: 'var(--fh-bg)', borderRadius: 12 }}>No hay solicitudes de cupo pendientes.</div>
                        ) : (
                            <div className="pendingsGrid">
                                {allocPendings.map(p => (
                                    <div key={p.id} className="pendingCard quotaCard">
                                        <div className="pHead">
                                            <Avatar src={p.solicitante_avatar_url} name={p.solicitante_nombre} size={40} />
                                            <div className="pInfo">
                                                <span className="pName">{p.solicitante_nombre} {p.solicitante_apellido}</span>
                                                <span className="pEmail">{p.solicitante_email}</span>
                                            </div>
                                            <div className="pBadge quota" style={{ background: 'var(--fh-accent-2)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6 }}>EXTRA: {p.tipo_nombre}</div>
                                        </div>
                                        <div className="pDates">
                                            <strong>Cantidad:</strong> {p.cantidad_solicitada} {p.unidad_codigo === 'hora' ? 'HS' : 'DÍAS'} <br />
                                            <strong>Vigencia:</strong> {p.vigencia_desde} al {p.vigencia_hasta}
                                        </div>
                                        {p.motivo && <p className="pComment" style={{ fontStyle: 'italic', color: 'var(--fh-muted)', marginBottom: 12 }}>"{p.motivo}"</p>}
                                        {p.archivo_url && (
                                            <div className="pAttachment" style={{ marginBottom: 16 }}>
                                                <a href={p.archivo_url} target="_blank" rel="noreferrer" className="file-link" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--fh-accent)', fontWeight: 600 }}>
                                                    <FiPaperclip /> Ver Justificativo
                                                </a>
                                            </div>
                                        )}
                                        <div className="pActions">
                                            <button className="btnDeny" onClick={() => handleAllocAction(p.id, 'reject')}>Rechazar</button>
                                            <button className="btnApprove" onClick={() => handleAllocAction(p.id, 'approve')}>Aprobar Cupo</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}


function DirectAbsenceForm({ federId, tipos, onSave, onCancel }) {
    const [form, setForm] = useState({
        feder_id: federId,
        tipo_id: '',
        fecha_desde: new Date().toISOString().split('T')[0],
        fecha_hasta: new Date().toISOString().split('T')[0],
        es_medio_dia: false,
        mitad_dia_id: '',
        motivo: ''
    })

    const selectedTipo = tipos.find(t => t.id == form.tipo_id)

    return (
        <div className="dlg-form">
            <div className="formRow">
                <label>Tipo de Ausencia</label>
                <select className="fh-input" value={form.tipo_id} onChange={e => setForm({ ...form, tipo_id: e.target.value })} required>
                    <option value="">-- Seleccionar --</option>
                    {tipos.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="formRow">
                    <label>Desde</label>
                    <input type="date" className="fh-input" value={form.fecha_desde} onChange={e => setForm({ ...form, fecha_desde: e.target.value })} required />
                </div>
                <div className="formRow">
                    <label>Hasta</label>
                    <input type="date" className="fh-input" value={form.fecha_hasta} onChange={e => setForm({ ...form, fecha_hasta: e.target.value })} required />
                </div>
            </div>

            {selectedTipo?.permite_medio_dia && (
                <div className="formRow" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                        <input type="checkbox" checked={form.es_medio_dia} onChange={e => setForm({ ...form, es_medio_dia: e.target.checked })} />
                        Es Medio Día
                    </label>
                    {form.es_medio_dia && (
                        <select className="fh-input" style={{ flex: 1 }} value={form.mitad_dia_id} onChange={e => setForm({ ...form, mitad_dia_id: e.target.value })} required>
                            <option value="">-- Turno --</option>
                            <option value="1">Mañana (AM)</option>
                            <option value="2">Tarde (PM)</option>
                        </select>
                    )}
                </div>
            )}

            <div className="formRow">
                <label>Motivo / Comentario</label>
                <textarea
                    className="fh-input"
                    value={form.motivo}
                    onChange={e => setForm({ ...form, motivo: e.target.value })}
                    placeholder="Describe el motivo de la ausencia..."
                    rows={3}
                />
            </div>

            <div className="actions" style={{ marginTop: 20 }}>
                <button className="fh-btn ghost" onClick={onCancel}>Cancelar</button>
                <button className="fh-btn primary" onClick={() => onSave(form)} disabled={!form.tipo_id || !form.fecha_desde || !form.fecha_hasta}>
                    Registrar
                </button>
            </div>
        </div>
    )
}
