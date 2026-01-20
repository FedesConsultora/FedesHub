// frontend/src/components/comercial/NegotiationModal.jsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { comercialApi } from '../../api/comercial.js'
import { useToast } from '../toast/ToastProvider'
import { FiX, FiCheckCircle, FiXCircle, FiAward, FiAlertCircle } from 'react-icons/fi'
import CustomSelect from '../common/CustomSelect.jsx'
import './NegotiationModal.scss'

export default function NegotiationModal({ lead, mode, onClose, onWon, onLost }) {
    const toast = useToast()
    const [catalog, setCatalog] = useState({ motivosPerdida: [] })
    const [saving, setSaving] = useState(false)

    // Win fields
    const [ruta, setRuta] = useState('alta_directa')
    const [onboardingType, setOnboardingType] = useState('Digital')

    // Lose fields
    const [motivoId, setMotivoId] = useState('')
    const [comentario, setComentario] = useState('')

    useEffect(() => {
        if (mode === 'lose') {
            comercialApi.getCatalogs().then(res => setCatalog(res.data))
        }
    }, [mode])

    const handleWin = async () => {
        setSaving(true)
        try {
            await comercialApi.winNegotiation(lead.id, {
                ruta,
                onboardingData: ruta === 'onboarding' ? { tipo: onboardingType } : null
            })
            toast.success('¡Negociación ganada!')
            onWon()
        } catch (err) {
            toast.error('Error al procesar victoria')
        } finally {
            setSaving(false)
        }
    }

    const handleLose = async () => {
        if (!motivoId) return toast.warning('Seleccioná un motivo')
        setSaving(true)
        try {
            await comercialApi.loseNegotiation(lead.id, {
                motivo_id: motivoId,
                comentario
            })
            toast.success('Lead marcado como perdido')
            onLost()
        } catch (err) {
            toast.error('Error al processar pérdida')
        } finally {
            setSaving(false)
        }
    }

    return createPortal(
        <div className="NegotiationModal modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
            <div className={`modal-content-card ${mode}`} onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="brand">
                        <div className="logo-icon">
                            {mode === 'win' ? <FiAward /> : <FiAlertCircle />}
                        </div>
                        <h2>{mode === 'win' ? '¡Ganamos el Lead!' : 'Marcar como Perdido'}</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="modal-scroll-body">
                    {mode === 'win' ? (
                        <div className="win-content">
                            <p className="intro-text">Felicitaciones por cerrar a <strong>{lead.empresa || lead.nombre}</strong>. ¿Cuál es el siguiente paso?</p>

                            <div className="choice-group">
                                <label className={`choice-item ${ruta === 'alta_directa' ? 'active' : ''}`}>
                                    <input type="radio" name="ruta" value="alta_directa" checked={ruta === 'alta_directa'} onChange={e => setRuta(e.target.value)} />
                                    <div className="radio-mark"></div>
                                    <div className="opt-meta">
                                        <strong>Alta Directiva</strong>
                                        <span>Convertir a cliente inmediatamente</span>
                                    </div>
                                </label>
                                <label className={`choice-item ${ruta === 'onboarding' ? 'active' : ''}`}>
                                    <input type="radio" name="ruta" value="onboarding" checked={ruta === 'onboarding'} onChange={e => setRuta(e.target.value)} />
                                    <div className="radio-mark"></div>
                                    <div className="opt-meta">
                                        <strong>Onboarding (60 días)</strong>
                                        <span>Iniciar proceso de integración</span>
                                    </div>
                                </label>
                            </div>

                            {ruta === 'onboarding' && (
                                <div className="choice-extra mt24">
                                    <label className="field-label">Tipo de Onboarding</label>
                                    <CustomSelect
                                        options={[
                                            { value: 'Digital', label: 'Digital' },
                                            { value: 'Identidad', label: 'Identidad' },
                                            { value: 'Mercado', label: 'Mercado' }
                                        ]}
                                        value={[onboardingType]}
                                        onChange={(next) => setOnboardingType(next[0])}
                                        multi={false}
                                        placeholder="Seleccionar tipo..."
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="lose-content">
                            <p className="intro-text">Sentimos que no se haya dado esta vez. Por favor, indicanos qué pasó:</p>

                            <div className="field-group">
                                <label className="field-label">Motivo de Pérdida</label>
                                <CustomSelect
                                    options={catalog.motivosPerdida.map(m => ({ value: String(m.id), label: m.nombre }))}
                                    value={motivoId ? [String(motivoId)] : []}
                                    onChange={(next) => setMotivoId(next[0])}
                                    multi={false}
                                    placeholder="Seleccionar motivo..."
                                />
                            </div>

                            <div className="field-group mt24">
                                <label className="field-label">Comentarios adicionales</label>
                                <textarea
                                    className="custom-textarea"
                                    rows={4}
                                    value={comentario}
                                    onChange={e => setComentario(e.target.value)}
                                    placeholder="¿Hay algo más que debamos saber?"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    {mode === 'win' ? (
                        <button className="btn-confirm-win" onClick={handleWin} disabled={saving}>
                            {saving ? 'Procesando...' : 'Confirmar Victoria'}
                        </button>
                    ) : (
                        <button className="btn-confirm-lose" onClick={handleLose} disabled={saving}>
                            {saving ? 'Procesando...' : 'Confirmar Pérdida'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
