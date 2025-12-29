import { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiMessageSquare, FiUser, FiMail, FiPhone } from 'react-icons/fi'
import Avatar from '../../Avatar'
import useFederDetail from '../../../hooks/useFederDetail'
import './ProfileQuickView.scss'

export default function ProfileQuickView({ federId, anchorRect, onClose, onViewFull, onMessage }) {
    const { data: feder, loading } = useFederDetail(federId)
    const [pos, setPos] = useState({ top: 0, left: 0 })
    const popoverRef = useRef(null)

    useEffect(() => {
        if (!anchorRect) return

        // Position logic
        const gap = 12
        const popHeight = 280
        const popWidth = 320

        let top = anchorRect.top + window.scrollY
        let left = anchorRect.right + gap

        // Check viewport bounds
        if (left + popWidth > window.innerWidth) {
            left = anchorRect.left - popWidth - gap
        }

        if (top + popHeight > window.innerHeight + window.scrollY) {
            top = window.innerHeight + window.scrollY - popHeight - 20
        }

        setPos({ top, left })
    }, [anchorRect])

    // Close on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [onClose])

    if (!feder && loading) {
        return createPortal(
            <div className="pfQuickView loading" style={{ top: pos.top, left: pos.left }}>
                <div className="qvLoading">
                    <div className="qvSpinner" />
                    <span>Cargando perfil...</span>
                </div>
            </div>,
            document.body
        )
    }

    if (!feder) return null

    const fullName = `${feder.nombre} ${feder.apellido}`

    return createPortal(
        <div
            className="pfQuickView"
            ref={popoverRef}
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={() => {
                // Prevent closing if mouse enters popover
            }}
            onMouseLeave={onClose}
        >
            <div className="qHeader">
                <Avatar src={feder.avatar_url} name={fullName} size={64} enablePreview={false} />
                <div className="qMainInfo">
                    <div className="qName">{fullName}</div>
                    <div className="qRole">{feder.cargo_principal || 'Sin cargo'}</div>
                    {feder.celula_nombre && <div className="qCell">{feder.celula_nombre}</div>}
                </div>
            </div>

            <div className="qBody">
                <div className="qItem" title="Correo electrónico">
                    <FiMail /> <span>{feder.user_email || feder.email || '—'}</span>
                </div>
                <div className="qItem" title="WhatsApp / Celular">
                    <FiPhone /> <span>{feder.telefono || '—'}</span>
                </div>
            </div>

            <div className="qActions">
                <button className="qBtn primary" onClick={() => { onMessage?.(feder); onClose(); }}>
                    <FiMessageSquare /> Mensaje
                </button>
                <button className="qBtn" onClick={() => { onViewFull?.(federId); onClose(); }}>
                    <FiUser /> Ver Perfil
                </button>
            </div>
        </div>,
        document.body
    )
}
