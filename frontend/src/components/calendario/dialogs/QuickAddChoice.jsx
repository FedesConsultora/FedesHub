import './QuickAddChoice.scss'

export default function QuickAddChoice({ onChoose, onCancel }) {
    return (
        <div className="quick-add-choice">
            <p className="hint">¿Qué deseas agendar para este día?</p>

            <div className="options">
                <button className="opt-btn meeting" onClick={() => onChoose('reunion')}>
                    <div className="icon">🤝</div>
                    <div className="text">
                        <strong>Agendar Reunión</strong>
                        <span>Invita a participantes y genera link de Meet</span>
                    </div>
                </button>

                <button className="opt-btn reminder" onClick={() => onChoose('recordatorio')}>
                    <div className="icon">⏰</div>
                    <div className="text">
                        <strong>Crear Recordatorio</strong>
                        <span>Para tareas personales o avisos rápidos</span>
                    </div>
                </button>
            </div>

            <div className="footer">
                <button className="fh-btn ghost" onClick={onCancel}>Cancelar</button>
            </div>
        </div>
    )
}
