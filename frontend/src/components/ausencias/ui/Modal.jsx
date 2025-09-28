// src/components/ausencias/ui/Modal.jsx
import { useEffect, useId, useRef } from 'react'
import './Modal.scss'

export default function Modal({ title, onClose, width = 720, children, footer=null }) {
  const boxRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    // Lock scroll
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus modal
    setTimeout(() => boxRef.current?.focus(), 0)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="fh-modal overlay" onClick={onClose} aria-labelledby={title ? titleId : undefined}>
      <div
        className="modal-box"
        style={{ width: `min(${width}px, 92vw)` }}
        onClick={e=>e.stopPropagation()}
        role="dialog" aria-modal="true" tabIndex={-1}
        ref={boxRef}
      >
        <div className="modal-head">
          {title && <h3 id={titleId} className="modal-title">{title}</h3>}
          <button className="modal-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">{children}</div>

        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
