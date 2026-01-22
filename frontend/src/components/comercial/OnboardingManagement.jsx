// frontend/src/components/comercial/OnboardingManagement.jsx
import React, { useState, useEffect } from 'react'
import { FiClock, FiCheckCircle, FiXCircle, FiCalendar, FiUser, FiArrowRight, FiActivity } from 'react-icons/fi'
import { comercialApi } from '../../api/comercial'
import { useToast } from '../toast/ToastProvider'
import { differenceInDays, format, parseISO } from 'date-fns'
import './OnboardingManagement.scss'

export default function OnboardingManagement() {
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    const fetchOnboarding = async () => {
        try {
            const res = await comercialApi.listOnboarding()
            setLeads(res.data || [])
        } catch (err) {
            console.error('Error fetching onboarding leads:', err)
            toast('Error al cargar leads en onboarding', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOnboarding()
    }, [])

    const handleResolve = async (leadId, decision) => {
        const confirmMsg = decision === 'si'
            ? '¿Estás seguro de finalizar el onboarding y convertir este lead en Cliente?'
            : '¿Deseas cancelar el proceso de onboarding?'

        if (!window.confirm(confirmMsg)) return

        try {
            await comercialApi.resolveOnboarding(leadId, { decision, data: {} })
            toast(decision === 'si' ? 'Lead convertido a cliente con éxito' : 'Onboarding cancelado', 'success')
            fetchOnboarding()
        } catch (err) {
            console.error('Error resolving onboarding:', err)
            toast('Error al procesar la solicitud', 'error')
        }
    }

    if (loading) return <div className="onboarding-loading">Cargando gestión de onboarding...</div>

    return (
        <div className="OnboardingManagement">
            <header className="section-intro">
                <div className="txt">
                    <h3>Gestión de Onboarding</h3>
                    <p>Seguimiento de los 60 días de implementación para nuevos clientes.</p>
                </div>
            </header>

            {leads.length === 0 ? (
                <div className="empty-onboarding">
                    <FiActivity className="ico" />
                    <p>No hay procesos de onboarding activos en este momento.</p>
                </div>
            ) : (
                <div className="onboarding-grid">
                    {leads.map(lead => {
                        const daysLeft = differenceInDays(new Date(lead.onboarding_due_at), new Date())
                        const progress = Math.max(0, Math.min(100, ((60 - daysLeft) / 60) * 100))

                        return (
                            <div className="onboarding-card" key={lead.id}>
                                <div className="card-header">
                                    <div className="lead-info">
                                        <div className="avatar">{(lead.empresa || lead.nombre)[0].toUpperCase()}</div>
                                        <div className="details">
                                            <h4>{lead.empresa || `${lead.nombre} ${lead.apellido || ''}`}</h4>
                                            <span>{lead.onboarding_tipo?.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className={`days-badge ${daysLeft < 10 ? 'urgent' : ''}`}>
                                        <FiClock /> {daysLeft} días restantes
                                    </div>
                                </div>

                                <div className="progress-section">
                                    <div className="progress-meta">
                                        <span>Progreso (60 días)</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="progress-bar-wrap">
                                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>

                                <div className="meta-grid">
                                    <div className="meta-item">
                                        <FiCalendar className="ico" />
                                        <div className="txt">
                                            <label>Inicio</label>
                                            <p>{format(parseISO(lead.onboarding_start_at), 'dd/MM/yyyy')}</p>
                                        </div>
                                    </div>
                                    <div className="meta-item">
                                        <FiUser className="ico" />
                                        <div className="txt">
                                            <label>Responsable</label>
                                            <p>{lead.responsable?.nombre || 'Sin asignar'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-actions">
                                    <button className="btn-cancel" onClick={() => handleResolve(lead.id, 'no')}>
                                        <FiXCircle /> Cancelar
                                    </button>
                                    <button className="btn-finish" onClick={() => handleResolve(lead.id, 'si')}>
                                        <FiCheckCircle /> Finalizar y Alta <FiArrowRight />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
