import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../modal/ModalProvider.jsx'
import { useToast } from '../toast/ToastProvider.jsx'
import './ClienteStatusCard.scss'

const STATE_META = {
    activo: { name: 'Activo', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    pausado: { name: 'Pausado', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
    baja: { name: 'Baja', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' }
}

export default function ClienteStatusCard({
    estadoCodigo = 'activo',
    estadosCatalog = [],
    onPick,
    disabled = false
}) {
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const buttonRef = useRef(null)
    const menuRef = useRef(null)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

    const modal = useModal()
    const toast = useToast()

    const active = STATE_META[estadoCodigo] ? estadoCodigo : 'activo'
    const meta = STATE_META[active]

    // Map for easy ID lookup
    const idByCode = Object.fromEntries((estadosCatalog || []).map(e => [e.codigo, e.id]))

    useEffect(() => {
        if (open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setMenuPosition({
                top: rect.bottom + 6,
                left: rect.left
            })
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        const handleClickOutside = (e) => {
            if (buttonRef.current && !buttonRef.current.contains(e.target) &&
                menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        const handleScroll = () => setOpen(false)
        document.addEventListener('mousedown', handleClickOutside)
        window.addEventListener('scroll', handleScroll, true)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('scroll', handleScroll, true)
        }
    }, [open])

    const doPick = async (code) => {
        if (busy || code === active || disabled) return
        const id = idByCode[code]
        if (!id || !onPick) return

        if (code === 'baja') {
            const ok = await modal.confirm({
                title: 'Dar de baja cliente',
                message: '¿Estás seguro de que querés dar de baja a este cliente? Dejará de aparecer en los listados activos.',
                okText: 'Dar de baja',
                cancelText: 'Cancelar',
                danger: true
            })
            if (!ok) return
        }

        try {
            setBusy(true)
            await onPick(id)
            toast.success(`Cliente marcado como ${STATE_META[code].name}`)
            setOpen(false)
        } catch (e) {
            toast.error(e.message || 'Error al cambiar estado')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="ClienteStatusCard">
            <button
                ref={buttonRef}
                type="button"
                className={`statusBtn ${active}`}
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled || busy}
                style={{ '--status-color': meta.color, '--status-bg': meta.bg }}
            >
                <span className="dot" />
                {meta.name}
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    className="statusMenu"
                    style={{
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left,
                        zIndex: 9999
                    }}
                >
                    {Object.entries(STATE_META).map(([code, info]) => (
                        <div
                            key={code}
                            className={`menuItem ${code} ${code === active ? 'active' : ''}`}
                            onClick={() => doPick(code)}
                            style={{ '--status-color': info.color, '--status-bg': info.bg }}
                        >
                            <span className="dot" />
                            {info.name}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    )
}
