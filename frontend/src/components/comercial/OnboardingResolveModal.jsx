// frontend/src/components/comercial/OnboardingResolveModal.jsx
import React, { useState, useEffect } from 'react'
import { comercialApi } from '../../api/comercial.js'
import { useToast } from '../toast/ToastProvider'
import { FiX, FiCheckCircle, FiXCircle, FiCalendar } from 'react-icons/fi'
import './OnboardingResolveModal.scss'

export default function OnboardingResolveModal({ lead, onClose, onResolved }) {
    const toast = useToast()
    const [catalog, setCatalog] = useState({ motivosPerdida: [] })
    const [saving, setSaving] = useState(false)

    const [decision, setDecision] = useState('si') // si, no, extender

    // No fields
    const [motivoId, setMotivoId] = useState('')
    const [comentario, setComentario] = useState('')

    // Extender fields
    const [newDueAt, setNewDueAt] = useState('')

    useEffect(() => {
        comercialApi.getCatalogs().then(res => setCatalog(res.data))
    }, [])

    const handleResolve = async () => {
        setSaving(true)
        try {
            const payload = {
                decision,
                data: decision === 'no' ? { motivoId, comentario } : (decision === 'extender' ? { new_due_at: newDueAt } : {})
            }
            await comercialApi.resolveOnboarding(lead.id, payload)
            toast.success('Onboarding resuelto')
            onResolved()
        } catch (err) {
            toast.error('Error al resolver onboarding')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="OnboardingResolveModal modal-overlay">
            <div className="modal-content card">
                <header>
                    <h2>Resolver Onboarding Vencido</h2>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="modal-body">
                    <p>El periodo de onboarding para <strong>{lead.empresa || lead.nombre}</strong> ha vencido. ¿Cómo procedemos?</p>

                    <div className="decision-tabs">
                        <button className={decision === 'si' ? 'active si' : ''} onClick={() => setDecision('si')}>
                            <FiCheckCircle /> Convertir a Cliente
                        </button>
                        <button className={decision === 'extender' ? 'active extender' : ''} onClick={() => setDecision('extender')}>
                            <FiCalendar /> Extender Plazo
                        </button>
                        <button className={decision === 'no' ? 'active no' : ''} onClick={() => setDecision('no')}>
                            <FiXCircle /> Perder Post-Onboarding
                        </button>
                    </div>

                    <div className="decision-content mt24">
                        {decision === 'si' && (
                            <p className="hint">Se creará el registro de cliente y se archivará este lead.</p>
                        )}

                        {decision === 'extender' && (
                            <div className="field">
                                <label>Nueva fecha de vencimiento</label>
                                <input type="date" value={newDueAt} onChange={e => setNewDueAt(e.target.value)} />
                            </div>
                        )}

                        {decision === 'no' && (
                            <div className="lose-fields">
                                <div className="field">
                                    <label>Motivo de Pérdida</label>
                                    <select value={motivoId} onChange={e => setMotivoId(e.target.value)}>
                                        <option value="">Seleccionar motivo...</option>
                                        {catalog.motivosPerdida.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="field mt16">
                                    <label>Comentarios</label>
                                    <textarea rows={3} value={comentario} onChange={e => setComentario(e.target.value)} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="actions">
                    <button className="btn-cancel" onClick={onClose}>Cancelar</button>
                    <button className={`btn-confirm ${decision}`} onClick={handleResolve} disabled={saving}>
                        {saving ? 'Guardando...' : 'Confirmar Decisión'}
                    </button>
                </div>
            </div>
        </div>
    )
}
