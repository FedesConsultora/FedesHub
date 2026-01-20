// frontend/src/components/comercial/OnboardingResolveModal.jsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { comercialApi } from '../../api/comercial.js'
import { useToast } from '../toast/ToastProvider'
import { FiX, FiCheckCircle, FiXCircle, FiCalendar, FiClock } from 'react-icons/fi'
import CustomSelect from '../common/CustomSelect.jsx'
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

    return createPortal(
        <div className="OnboardingResolveModal modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
            <div className="modal-content-card" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="brand">
                        <div className="logo-icon">
                            <FiClock />
                        </div>
                        <h2>Resolver Onboarding Vencido</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="modal-scroll-body">
                    <p className="intro-text">El periodo de onboarding para <strong>{lead.empresa || lead.nombre}</strong> ha vencido. ¿Cómo procedemos?</p>

                    <div className="decision-chips">
                        <button
                            className={`decision-chip si ${decision === 'si' ? 'active' : ''}`}
                            onClick={() => setDecision('si')}
                        >
                            <FiCheckCircle />
                            <span>Convertir a Cliente</span>
                        </button>
                        <button
                            className={`decision-chip extender ${decision === 'extender' ? 'active' : ''}`}
                            onClick={() => setDecision('extender')}
                        >
                            <FiCalendar />
                            <span>Extender Plazo</span>
                        </button>
                        <button
                            className={`decision-chip no ${decision === 'no' ? 'active' : ''}`}
                            onClick={() => setDecision('no')}
                        >
                            <FiXCircle />
                            <span>Perder Post-Onboarding</span>
                        </button>
                    </div>

                    <div className="decision-content mt24">
                        {decision === 'si' && (
                            <div className="hint-box">
                                <FiCheckCircle className="hint-icon" />
                                <p>Se creará el registro de cliente y se archivará este lead automáticamente.</p>
                            </div>
                        )}

                        {decision === 'extender' && (
                            <div className="field-group">
                                <label className="field-label">Nueva fecha de vencimiento</label>
                                <div className="custom-input-wrapper">
                                    <FiCalendar className="input-icon" />
                                    <input
                                        type="date"
                                        className="custom-input"
                                        value={newDueAt}
                                        onChange={e => setNewDueAt(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {decision === 'no' && (
                            <div className="lose-fields-group">
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
                                <div className="field-group mt16">
                                    <label className="field-label">Comentarios</label>
                                    <textarea
                                        className="custom-textarea"
                                        rows={3}
                                        value={comentario}
                                        onChange={e => setComentario(e.target.value)}
                                        placeholder="Explicación breve de la pérdida..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className={`btn-confirm-resolve ${decision}`} onClick={handleResolve} disabled={saving}>
                        {saving ? 'Guardando...' : 'Confirmar Decisión'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
