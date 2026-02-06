import React, { useState } from 'react'
import { FiX, FiCheck, FiMessageSquare } from 'react-icons/fi'
import './ConfirmModal.scss' // Reusing styles and adding some specific ones

export default function PromptModal({
    title = 'Indica el motivo',
    message = 'Por favor, describe la razón para esta acción.',
    placeholder = 'Escribe aquí...',
    confirmText = 'Procesar',
    cancelText = 'Cancelar',
    onConfirm,
    onClose,
    type = 'info', // danger, warning, info
    initialValue = ''
}) {
    const [value, setValue] = useState(initialValue)

    const handleSubmit = (e) => {
        e.preventDefault()
        onConfirm(value)
    }

    return (
        <div className="ConfirmModal-overlay" onClick={onClose}>
            <div className={`confirm-card ${type}`} onClick={e => e.stopPropagation()}>
                <header>
                    <div className="icon-wrap">
                        <FiMessageSquare />
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="content" style={{ paddingBottom: '0' }}>
                    <h3>{title}</h3>
                    <p>{message}</p>
                    <form id="prompt-form" onSubmit={handleSubmit}>
                        <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                            <textarea
                                autoFocus
                                className="fh-textarea"
                                placeholder={placeholder}
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                style={{ minHeight: '140px' }}
                            />
                        </div>
                    </form>
                </div>

                <footer>
                    <button className="btn-cancel" onClick={onClose}>{cancelText}</button>
                    <button className="btn-confirm" onClick={() => onConfirm(value)}>
                        <FiCheck /> {confirmText}
                    </button>
                </footer>
            </div>
        </div>
    )
}
