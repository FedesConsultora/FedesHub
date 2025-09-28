// /frontend/src/components/ui/Modal.jsx
import './ui.scss'

export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null
  return (
    <div className="fh-modalMask">
      <div className="fh-modal">
        <div className="fh-modal__head">{title}</div>
        <div className="fh-modal__body">{children}</div>
        <div className="fh-modal__foot">
          {footer || <button className="fh-btn" onClick={onClose}>Cerrar</button>}
        </div>
      </div>
    </div>
  )
}
