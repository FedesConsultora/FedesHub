import React, { useState } from 'react'
import './FederBubblesFilter.scss'

export default function FederBubblesFilter({ feders = [], selectedIds = [], onChange }) {
    const [expanded, setExpanded] = useState(false)

    const toggle = (id) => {
        const isSelected = selectedIds.includes(id)
        if (isSelected) {
            onChange(selectedIds.filter(i => i !== id))
        } else {
            onChange([...selectedIds, id])
        }
    }

    const showAll = expanded || feders.length <= 7
    const displayFeders = showAll ? feders : feders.slice(0, 6)
    const hasMore = feders.length > 7 && !expanded

    return (
        <div className="FederBubblesFilter">
            <div className="bubbles-scroll">
                {displayFeders.map(f => {
                    const isSelected = selectedIds.includes(f.id)
                    const firstName = f.nombre?.split(' ')[0] || ''
                    const initials = `${firstName[0] || ''}${f.apellido?.[0] || ''}`

                    return (
                        <button
                            key={f.id}
                            className={`bubble-item ${isSelected ? 'active' : ''}`}
                            onClick={() => toggle(f.id)}
                            title={`${f.nombre} ${f.apellido}`}
                        >
                            <div className="avatar-wrap">
                                {f.avatar_url ? (
                                    <img src={f.avatar_url} alt={f.nombre} />
                                ) : (
                                    <div className="initials">{initials}</div>
                                )}
                            </div>
                            <span className="feder-name">{firstName}</span>
                        </button>
                    )
                })}

                {hasMore && (
                    <button
                        className="bubble-item more-btn"
                        onClick={() => setExpanded(true)}
                        title="Ver todos"
                    >
                        <div className="avatar-wrap more-circle">
                            <span>...</span>
                        </div>
                        <span className="feder-name">Ver más</span>
                    </button>
                )}

                {expanded && feders.length > 7 && (
                    <button
                        className="bubble-item more-btn"
                        onClick={() => setExpanded(false)}
                        title="Ver menos"
                    >
                        <div className="avatar-wrap more-circle">
                            <span>-</span>
                        </div>
                        <span className="feder-name">Menos</span>
                    </button>
                )}
            </div>
        </div>
    )
}
