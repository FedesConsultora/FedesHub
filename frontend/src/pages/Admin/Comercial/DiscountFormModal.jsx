// frontend/src/pages/Admin/Comercial/DiscountFormModal.jsx
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiPercent, FiSave } from 'react-icons/fi'
import './AdminComercial.scss'

export default function DiscountFormModal({ discount, onClose, onSave }) {
    const [formData, setFormData] = useState({
        nombre: discount?.nombre || '',
        tipo: discount?.tipo || 'percentage',
        valor: discount?.valor || 0
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave(formData)
    }

    return createPortal(
        <div className="AdminModal modal-overlay" onClick={onClose}>
            <div className="modal-content-card" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="brand">
                        <div className="logo-icon"><FiPercent /></div>
                        <h2>{discount ? 'Editar Descuento' : 'Nuevo Tipo de Descuento'}</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="modal-scroll-body">
                        <div className="field-group">
                            <label className="field-label">Nombre del Descuento</label>
                            <input
                                type="text"
                                className="custom-input"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Ej: Promo Lanzamiento"
                                required
                            />
                        </div>

                        <div className="field-grid mt16">
                            <div className="field-group">
                                <label className="field-label">Tipo de Cálculo</label>
                                <select
                                    className="custom-input"
                                    value={formData.tipo}
                                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                >
                                    <option value="percentage">Porcentaje (%)</option>
                                    <option value="fixed">Monto Fijo ($)</option>
                                </select>
                            </div>
                            <div className="field-group">
                                <label className="field-label">Valor (Numérico)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="custom-input"
                                    value={formData.valor}
                                    onChange={e => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-confirm-win">
                            <FiSave /> {discount ? 'Actualizar' : 'Crear Descuento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
