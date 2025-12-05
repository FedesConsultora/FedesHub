import './inboxColumn.scss'

export default function InboxColumn({ items = [], onOpenTask }) {
    return (
        <div className="inboxColumn">
            <h4 className="inboxTitle">Bandeja de entrada</h4>

            <div className="inboxList">
                {items.length === 0 && <p className="empty">No hay tareas</p>}

                {items.map(t => (
                    <div
                        key={t.id}
                        className="inboxItem"
                        onClick={() => onOpenTask?.(t)}
                    >
                        <div className="title">{t.titulo}</div>
                        {t.cliente_nombre && <div className="client">{t.cliente_nombre}</div>}
                    </div>
                ))}
            </div>
        </div>
    )
}
