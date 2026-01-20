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
import { FiMessageSquare, FiFile, FiActivity } from 'react-icons/fi'
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
            setLead(prev => ({ ...prev, ...patch }))
            onUpdated?.()
        } catch (err) {
            toast.error('Error al actualizar lead')
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
                            onPick={(id) => handleUpdate({ etapa_id: id })}
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
                        </div>
                    )}
                </div>
            </header>

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
                        {activeTab === 'files' && (
                            <LeadFiles lead={lead} />
                        )}
                    </div>
                </div>
            </div>

            {showNegotiation && (
                <NegotiationModal
                    lead={lead}
                    mode={showNegotiation}
                    onClose={() => setShowNegotiation(null)}
                    onWon={() => { setShowNegotiation(null); reload(); onUpdated?.(); }}
                    onLost={() => { setShowNegotiation(null); reload(); onUpdated?.(); }}
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
