// components/ModalPanel.jsx
import './modal-panel.scss'

export default function ModalPanel({ open, onClose, children }) {
  if (!open) return null

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalPanel" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
