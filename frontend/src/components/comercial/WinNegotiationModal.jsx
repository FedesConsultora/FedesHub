// frontend/src/components/comercial/WinNegotiationModal.jsx
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiCheck, FiX, FiDollarSign, FiPackage, FiAward, FiArrowRight, FiActivity, FiTarget } from 'react-icons/fi'
import { comercialApi } from '../../api/comercial'
import { parseLocaleAmount, cleanPriceInput } from '../../utils/format'
import '../../pages/Admin/Comercial/AdminComercial.scss' // Import shared modal styles
import './WinNegotiationModal.scss'

export default function WinNegotiationModal({ lead, onClose, onConfirm }) {
    const [products, setProducts] = useState([])
    const [discounts, setDiscounts] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedProductId, setSelectedProductId] = useState('')
    const [selectedDiscountId, setSelectedDiscountId] = useState('')
    const [finalPrice, setFinalPrice] = useState('')
    const [ruta, setRuta] = useState('onboarding') // 'onboarding' o 'alta_directa'
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, discRes, statsRes] = await Promise.all([
                    comercialApi.listProductos(),
                    comercialApi.listDescuentos(),
                    comercialApi.getStats()
                ])
                setProducts(prodRes.data || [])
                setDiscounts(discRes.data || [])
                setStats(statsRes.data)
            } catch (err) {
                console.error('Error fetching data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const selectedProduct = products.find(p => String(p.id) === String(selectedProductId))
    const selectedDiscount = discounts.find(d => String(d.id) === String(selectedDiscountId))

    useEffect(() => {
        if (selectedProduct) {
            let price = parseFloat(selectedProduct.precio_actual)
            if (selectedDiscount) {
                const desc = parseFloat(selectedDiscount.valor)
                if (!isNaN(desc)) {
                    price = price * (1 - desc / 100)
                }
            }
            setFinalPrice(isNaN(price) ? '' : price.toFixed(2).replace('.', ','))
        }
    }, [selectedProduct, selectedDiscount])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!selectedProductId || !finalPrice) return

        setSubmitting(true)
        try {
            const parsedFinal = parseLocaleAmount(finalPrice)
            const bruto = parseFloat(selectedProduct.precio_actual)
            const bonificado = bruto - parsedFinal

            const onboardingData = {
                tipo: selectedProduct?.tipo || 'plan',
                producto_id: selectedProductId,
                descuento_id: selectedDiscountId || null,
                bonificado_ars: bonificado > 0 ? bonificado : 0,
                precio_final: parsedFinal
            }

            await onConfirm(ruta, onboardingData)
            onClose()
        } catch (err) {
            console.error('Error in win negotiation:', err)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return null

    return createPortal(
        <div className="AdminModal modal-overlay" onClick={onClose}>
            <div className="modal-content-card premium-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="brand">
                        <div className="logo-icon"><FiAward /></div>
                        <div className="txt">
                            <h2>¡Negociación Ganada!</h2>
                            <p>Completa los detalles para cerrar a {lead.empresa || lead.nombre}</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="modal-scroll-body">
                        <div className="premium-field">
                            <FiPackage className="ico" />
                            <div className="field-content">
                                <label className="field-label">Producto / Plan Elegido</label>
                                <select
                                    value={selectedProductId}
                                    onChange={e => setSelectedProductId(e.target.value)}
                                    required
                                >
                                    <option value="">Elegir un plan...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            [{p.tipo === 'onboarding' ? 'OB' : 'PLAN'}] {p.nombre} (Lista: ${parseFloat(p.precio_actual).toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="premium-field mt16">
                            <FiTarget className="ico" />
                            <div className="field-content">
                                <label className="field-label">Descuento Aplicado</label>
                                <select
                                    value={selectedDiscountId}
                                    onChange={e => setSelectedDiscountId(e.target.value)}
                                >
                                    <option value="">Sin descuento adicional...</option>
                                    {discounts.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.nombre} ({parseFloat(d.valor)}%)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="premium-field mt16">
                            <FiDollarSign className="ico" />
                            <div className="field-content">
                                <label className="field-label">Monto Final Acordado (ARS)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={finalPrice}
                                    onChange={e => setFinalPrice(cleanPriceInput(e.target.value))}
                                    required
                                    placeholder="Importe de cierre..."
                                />
                                <span className="hint-text" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
                                    Acepta puntos y comas. Calculado automáticamente si elegís producto/descuento.
                                </span>
                            </div>
                        </div>

                        {stats?.quarterlySummary && (
                            <div className="info-box mt16" style={{ background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                <FiActivity style={{ color: '#34d399' }} />
                                <div style={{ fontSize: '0.85rem', flex: 1 }}>
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                                        Presupuesto Q{stats.fiscalQ} (Bonificaciones):
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                        <span>
                                            Utilizado: <strong style={{ color: stats.quarterlySummary.bon > 0 ? '#ef4444' : '#34d399' }}>
                                                ${parseFloat(stats.quarterlySummary.bon).toLocaleString()}
                                            </strong>
                                        </span>
                                        {stats.quarterlySummary.discount_cap > 0 && (
                                            <span>
                                                Restante: <strong style={{ color: (stats.quarterlySummary.discount_cap - stats.quarterlySummary.bon) > 0 ? '#34d399' : '#ef4444' }}>
                                                    ${Math.max(0, stats.quarterlySummary.discount_cap - stats.quarterlySummary.bon).toLocaleString()}
                                                </strong>
                                            </span>
                                        )}
                                    </div>
                                    {stats.quarterlySummary.discount_cap > 0 && (
                                        <div className="progress-mini" style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                background: (stats.quarterlySummary.bon / stats.quarterlySummary.discount_cap) > 0.9 ? '#ef4444' : '#34d399',
                                                width: `${Math.min(100, (stats.quarterlySummary.bon / stats.quarterlySummary.discount_cap) * 100)}%`
                                            }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {lead?.presupuesto_ars > 0 && (
                            <div className="info-box mt16">
                                <FiActivity />
                                <p>
                                    El presupuesto estimado original era de <strong>${parseFloat(lead.presupuesto_ars).toLocaleString()}</strong>.
                                </p>
                            </div>
                        )}

                        <div className="ruta-selector mt24">
                            <label className="field-label mb16" style={{ display: 'block', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                                Proceso Post-Cierre
                            </label>
                            <div className="options-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div
                                    className={`opt-card ${ruta === 'onboarding' ? 'active' : ''}`}
                                    onClick={() => setRuta('onboarding')}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '16px',
                                        background: ruta === 'onboarding' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${ruta === 'onboarding' ? '#34d399' : 'rgba(255,255,255,0.1)'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <strong style={{ display: 'block', color: ruta === 'onboarding' ? '#34d399' : 'white' }}>Onboarding</strong>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Proceso de implementación (60 días)</span>
                                </div>
                                <div
                                    className={`opt-card ${ruta === 'alta_directa' ? 'active' : ''}`}
                                    onClick={() => setRuta('alta_directa')}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '16px',
                                        background: ruta === 'alta_directa' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${ruta === 'alta_directa' ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <strong style={{ display: 'block', color: ruta === 'alta_directa' ? '#3b82f6' : 'white' }}>Alta Directa</strong>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Pasa directamente a cliente activo</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-confirm-win" disabled={!selectedProductId || submitting}>
                            {submitting ? 'Procesando...' : <><FiCheck /> Confirmar Cierre</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
