import { FiX, FiCheckCircle, FiDollarSign } from 'react-icons/fi'
import { parseLocaleAmount, cleanPriceInput } from '../../utils/format'
import './BudgetAmountModal.scss'

export default function BudgetAmountModal({ leadName, onConfirm, onClose }) {
    const [amount, setAmount] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        const val = parseLocaleAmount(amount)
        if (val <= 0) return
        onConfirm(val)
    }

    return (
        <div className="BudgetAmountModal-overlay" onClick={onClose}>
            <div className="budget-modal-card" onClick={e => e.stopPropagation()}>
                <header>
                    <div className="title-section">
                        <div className="icon-wrap"><FiDollarSign /></div>
                        <div className="txt">
                            <h3>Monto del Presupuesto</h3>
                            <p>Proyectado para <strong>{leadName}</strong></p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="amount-input-container">
                            <span className="currency">$</span>
                            <input
                                autoFocus
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={amount}
                                onChange={e => setAmount(cleanPriceInput(e.target.value))}
                                required
                            />
                        </div>
                        <p className="hint">Ingresá el monto para avanzar a la etapa de presupuesto.</p>
                    </div>

                    <footer>
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-confirm" disabled={!amount || amount <= 0}>
                            <FiCheckCircle /> Confirmar y Cambiar
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
