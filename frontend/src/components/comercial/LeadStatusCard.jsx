import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiChevronDown } from 'react-icons/fi'
import './LeadStatusCard.scss'

export default function LeadStatusCard({
    currentEtapa = {},
    etapasCatalog = [],
    onPick,
    disabled = false
}) {
    const [open, setOpen] = useState(false)
    const buttonRef = useRef(null)
    const menuRef = useRef(null)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

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
            if (menuRef.current && !menuRef.current.contains(e.target) && !buttonRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    return (
        <div className="LeadStatusCard">
            <button
                ref={buttonRef}
                className={`statusTrigger ${disabled ? 'disabled' : ''}`}
                type="button"
                onClick={() => !disabled && setOpen(!open)}
            >
                <span className="etapa-label">Etapa:</span>
                <span className="current-name">{currentEtapa.nombre || '—'}</span>
                {!disabled && <FiChevronDown className={`arrow ${open ? 'open' : ''}`} />}
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    className="statusMenu statusMenu--portal"
                    style={{
                        position: 'fixed',
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                        zIndex: 200000,
                        pointerEvents: 'auto'
                    }}
                >
                    <div className="menu-header">Cambiar Etapa</div>
                    {etapasCatalog.map(et => (
                        <div
                            key={et.id}
                            className={`item ${et.id === currentEtapa.id ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation()
                                if (et.id !== currentEtapa.id) {
                                    onPick(et.id)
                                }
                                setOpen(false)
                            }}
                        >
                            {et.nombre}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    )
}
