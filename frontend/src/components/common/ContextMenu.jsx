// /frontend/src/components/common/ContextMenu.jsx
import { useEffect, useRef, useState } from 'react'
import './ContextMenu.scss'

export default function ContextMenu({ items = [], children, disabled = false }) {
    const [visible, setVisible] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const menuRef = useRef(null)
    const containerRef = useRef(null)

    const handleContextMenu = (e) => {
        if (disabled) return
        e.preventDefault()
        e.stopPropagation() // Detener para que el document no lo cierre inmediatamente

        // Notificar a otros menús abiertos que deben cerrarse
        window.dispatchEvent(new CustomEvent('fh-close-context-menus'))

        const menuWidth = 200
        const menuHeight = items.length * 40 + 8

        // Centrado horizontal
        let x = e.clientX - (menuWidth / 2)
        // Verticalmente un poco para arriba
        let y = e.clientY - 20

        // Validar límites de pantalla
        if (x < 10) x = 10
        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10
        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10
        if (y < 10) y = 10

        setPosition({ x, y })
        setVisible(true)
    }

    const handleClick = (item) => {
        if (item.disabled) return
        setVisible(false)
        item.onClick?.()
    }

    useEffect(() => {
        const close = () => setVisible(false)

        const handleEsc = (e) => { if (e.key === 'Escape') close() }

        // Escuchar el evento personalizado de otras instancias
        window.addEventListener('fh-close-context-menus', close)

        if (visible) {
            document.addEventListener('click', close)
            document.addEventListener('contextmenu', close)
            document.addEventListener('wheel', close, { passive: true })
            document.addEventListener('keydown', handleEsc)
        }

        return () => {
            window.removeEventListener('fh-close-context-menus', close)
            document.removeEventListener('click', close)
            document.removeEventListener('contextmenu', close)
            document.removeEventListener('wheel', close)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [visible])

    return (
        <div ref={containerRef} onContextMenu={handleContextMenu} style={{ display: 'contents' }}>
            {children}

            {visible && (
                <div
                    ref={menuRef}
                    className="fh-context-menu"
                    style={{ left: position.x, top: position.y }}
                >
                    {items.filter(i => !i.hidden).map((item, idx) => (
                        item.separator ? (
                            <div key={idx} className="separator" />
                        ) : (
                            <button
                                key={idx}
                                className={`menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
                                onClick={() => handleClick(item)}
                                disabled={item.disabled}
                            >
                                {item.icon && <span className="icon">{item.icon}</span>}
                                <span className="label">{item.label}</span>
                            </button>
                        )
                    ))}
                </div>
            )}
        </div>
    )
}
