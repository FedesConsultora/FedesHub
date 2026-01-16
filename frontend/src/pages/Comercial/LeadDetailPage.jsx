// frontend/src/pages/Comercial/LeadDetailPage.jsx
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { comercialApi } from '../../api/comercial.js'
import { useToast } from '../../components/toast/ToastProvider'
import {
    FiArrowLeft, FiEdit2, FiMail, FiPhone, FiGlobe, FiMapPin,
    FiUser, FiTrendingUp, FiCheckCircle, FiXCircle, FiClock
} from 'react-icons/fi'
import LeadTimeline from '../../components/comercial/LeadTimeline'
import NegotiationModal from '../../components/comercial/NegotiationModal'
import OnboardingResolveModal from '../../components/comercial/OnboardingResolveModal'
import './LeadDetailPage.scss'

export default function LeadDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()
    const [lead, setLead] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showNegotiation, setShowNegotiation] = useState(null) // 'win' | 'lose' | null
    const [showResolveOnboarding, setShowResolveOnboarding] = useState(false)

    const reload = useCallback(async () => {
        try {
            setLoading(true)
            const { data } = await comercialApi.getLead(id)
            setLead(data)
            document.title = `${data.empresa || data.nombre} | Leads`
        } catch (err) {
            toast.error('Error al cargar lead')
        } finally {
            setLoading(false)
        }
    }, [id, toast])

    useEffect(() => { reload() }, [reload])

    const handleAddNota = async (contenido) => {
        try {
            await comercialApi.addNota(id, contenido)
            reload()
        } catch (err) {
            toast.error('Error al agregar nota')
        }
    }

    if (loading && !lead) return null
    if (!lead) return <div className="LeadDetailPage"><div className="error">Lead no encontrado</div></div>

    const isClosed = lead.status?.codigo === 'cerrado' || lead.status?.codigo === 'perdido'

    return (
        <div className="LeadDetailPage page-container">
            <nav className="detail-navbar card">
                <div className="left">
                    <button className="back-btn" onClick={() => navigate('/comercial/leads')}>
                        <FiArrowLeft />
                    </button>
                    <div className="breadcrumb">
                        <Link to="/comercial/leads">Leads</Link> / <span>{lead.empresa || lead.nombre}</span>
                    </div>
                </div>

                {!isClosed && (
                    <div className="actions">
                        <button className="btn-lose" onClick={() => setShowNegotiation('lose')}>
                            <FiXCircle /> Perder
                        </button>
                        <button className="btn-win" onClick={() => setShowNegotiation('win')}>
                            <FiCheckCircle /> Ganar Negociación
                        </button>
                    </div>
                )}
                {lead.cliente_id && (
                    <Link to={`/clientes/${lead.cliente_id}`} className="btn-client-link">
                        Ver Cliente Vinculado
                    </Link>
                )}
            </nav>

            <div className="layout-grid">
                <aside className="info-col">
                    <section className="info-card card">
                        <header>
                            <h1>{lead.empresa || `${lead.nombre} ${lead.apellido || ''}`}</h1>
                            {lead.alias && <p className="alias">{lead.alias}</p>}
                        </header>

                        <div className="status-badges">
                            <span className="badge-etapa">{lead.etapa?.nombre}</span>
                            <span className="badge-status" style={{ backgroundColor: lead.status?.color }}>
                                {lead.status?.nombre}
                            </span>
                        </div>

                        <div className="details-list">
                            <div className="item">
                                <FiMail /><p>{lead.email || 'N/A'}</p>
                            </div>
                            <div className="item">
                                <FiPhone /><p>{lead.telefono || 'N/A'}</p>
                            </div>
                            <div className="item">
                                <FiGlobe /><p>{lead.sitio_web || 'N/A'}</p>
                            </div>
                            <div className="item">
                                <FiMapPin /><p>{lead.ubicacion || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="meta-info">
                            <div className="meta-item">
                                <label>Responsable</label>
                                <span><FiUser /> {lead.responsable?.nombre}</span>
                            </div>
                            <div className="meta-item">
                                <label>Fuente</label>
                                <span>{lead.fuente?.nombre || 'Desconocida'}</span>
                            </div>
                        </div>
                    </section>

                    {lead.onboarding_status && (
                        <section className="onboarding-card card">
                            <h3><FiClock /> Onboarding {lead.onboarding_tipo}</h3>
                            <div className="onboarding-status-badge" data-status={lead.onboarding_status}>
                                {lead.onboarding_status.replace('_', ' ')}
                            </div>
                            <p>Vence: {new Date(lead.onboarding_due_at).toLocaleDateString()}</p>
                            {lead.onboarding_status === 'revision_pendiente' && (
                                <button className="btn-resolve" onClick={() => setShowResolveOnboarding(true)}>
                                    Resolver Onboarding
                                </button>
                            )}
                        </section>
                    )}
                </aside>

                <main className="timeline-col">
                    <LeadTimeline lead={lead} onAddNota={handleAddNota} />
                </main>
            </div>

            {showNegotiation && (
                <NegotiationModal
                    lead={lead}
                    mode={showNegotiation}
                    onClose={() => setShowNegotiation(null)}
                    onWon={() => { setShowNegotiation(null); reload(); }}
                    onLost={() => { setShowNegotiation(null); reload(); }}
                />
            )}

            {showResolveOnboarding && (
                <OnboardingResolveModal
                    lead={lead}
                    onClose={() => setShowResolveOnboarding(false)}
                    onResolved={() => { setShowResolveOnboarding(false); reload(); }}
                />
            )}
        </div>
    )
}
