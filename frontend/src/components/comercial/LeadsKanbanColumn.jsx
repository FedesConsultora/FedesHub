// /frontend/src/components/comercial/LeadsKanbanColumn.jsx
import React from 'react'
import LeadsKanbanCard from './LeadsKanbanCard'

export default function LeadsKanbanColumn({
    id,
    nombre,
    leads,
    bodyRef,
    onStartDrag,
    onCardClick
}) {
    return (
        <section className="fh-k-col" role="region" aria-label={nombre}>
            <header className="fh-k-head">
                <h4 className="fh-k-titleCol">{nombre}</h4>
                <span className="fh-k-count">{leads.length}</span>
            </header>
            <div className="fh-k-body" ref={bodyRef}>
                {leads.map((lead, iVis) => (
                    <LeadsKanbanCard
                        key={lead.id}
                        lead={lead}
                        onPointerDown={(e) => onStartDrag(e, id, iVis, iVis, lead.id)}
                        onClick={onCardClick}
                    />
                ))}
            </div>
        </section>
    )
}
