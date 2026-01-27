import React, { useState, useEffect, useCallback } from 'react'
import { comercialApi } from '../../api/comercial.js'
import { federsApi } from '../../api/feders.js'
import { useToast } from '../../components/toast/ToastProvider'
import ModalPanel from '../Tareas/components/ModalPanel.jsx'
import LeadDetail from '../../components/comercial/LeadDetail'
import FederBubblesFilter from '../../components/common/FederBubblesFilter'
import { FiClock, FiCheckCircle, FiUser, FiBriefcase } from 'react-icons/fi'
import { differenceInDays, format } from 'date-fns'
import { useLoading } from '../../context/LoadingContext.jsx'
import OnboardingFilters from './components/OnboardingFilters'
import GlobalLoader from '../../components/loader/GlobalLoader'
import './OnboardingListPage.scss'

export default function OnboardingListPage() {
    const [leads, setLeads] = useState([])
    const [feders, setFeders] = useState([])
    const [loading, setLoading] = useState(true)
    const { showLoader, hideLoader } = useLoading()
    const [filters, setFilters] = useState({
        q: '',
        responsable_feder_ids: [],
        status: ''
    })
    const [openLeadId, setOpenLeadId] = useState(null)
    const toast = useToast()

    const fetchOnboarding = useCallback(async () => {
        try {
            setLoading(true)
            const [leadsRes, federsRes] = await Promise.all([
                comercialApi.listOnboarding({
                    q: filters.q,
                    responsable_feder_id: filters.responsable_feder_ids.length ? filters.responsable_feder_ids : undefined,
                    status: filters.status || undefined
                }),
                federsApi.getRankingTasks()
            ])
            setLeads(leadsRes.data)
            setFeders(federsRes)
        } catch (err) {
            toast.error('Error al cargar onboarding')
        } finally {
            setLoading(false)
        }
    }, [filters, toast])

    useEffect(() => {
        fetchOnboarding()
    }, [fetchOnboarding])

    useEffect(() => {
        if (loading) showLoader()
        else hideLoader()
        return () => hideLoader()
    }, [loading, showLoader, hideLoader])

    const getProgress = (start, due) => {
        const total = 60
        const spent = differenceInDays(new Date(), new Date(start))
        const pct = Math.min(100, Math.max(0, (spent / total) * 100))
        return { pct, spent }
    }

    return (
        <div className="OnboardingListPage page-container">
            <header className="toolbar card">
                <div className="left">
                    <h1>Onboarding</h1>
                    <div className="counter">{leads.length} activos</div>
                </div>

                <div className="center">
                    <OnboardingFilters
                        value={filters}
                        onChange={setFilters}
                    />
                </div>

                <div className="right">
                    {/* Placeholder for future actions like '+ Nuevo' if needed */}
                </div>
            </header>

            <div className="bubbles-section">
                <FederBubblesFilter
                    feders={feders}
                    selectedIds={filters.responsable_feder_ids}
                    onChange={ids => setFilters({ ...filters, responsable_feder_ids: ids })}
                />
            </div>

            <main className="onboarding-grid">
                {loading ? (
                    <GlobalLoader size={80} />
                ) : leads.length === 0 ? (
                    <div className="fh-empty-state card">
                        <h3>No hay onboadings activos</h3>
                        <p>Los leads en etapa de onboarding aparecerán aquí.</p>
                    </div>
                ) : (
                    leads.map(lead => {
                        const { pct, spent } = getProgress(lead.onboarding_start_at, lead.onboarding_due_at)

                        return (
                            <div key={lead.id} className="onboarding-card card" onClick={() => setOpenLeadId(lead.id)}>
                                <div className="card-header">
                                    <div className="company-info">
                                        <div className="ico"><FiBriefcase /></div>
                                        <div>
                                            <h3>{lead.empresa || lead.nombre}</h3>
                                            <span className="contact">{lead.nombre} {lead.apellido}</span>
                                        </div>
                                    </div>
                                    <div className={`status-badge ${lead.onboarding_status}`}>
                                        {lead.onboarding_status?.replace('_', ' ')}
                                    </div>
                                </div>

                                <div className="card-body">
                                    <div className="progress-section">
                                        <div className="progress-labels">
                                            <span>Progreso Onboarding</span>
                                            <span className="days">Día {spent} de 60</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="fill" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>

                                    <div className="meta-info">
                                        <div className="meta-item">
                                            <FiUser />
                                            <span>{lead.responsable?.nombre || 'Sin asignar'}</span>
                                        </div>
                                        <div className="meta-item">
                                            <FiClock />
                                            <span>Vence: {format(new Date(lead.onboarding_due_at), 'dd/MM/yyyy')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-footer">
                                    <button className="btn-detail">Ver Detalle</button>
                                </div>
                            </div>
                        )
                    })
                )}
            </main>

            <ModalPanel open={!!openLeadId} onClose={() => setOpenLeadId(null)}>
                {openLeadId && (
                    <LeadDetail
                        leadId={openLeadId}
                        onClose={() => setOpenLeadId(null)}
                        onUpdated={fetchOnboarding}
                    />
                )}
            </ModalPanel>
        </div>
    )
}
