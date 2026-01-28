// frontend/src/pages/Admin/Comercial/ProductFormModal.jsx
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiPackage, FiSave, FiTag, FiDollarSign, FiPercent, FiInfo } from 'react-icons/fi'
import './AdminComercial.scss'

export default function ProductFormModal({ product, onClose, onSave }) {
    const [formData, setFormData] = useState({
        nombre: product?.nombre || '',
        tipo: product?.tipo || 'plan',
        precio_actual: product?.precio_actual || 0,
        es_onboarding_objetivo: product?.es_onboarding_objetivo || false,
        max_descuento_porc: product?.max_descuento_porc || 0
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave(formData)
    }

    return createPortal(
        <div className="AdminModal modal-overlay" onClick={onClose}>
            <div className="modal-content-card premium-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="brand">
                        <div className="logo-icon"><FiPackage /></div>
                        <div className="txt">
                            <h2>{product ? 'Editar Producto' : 'Nuevo Producto / Plan'}</h2>
                            <p>{product ? 'Actualiza los detalles del servicio' : 'Define un nuevo servicio o plan comercial'}</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="modal-scroll-body">
                        <div className="premium-field">
                            <FiPackage className="ico" />
                            <div className="field-content">
                                <label className="field-label">Nombre del Producto / Plan</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Plan Corporativo Mensual"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row mt16">
                            <div className="form-item">
                                <div className="premium-field">
                                    <FiTag className="ico" />
                                    <div className="field-content">
                                        <label className="field-label">Categoría / Tipo</label>
                                        <select
                                            value={formData.tipo}
                                            onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                        >
                                            <option value="plan">Plan / Abono</option>
                                            <option value="onboarding">Onboarding / Fee Inicial</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="form-item">
                                <div className="premium-field">
                                    <FiDollarSign className="ico" />
                                    <div className="field-content">
                                        <label className="field-label">Precio de Lista (ARS)</label>
                                        <input
                                            type="number"
                                            value={formData.precio_actual}
                                            onChange={e => setFormData({ ...formData, precio_actual: parseFloat(e.target.value) })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="premium-field mt16">
                            <FiPercent className="ico" />
                            <div className="field-content">
                                <label className="field-label">Tope Máximo de Descuento (%)</label>
                                <input
                                    type="number"
                                    value={formData.max_descuento_porc}
                                    onChange={e => setFormData({ ...formData, max_descuento_porc: parseFloat(e.target.value) })}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                />
                            </div>
                        </div>
                        <span className="field-hint" style={{ marginLeft: '16px' }}>
                            Usa 0 para no establecer un límite individual para este producto.
                        </span>

                        {formData.tipo === 'onboarding' && (
                            <div className="mt24">
                                <div className="info-box mb16">
                                    <FiInfo />
                                    <p>
                                        Los productos de tipo Onboarding pueden ser marcados como "objetivo" para el cálculo de metas mensuales del equipo.
                                    </p>
                                </div>
                                <label className="checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={formData.es_onboarding_objetivo}
                                        onChange={e => setFormData({ ...formData, es_onboarding_objetivo: e.target.checked })}
                                    />
                                    <span>¿Utilizar para el seguimiento de objetivos mensuales?</span>
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-confirm-win">
                            <FiSave /> {product ? 'Guardar Cambios' : 'Crear Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
