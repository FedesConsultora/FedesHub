import React from 'react'
import { FiAlertTriangle, FiX, FiCheck } from 'react-icons/fi'
import './ConfirmModal.scss'

export default function ConfirmModal({
    title = '¿Estás seguro?',
    message = 'Esta acción no se puede deshacer.',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onClose,
    type = 'danger' // danger, warning, info
}) {
    return (
        <div className="ConfirmModal-overlay" onClick={onClose}>
            <div className={`confirm-card ${type}`} onClick={e => e.stopPropagation()}>
                <header>
                    <div className="icon-wrap">
                        <FiAlertTriangle />
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="content">
                    <h3>{title}</h3>
                    <p>{message}</p>
                </div>

                <footer>
                    <button className="btn-cancel" onClick={onClose}>{cancelText}</button>
                    <button className="btn-confirm" onClick={onConfirm}>
                        <FiCheck /> {confirmText}
                    </button>
                </footer>
            </div>
        </div>
    )
}
