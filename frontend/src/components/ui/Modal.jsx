// /frontend/src/components/ui/Modal.jsx
import './ui.scss'

export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null
  return (
    <div className="fh-modalMask">
      <div className="fh-modal">
        <div className="fh-modal__head">
          <span>{title}</span>
          <button className="fh-modal__close" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="fh-modal__body">{children}</div>
        <div className="fh-modal__foot">
          {footer || <button className="fh-btn" onClick={onClose}>Cerrar</button>}
        </div>
      </div>
    </div>
  )
}
