// frontend/src/pages/Admin/Comercial/EeccFormModal.jsx
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiCalendar, FiSave, FiCheckCircle } from 'react-icons/fi'
import './AdminComercial.scss'

export default function EeccFormModal({ eecc, onClose, onSave }) {
    const [formData, setFormData] = useState({
        nombre: eecc?.nombre || '',
        start_at: eecc?.start_at ? new Date(eecc.start_at).toISOString().split('T')[0] : '',
        end_at: eecc?.end_at ? new Date(eecc.end_at).toISOString().split('T')[0] : ''
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
                        <div className="logo-icon"><FiCalendar /></div>
                        <div className="txt">
                            <h2>{eecc ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</h2>
                            <p>Definición de período contable y fiscal</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="modal-scroll-body">
                        <div className="form-section">
                            <div className="field-group">
                                <label className="field-label">Nombre del Ejercicio</label>
                                <input
                                    type="text"
                                    className="custom-input"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Año Fiscal 2026 - Q2"
                                    required
                                />
                                <span className="field-hint">Usá un nombre descriptivo para identificarlo fácilmente.</span>
                            </div>

                            <div className="field-grid mt24">
                                <div className="field-group">
                                    <label className="field-label">Fecha de Inicio</label>
                                    <div className="input-with-icon">
                                        <input
                                            type="date"
                                            className="custom-input"
                                            value={formData.start_at}
                                            onChange={e => setFormData({ ...formData, start_at: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="field-label">Fecha de Fin</label>
                                    <div className="input-with-icon">
                                        <input
                                            type="date"
                                            className="custom-input"
                                            value={formData.end_at}
                                            onChange={e => setFormData({ ...formData, end_at: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="info-box mt24">
                            <FiCheckCircle />
                            <p>Al crear un ejercicio, se habilitará la configuración de objetivos mensuales para cada mes dentro del rango.</p>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-confirm-win">
                            <FiSave /> {eecc ? 'Actualizar Cambios' : 'Crear Ejercicio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
