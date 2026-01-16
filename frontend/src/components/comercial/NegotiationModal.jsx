// frontend/src/components/comercial/NegotiationModal.jsx
import React, { useState, useEffect } from 'react'
import { comercialApi } from '../../api/comercial.js'
import { useToast } from '../toast/ToastProvider'
import { FiX, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import './NegotiationModal.scss'

export default function NegotiationModal({ lead, mode, onClose, onWon, onLost }) {
    const toast = useToast()
    const [catalog, setCatalog] = useState({ motivosPerdida: [] })
    const [saving, setSaving] = useState(false)

    // Win fields
    const [ruta, setRuta] = useState('alta_directa')
    const [onboardingType, setOnboardingType] = useState('Type A')

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

    return (
        <div className="NegotiationModal modal-overlay">
            <div className={`modal-content card ${mode}`}>
                <header>
                    <h2>{mode === 'win' ? '¡Ganamos el Lead!' : 'Marcar como Perdido'}</h2>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="modal-body">
                    {mode === 'win' ? (
                        <div className="win-content">
                            <p>Felicitaciones por cerrar a <strong>{lead.empresa || lead.nombre}</strong>. ¿Cuál es el siguiente paso?</p>

                            <div className="radio-group">
                                <label className={ruta === 'alta_directa' ? 'active' : ''}>
                                    <input type="radio" name="ruta" value="alta_directa" checked={ruta === 'alta_directa'} onChange={e => setRuta(e.target.value)} />
                                    <div className="opt-meta">
                                        <strong>Alta Directiva</strong>
                                        <span>Convertir a cliente inmediatamente</span>
                                    </div>
                                </label>
                                <label className={ruta === 'onboarding' ? 'active' : ''}>
                                    <input type="radio" name="ruta" value="onboarding" checked={ruta === 'onboarding'} onChange={e => setRuta(e.target.value)} />
                                    <div className="opt-meta">
                                        <strong>Onboarding (60 días)</strong>
                                        <span>Iniciar proceso de integración</span>
                                    </div>
                                </label>
                            </div>

                            {ruta === 'onboarding' && (
                                <div className="onboarding-opts mt16">
                                    <label>Tipo de Onboarding</label>
                                    <select value={onboardingType} onChange={e => setOnboardingType(e.target.value)}>
                                        <option value="Standard">Standard</option>
                                        <option value="Premium">Premium</option>
                                        <option value="Light">Light</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="lose-content">
                            <p>Sentimos que no se haya dado esta vez. Por favor, indicanos qué pasó:</p>

                            <div className="field">
                                <label>Motivo de Pérdida</label>
                                <select value={motivoId} onChange={e => setMotivoId(e.target.value)}>
                                    <option value="">Seleccionar motivo...</option>
                                    {catalog.motivosPerdida.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                </select>
                            </div>

                            <div className="field mt16">
                                <label>Comentarios adicionales</label>
                                <textarea rows={4} value={comentario} onChange={e => setComentario(e.target.value)} placeholder="¿Hay algo más que debamos saber?" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="actions">
                    <button className="btn-cancel" onClick={onClose}>Cancelar</button>
                    {mode === 'win' ? (
                        <button className="btn-win" onClick={handleWin} disabled={saving}>
                            {saving ? 'Procesando...' : 'Confirmar Victoria'}
                        </button>
                    ) : (
                        <button className="btn-lose" onClick={handleLose} disabled={saving}>
                            {saving ? 'Procesando...' : 'Confirmar Pérdida'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
