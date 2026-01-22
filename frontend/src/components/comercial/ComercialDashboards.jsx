// frontend/src/components/comercial/ComercialDashboards.jsx
import React, { useState, useEffect } from 'react'
import { comercialApi } from '../../api/comercial'
import { FiTrendingUp, FiTarget, FiFilter, FiAward, FiCalendar, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import EeccStatsModal from '../../pages/Admin/Comercial/EeccStatsModal'
import './ComercialDashboards.scss'

export default function ComercialDashboards({ filters = {}, isExpanded, onToggle, refreshKey }) {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showEeccModal, setShowEeccModal] = useState(false)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const res = await comercialApi.getStats(filters)
                setStats(res.data)
            } catch (e) {
                console.error('Error loading stats:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [filters, refreshKey])

    if (loading) return <div className="ComercialDashboards loading">Cargando métricas...</div>
    if (!stats) return null

    return (
        <div className="ComercialDashboards">
            <div className="dash-header">
                <div className="title">
                    <h2>Dashboard Comercial</h2>
                    <p>{stats.eecc?.nombre || 'Sin ejercicio activo'} - Q{stats.fiscalQ || '?'}</p>
                </div>
                <div className="right">
                    {stats.eecc && (
                        <button className="btn-eecc" onClick={() => setShowEeccModal(true)}>
                            <FiTrendingUp /> <span className="txt">Ver EECC</span>
                        </button>
                    )}
                    <button className="btn-toggle-dash" onClick={onToggle}>
                        {isExpanded ? <><FiChevronUp /> <span className="txt">Contraer</span></> : <><FiChevronDown /> <span className="txt">Expandir</span></>}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <>
                    {!stats.eecc && (
                        <div className="dash-empty-notice">
                            <FiCalendar />
                            <p>No hay un Ejercicio Contable (EECC) activo. Definí uno en el Panel de Administración para ver métricas de objetivos.</p>
                        </div>
                    )}

                    <div className="dash-grid">
                        {/* ... existing dash cards ... */}
                        {/* Card 1: Pipeline List (Vertical) */}
                        <div className="dash-card pipeline-list">
                            <header>
                                <h3><FiFilter /> Pipeline (Estados)</h3>
                            </header>
                            <div className="pipeline-items">
                                {stats.pipeline.map(step => (
                                    <div key={step.etapa_id} className="pipeline-item">
                                        <span className="status-dot" style={{ backgroundColor: step.etapa.color }} />
                                        <span className="name">{step.etapa.nombre}</span>
                                        <span className="val">{step.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card 2: Quoted Gauge (Fuel meter style) */}
                        <div className="dash-card gauge-v2">
                            <header>
                                <h3><FiAward /> Presupuestación Q{stats.fiscalQ}</h3>
                            </header>
                            <div className="gauge-wrap">
                                <div className="gauge-meter">
                                    <svg viewBox="0 0 100 50">
                                        <path className="meter-bg" d="M 10 45 A 35 35 0 0 1 90 45" />
                                        <path
                                            className="meter-fill"
                                            d="M 10 45 A 35 35 0 0 1 90 45"
                                            style={{
                                                strokeDasharray: '126',
                                                strokeDashoffset: 126 - (126 * Math.min(1, (stats.quotedGauge?.actual || 0) / (stats.quotedGauge?.objective || 1)))
                                            }}
                                        />
                                    </svg>
                                    <div className="gauge-val">
                                        <span className="percent">
                                            {Math.round(((stats.quotedGauge?.actual || 0) / (stats.quotedGauge?.objective || 1)) * 100)}%
                                        </span>
                                        <span className="lbl">de ${stats.quotedGauge?.objective?.toLocaleString() || 0}</span>
                                    </div>
                                </div>
                                <div className="gauge-footer">
                                    <label>Presupuestado actual:</label>
                                    <strong>${stats.quotedGauge?.actual?.toLocaleString() || 0}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Monthly Billed vs Goal (Horizontal bars) */}
                        <div className="dash-card monthly-bars">
                            <header>
                                <h3><FiTarget /> Evolución Mensual (Q{stats.fiscalQ})</h3>
                            </header>
                            <div className="bars-list">
                                {(stats.monthlyBilling || []).map(m => (
                                    <div key={m.month} className="bar-row">
                                        <div className="bar-meta">
                                            <label>{m.label || `Mes ${m.month}`}</label>
                                            <span>${m.actual?.toLocaleString() || 0} / ${m.objective?.toLocaleString() || 0}</span>
                                        </div>
                                        <div className="bar-progress">
                                            <div
                                                className="fill"
                                                style={{ width: `${Math.min(100, ((m.actual || 0) / (m.objective || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card 4: Q Summary (PAC, BON, Net) */}
                        <div className="dash-card q-summary facturacion-q">
                            <header>
                                <h3><FiTrendingUp /> Resumen Trimestral</h3>
                            </header>
                            <div className="summary-content">
                                <div className="main-stat">
                                    <label>Facturado vs Objetivo Q</label>
                                    <div className="value-row">
                                        <span className="actual">${stats.quarterlySummary?.net?.toLocaleString() || 0}</span>
                                        <span className="separator">/</span>
                                        <span className="total">${stats.quarterlySummary?.objective?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="progress-bar-minimal">
                                        <div
                                            className="fill"
                                            style={{ width: `${Math.min(100, (stats.quarterlySummary?.net / stats.quarterlySummary?.objective) * 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="footer-stats">
                                    <div className="stat-sm">
                                        <label>Bruto (PAC)</label>
                                        <strong>${stats.quarterlySummary?.pac?.toLocaleString() || 0}</strong>
                                    </div>
                                    <div className="stat-sm">
                                        <label>Bonificado</label>
                                        <strong className="bon-val">-${stats.quarterlySummary?.bon?.toLocaleString() || 0}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </>
            )}

            {(showEeccModal && stats.eecc) && (
                <EeccStatsModal
                    eecc={stats.eecc}
                    onClose={() => setShowEeccModal(false)}
                />
            )}
        </div>
    )
}