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
        e.stopPropagation()

        // Calcular posición ajustada para que no se salga de la pantalla
        const x = Math.min(e.clientX, window.innerWidth - 200)
        const y = Math.min(e.clientY, window.innerHeight - 150)

        setPosition({ x, y })
        setVisible(true)
    }

    const handleClick = (item) => {
        if (item.disabled) return
        setVisible(false)
        item.onClick?.()
    }

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setVisible(false)
            }
        }

        const handleEscape = (e) => {
            if (e.key === 'Escape') setVisible(false)
        }

        if (visible) {
            document.addEventListener('click', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }
        return () => {
            document.removeEventListener('click', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
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
