// /frontend/src/components/tasks/KanbanColumn.jsx
import TaskCard from './TaskCard'

export default function KanbanColumn({ code, title, items, indices, bodyRef, onStartDrag }) {
  return (
    <section className="fh-k-col" role="region" aria-label={title}>
      <header className="fh-k-head">
        <h4 className="fh-k-titleCol">{title}</h4>
        
        <span className="fh-k-count">{items.length}</span>
      </header>
      <div className="fh-k-body" ref={bodyRef}>
        {items.map((t, iVis) => (
          <TaskCard
            key={t.id}
            t={t}
            onPointerDown={(e)=>onStartDrag(e, code, iVis, indices[iVis], t.id)}
          />
        ))}
      </div>
    </section>
  )
}
