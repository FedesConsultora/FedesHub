import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { comercialApi } from '../../api/comercial.js'
import { useToast } from '../../components/toast/ToastProvider'
import {
    FiX, FiMail, FiPhone, FiGlobe, FiMapPin, FiUser, FiCalendar,
    FiBriefcase, FiTag, FiCheckCircle, FiXCircle, FiTrendingUp, FiCopy, FiArrowLeft, FiPlus
} from 'react-icons/fi'
import LeadStatusCard from './LeadStatusCard'
import LeadTimeline from './LeadTimeline'
import LeadFiles from './LeadFiles'
import NegotiationModal from './NegotiationModal'
import OnboardingResolveModal from './OnboardingResolveModal'
import { useModal } from '../../components/modal/ModalProvider'
import useContentEditable from '../../hooks/useContentEditable'
import WinNegotiationModal from './WinNegotiationModal'
import { FiMessageSquare, FiFile, FiActivity, FiCheckSquare } from 'react-icons/fi'
import { tareasApi } from '../../api/tareas.js'
import BudgetAmountModal from './BudgetAmountModal'
import './LeadDetail.scss'

export default function LeadDetail({ leadId, onClose, onUpdated }) {
    const toast = useToast()
    const modal = useModal()
    const navigate = useNavigate()
    const [lead, setLead] = useState(null)
    const [catalog, setCatalog] = useState({ statuses: [], etapas: [], fuentes: [], motivosPerdida: [] })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showNegotiation, setShowNegotiation] = useState(null)
    const [showResolveOnboarding, setShowResolveOnboarding] = useState(false)

    const [activeTab, setActiveTab] = useState('notas') // 'notas' | 'files' | 'history'
    const [showBudgetModal, setShowBudgetModal] = useState(null) // { id, et }

    const reload = useCallback(async () => {
        try {
            setLoading(true)
            const [leadRes, catRes] = await Promise.all([
                comercialApi.getLead(leadId),
                comercialApi.getCatalogs()
            ])
            setLead(leadRes.data)
            setCatalog(catRes.data)
        } catch (err) {
            toast.error('Error al cargar lead')
        } finally {
            setLoading(false)
        }
    }, [leadId, toast])

    useEffect(() => { reload() }, [reload])

    const handleUpdate = async (patch) => {
        try {
            setSaving(true)
            await comercialApi.updateLead(leadId, patch)
            // Refetch to get updated relationships
            const res = await comercialApi.getLead(leadId)
            setLead(res.data)
            onUpdated?.()
            toast.success('Lead actualizado correctamente')
        } catch (err) {
            toast.error('Error al actualizar lead')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        const ok = await modal.confirm({
            title: '¿Eliminar Lead?',
            message: `¿Estás seguro de que querés eliminar a "${lead.empresa || lead.nombre}"? Esta acción se puede deshacer desde la base de datos pero no aparecerá en el listado.`,
            tone: 'danger',
            okText: 'Sí, eliminar',
            cancelText: 'Cancelar'
        })
        if (!ok) return

        try {
            setSaving(true)
            await comercialApi.deleteLead(leadId)
            toast.success('Lead eliminado')
            onClose()
            onUpdated?.()
        } catch (err) {
            toast.error('Error al eliminar lead')
        } finally {
            setSaving(false)
        }
    }

    const titleCE = useContentEditable({
        value: lead?.empresa || '',
        onChange: (v) => handleUpdate({ empresa: v })
    })

    const handleAddNota = async (contenido) => {
        try {
            await comercialApi.addNota(leadId, contenido)
            const { data } = await comercialApi.getLead(leadId)
            setLead(data)
        } catch (err) {
            toast.error('Error al agregar nota')
        }
    }

    const handleCreateTask = () => {
        // Navegar a /tareas con params para abrir modal de creación
        const leadName = lead.empresa || lead.nombre || 'Lead'
        navigate(`/tareas?createFromLead=${leadId}&leadName=${encodeURIComponent(leadName)}`)
    }

    if (loading && !lead) return <div className="LeadDetail-loading">Cargando...</div>
    if (!lead) return <div className="LeadDetail-error">No se encontró el lead</div>

    const isClosed = lead.status?.codigo === 'cerrado' || lead.status?.codigo === 'perdido'

    return (
        <div className="LeadDetail">
            <header className="detail-header">
                <div className="header-top">
                    <div className="title-section">
                        <button className="back-btn" onClick={onClose} title="Volver al listado">
                            <FiArrowLeft />
                            <span>Volver</span>
                        </button>
                        <div
                            className="editable-title"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                                const val = e.target.textContent.trim()
                                if (val && val !== lead.empresa) handleUpdate({ empresa: val })
                            }}
                            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                        >
                            {lead.empresa || 'Sin nombre de empresa'}
                        </div>
                        {lead.alias && <span className="alias">({lead.alias})</span>}
                    </div>
                </div>

                <div className="header-actions">
                    <div className="main-meta">
                        <LeadStatusCard
                            currentEtapa={lead.etapa}
                            etapasCatalog={catalog.etapas}
                            onPick={async (id) => {
                                const et = catalog.etapas.find(e => Number(e.id) === Number(id));
                                if (et?.codigo === 'presupuesto' && !lead.presupuesto_ars) {
                                    setShowBudgetModal({ id, et })
                                } else if (et?.codigo === 'cierre') {
                                    const ok = await modal.confirm({
                                        title: 'Paso a Cierre',
                                        message: '¿Esta negociación fue Ganada o Perdida?',
                                        okText: 'Ganada',
                                        cancelText: 'Perdida',
                                        tone: 'primary'
                                    })
                                    // Note: if ok is true -> Win, if false -> Lose/Nothing
                                    // Actually modal.confirm usually returns boolean. 
                                    // Let's use it as: if ok -> win, else if cancelled -> do nothing or maybe we need a custom modal.
                                    // The user said "mostrar las ventanas correspondientes". 
                                    // I will trigger the win/lose modals based on choice.
                                    if (ok) setShowNegotiation('win')
                                    else setShowNegotiation('lose')
                                } else {
                                    handleUpdate({ etapa_id: id });
                                }
                            }}
                            disabled={isClosed}
                        />
                        <span className="status-badge" style={{ backgroundColor: lead.status?.color }}>
                            {lead.status?.nombre}
                        </span>
                    </div>

                    {!isClosed && (
                        <div className="outcome-btns">
                            <button className="btn-lose" onClick={() => setShowNegotiation('lose')}>
                                <FiXCircle /> Perder
                            </button>
                            <button className="btn-win" onClick={() => setShowNegotiation('win')}>
                                <FiCheckCircle /> Ganar
                            </button>
                            <button className="btn-task" onClick={handleCreateTask}>
                                <FiPlus /> Crear Tarea
                            </button>
                            <button className="btn-delete" onClick={handleDelete} title="Eliminar definitivamente">
                                <FiXCircle />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {showBudgetModal && (
                <BudgetAmountModal
                    leadName={lead.empresa || lead.nombre}
                    onClose={() => setShowBudgetModal(null)}
                    onConfirm={(amount) => {
                        handleUpdate({ etapa_id: showBudgetModal.id, presupuesto_ars: amount })
                        setShowBudgetModal(null)
                    }}
                />
            )}

            <div className="detail-grid">
                <div className="info-panel">
                    <section className="info-group">
                        <h3>Información de Contacto</h3>
                        <div className="fields">
                            <EditableField
                                icon={<FiUser />}
                                label="Nombre contacto"
                                value={`${lead.nombre} ${lead.apellido || ''}`}
                                onSave={(val) => {
                                    const [n, ...a] = val.split(' ')
                                    handleUpdate({ nombre: n, apellido: a.join(' ') })
                                }}
                            />
                            <EditableField
                                icon={<FiMail />}
                                label="Email"
                                value={lead.email}
                                onSave={(val) => handleUpdate({ email: val })}
                            />
                            <EditableField
                                icon={<FiPhone />}
                                label="Teléfono"
                                value={lead.telefono}
                                onSave={(val) => handleUpdate({ telefono: val })}
                            />
                            <EditableField
                                icon={<FiGlobe />}
                                label="Sitio Web"
                                value={lead.sitio_web}
                                onSave={(val) => handleUpdate({ sitio_web: val })}
                            />
                            <EditableField
                                icon={<FiMapPin />}
                                label="Ubicación"
                                value={lead.ubicacion}
                                onSave={(val) => handleUpdate({ ubicacion: val })}
                            />
                        </div>
                    </section>

                    <section className="info-group">
                        <h3>Detalles de Lead</h3>
                        <div className="fields">
                            <div className="static-field">
                                <label><FiUser /> Responsable</label>
                                <span>{lead.responsable?.nombre || 'Sin asignar'}</span>
                            </div>
                            <div className="static-field">
                                <label><FiTrendingUp /> Fuente</label>
                                <span>{lead.fuente?.nombre || 'Desconocida'}</span>
                            </div>
                            <div className="static-field">
                                <label><FiCalendar /> Creado el</label>
                                <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </section>

                    {lead.onboarding_status && (
                        <section className="onboarding-box">
                            <header>
                                <h4>Onboarding {lead.onboarding_tipo}</h4>
                                <span className="onb-status" data-status={lead.onboarding_status}>
                                    {lead.onboarding_status.replace('_', ' ')}
                                </span>
                            </header>
                            <p className="onb-meta">Vence: {new Date(lead.onboarding_due_at).toLocaleDateString()}</p>
                            {lead.onboarding_status === 'revision_pendiente' && (
                                <button className="btn-resolve" onClick={() => setShowResolveOnboarding(true)}>
                                    Resolver Pendiente
                                </button>
                            )}
                        </section>
                    )}
                </div>

                <div className="timeline-panel">
                    <div className="lead-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'notas' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notas')}
                        >
                            <FiMessageSquare /> Notas
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
                            onClick={() => setActiveTab('files')}
                        >
                            <FiFile /> Archivos
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'tareas' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tareas')}
                        >
                            <FiCheckSquare /> Tareas
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            <FiActivity /> Historial
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'notas' && (
                            <LeadTimeline lead={lead} onAddNota={handleAddNota} showOnly="notas" />
                        )}
                        {activeTab === 'history' && (
                            <LeadTimeline lead={lead} showOnly="history" />
                        )}
                        {activeTab === 'tareas' && (
                            <LeadTasks leadId={leadId} />
                        )}
                        {activeTab === 'files' && (
                            <LeadFiles lead={lead} />
                        )}
                    </div>
                </div>
            </div>

            {showNegotiation === 'win' && (
                <WinNegotiationModal
                    lead={lead}
                    onClose={() => setShowNegotiation(null)}
                    onConfirm={async (ruta, onboardingData) => {
                        try {
                            await comercialApi.winNegotiation(leadId, { ruta, onboardingData })
                            toast.success('¡Negociación ganada!')
                            reload()
                            onUpdated?.()
                        } catch (err) {
                            toast.error(err.response?.data?.error || 'Error al procesar victoria')
                        }
                    }}
                />
            )}

            {showNegotiation === 'lose' && (
                <NegotiationModal
                    lead={lead}
                    mode="lose"
                    onClose={() => setShowNegotiation(null)}
                    onLost={() => { setShowNegotiation(null); reload(); onUpdated?.() }}
                />
            )}

            {showResolveOnboarding && (
                <OnboardingResolveModal
                    lead={lead}
                    onClose={() => setShowResolveOnboarding(false)}
                    onResolved={() => { setShowResolveOnboarding(false); reload(); onUpdated?.(); }}
                />
            )}
        </div>
    )
}

function LeadTasks({ leadId }) {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await tareasApi.list({ lead_id: leadId })
                setTasks(res.rows || [])
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [leadId])

    if (loading) return <div className="tab-loading">Cargando tareas...</div>

    return (
        <div className="LeadTasks">
            {tasks.length === 0 ? (
                <div className="empty-tasks">
                    <FiCheckSquare />
                    <p>No hay tareas vinculadas a este lead.</p>
                </div>
            ) : (
                <div className="tasks-list-mini">
                    {tasks.map(t => (
                        <div key={t.id} className="task-mini-card">
                            <div className="t-status" style={{ backgroundColor: t.estado?.color || '#333' }} />
                            <div className="t-content">
                                <h6>{t.titulo}</h6>
                                <div className="t-meta">
                                    <span>Vence: {t.vencimiento ? new Date(t.vencimiento).toLocaleDateString() : '—'}</span>
                                    {t.prioridad && <span className="prio">{t.prioridad}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
function EditableField({ icon, label, value, onSave }) {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState(value || '')

    useEffect(() => { setVal(value || '') }, [value])

    if (editing) {
        return (
            <div className="editable-field editing">
                <label>{icon} {label}</label>
                <div className="input-row">
                    <input autoFocus value={val} onChange={e => setVal(e.target.value)} />
                    <button onClick={() => { onSave(val); setEditing(false); }} className="ok-btn"><FiCheckCircle /></button>
                    <button onClick={() => { setVal(value || ''); setEditing(false); }} className="cancel-btn"><FiX /></button>
                </div>
            </div>
        )
    }

    return (
        <div className="editable-field" onClick={() => setEditing(true)}>
            <label>{icon} {label}</label>
            <div className="val-row">
                <span>{value || '—'}</span>
                <FiCopy className="copy-ico" onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(value)
                    // toast sutil?
                }} />
            </div>
        </div>
    )
}
