// frontend/src/pages/Admin/Comercial/EeccStatsModal.jsx
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiBarChart2 } from 'react-icons/fi'
import { comercialApi } from '../../../api/comercial'
import './EeccStatsModal.scss'

export default function EeccStatsModal({ eecc, onClose }) {
    const [stats, setStats] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const res = await comercialApi.getEeccStats(eecc.id)
                setStats(res.data)
            } catch (e) {
                console.error('Error loading EECC stats:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [eecc.id])

    const safeMaxVal = Math.max(...stats.map(d => {
        const total = (parseFloat(d.net) || 0) + (parseFloat(d.bon) || 0)
        const obj = parseFloat(d.objective) || 0
        return Math.max(total, obj)
    }), 1)

    const maxVal = safeMaxVal <= 0 ? 1 : safeMaxVal

    return createPortal(
        <div className="EeccStatsModal modal-overlay" onClick={onClose}>
            <div className="modal-content-card" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="brand">
                        <div className="logo-icon"><FiBarChart2 /></div>
                        <h2>Análisis de Ejercicio: {eecc.nombre}</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="modal-scroll-body">
                    {loading ? (
                        <div className="loading-state">Calculando estados...</div>
                    ) : (
                        <div className="eecc-analytics">
                            <div className="chart-container">
                                <div className="chart-y-axis">
                                    <span>${(maxVal / 1000000).toFixed(1)}M</span>
                                    <span>${(maxVal / 2000000).toFixed(1)}M</span>
                                    <span>$0</span>
                                </div>
                                <div className="stacked-bars">
                                    {stats.map(d => {
                                        const net = parseFloat(d.net) || 0
                                        const bon = parseFloat(d.bon) || 0
                                        const obj = parseFloat(d.objective) || 0

                                        const netH = Math.max(0, (net / maxVal) * 100)
                                        const bonH = Math.max(0, (bon / maxVal) * 100)
                                        const objPos = Math.max(0, (obj / maxVal) * 100)

                                        return (
                                            <div key={d.q} className="q-col">
                                                <div className="bar-area">
                                                    <div className="bar-stack">
                                                        <div
                                                            className="segment bon"
                                                            style={{ height: `${bonH}%` }}
                                                            title={`Bonificado: $${bon.toLocaleString()}`}
                                                        />
                                                        <div
                                                            className="segment net"
                                                            style={{ height: `${netH}%` }}
                                                            title={`Resultado/Neto: $${net.toLocaleString()}`}
                                                        />
                                                    </div>
                                                    <div
                                                        className="objective-dot"
                                                        style={{ bottom: `${objPos}%` }}
                                                        title={`Objetivo: $${obj.toLocaleString()}`}
                                                    />
                                                </div>
                                                <div className="q-label">Q{d.q}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="chart-legend">
                                <div className="legend-item">
                                    <div className="box net"></div>
                                    <span>Resultado (Neto)</span>
                                </div>
                                <div className="legend-item">
                                    <div className="box bon"></div>
                                    <span>Bonificado (BON)</span>
                                </div>
                                <div className="legend-item">
                                    <div className="dot"></div>
                                    <span>Objetivo Facturación</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
