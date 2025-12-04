// components/ModalPanel.jsx
import { useRef } from 'react'
import './modal-panel.scss'

export default function ModalPanel({ open, onClose, children }) {
  const mouseDownTarget = useRef(null)

  if (!open) return null

  // Only close if mousedown AND mouseup happened on the overlay itself
  // This prevents closing when user drags text selection outside the panel
  const handleMouseDown = (e) => {
    mouseDownTarget.current = e.target
  }

  const handleClick = (e) => {
    // Only close if click started and ended on the overlay (not a drag from inside)
    if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
      onClose()
    }
    mouseDownTarget.current = null
  }

  return (
    <div
      className="modalOverlay"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="modalPanel" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
