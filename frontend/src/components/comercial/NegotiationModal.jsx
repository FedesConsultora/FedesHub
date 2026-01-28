// frontend/src/components/comercial/NegotiationModal.jsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { comercialApi } from '../../api/comercial.js'
import { useToast } from '../toast/ToastProvider'
import { FiX, FiCheckCircle, FiXCircle, FiAward, FiAlertCircle } from 'react-icons/fi'
import '../../pages/Admin/Comercial/AdminComercial.scss'
import CustomSelect from '../common/CustomSelect.jsx'
import './NegotiationModal.scss'

export default function NegotiationModal({ lead, mode, onClose, onWon, onLost }) {
    const toast = useToast()
    const [catalog, setCatalog] = useState({ motivosPerdida: [], productos: [], descuentos: [] })
    const [saving, setSaving] = useState(false)

    // Win fields
    const [ruta, setRuta] = useState('alta_directa')
    const [selectedProductoId, setSelectedProductoId] = useState('')
    const [selectedDescuentoId, setSelectedDescuentoId] = useState('')
    const [bonificadoManual, setBonificadoManual] = useState(0)

    // Lose fields
    const [motivoId, setMotivoId] = useState('')
    const [comentario, setComentario] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                const [cats, prods, descs] = await Promise.all([
                    comercialApi.getCatalogs(),
                    comercialApi.listProductos(),
                    comercialApi.listDescuentos()
                ]);
                setCatalog({
                    ...cats.data,
                    productos: prods.data || [],
                    descuentos: descs.data || []
                });
            } catch (err) {
                console.error("Error loading negotiation catalogs:", err);
            }
        };
        load();
    }, [mode])

    const selectedProducto = Array.isArray(catalog.productos) ? catalog.productos.find(p => String(p.id) === String(selectedProductoId)) : null;
    const selectedDescuento = Array.isArray(catalog.descuentos) ? catalog.descuentos.find(d => String(d.id) === String(selectedDescuentoId)) : null;

    const calculateBonificado = () => {
        if (!selectedDescuento || !selectedProducto) return 0;
        if (selectedDescuento.tipo === 'percentage') {
            return (parseFloat(selectedProducto.precio_actual) * parseFloat(selectedDescuento.valor)) / 100;
        }
        return parseFloat(selectedDescuento.valor);
    }

    const bonificado = calculateBonificado();
    const bruto = selectedProducto ? parseFloat(selectedProducto.precio_actual) : 0;
    const neto = bruto - bonificado;

    const handleWin = async () => {
        if (ruta === 'onboarding' && !selectedProductoId) return toast.warning('Seleccioná un producto');
        setSaving(true)
        try {
            await comercialApi.winNegotiation(lead.id, {
                ruta,
                onboardingData: {
                    tipo: selectedProducto?.nombre || 'General',
                    producto_id: selectedProductoId,
                    bonificado_ars: bonificado,
                    start_at: new Date()
                }
            })
            toast.success('¡Negociación ganada!')
            onWon()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al procesar victoria')
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
        <div className="AdminModal modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
            <div className={`modal-content-card premium-modal ${mode}`} onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="brand">
                        <div className="logo-icon">
                            {mode === 'win' ? <FiAward /> : <FiXCircle />}
                        </div>
                        <div className="txt">
                            <h2>{mode === 'win' ? '¡Negociación Ganada!' : 'Marcar como Perdido'}</h2>
                            <p>{mode === 'win' ? '¡Felicitaciones por el cierre!' : 'Indicanos los motivos para mejorar el proceso'}</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="modal-scroll-body">
                    {mode === 'win' ? (
                        // WIN logic is handled by WinNegotiationModal, but this is a fallback or original code
                        <div className="win-content">
                            <p className="intro-text mb16">
                                Felicitaciones por cerrar a <strong>{lead.empresa || lead.nombre}</strong>.
                            </p>
                            {/* ... Rest of win logic if needed, but we'll focus on LOSE here since WinNegotiationModal is preferred */}
                        </div>
                    ) : (
                        <div className="lose-content">
                            <div className="premium-field">
                                <FiXCircle className="ico" />
                                <div className="field-content">
                                    <label className="field-label">Motivo de Pérdida</label>
                                    <select
                                        value={motivoId}
                                        onChange={e => setMotivoId(e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccionar motivo...</option>
                                        {(catalog.motivosPerdida || []).map(m => (
                                            <option key={m.id} value={m.id}>{m.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="premium-field mt16">
                                <div className="field-content">
                                    <label className="field-label">Comentarios / Feedback</label>
                                    <textarea
                                        rows={4}
                                        value={comentario}
                                        onChange={e => setComentario(e.target.value)}
                                        placeholder="¿Hay algo más que debamos saber del proceso?"
                                        style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', resize: 'none' }}
                                    />
                                </div>
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
                        <button className="btn-confirm-lose" style={{ backgroundColor: '#f87171', color: 'white' }} onClick={handleLose} disabled={saving}>
                            {saving ? 'Procesando...' : 'Confirmar Pérdida'}
                        </button>
                    )}
                </div>
            </div>
        </div>
        ,
        document.body
    )
}
