import './DayDetails.scss'

export default function DayDetails({ date, items=[], federById={}, canUpdate, canDelete, onEdit, onDelete, onNew }){
  const fmt = (dt)=> new Date(dt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  return (
    <div className="cal-day-details">
      <div className="actions">
        <button className="fh-btn primary" onClick={onNew}>Nuevo</button>
      </div>

      {!items.length && <div className="empty">Sin eventos para este día.</div>}

      {items.map(ev=>(
        <div key={ev.id} className="item">
          <div className="left">
            <div className="bar" style={{ background: ev.color || '#7aa' }} />
          </div>
          <div className="body">
            <div className="ttl">{ev.titulo}</div>
            <div className="meta">
              {ev.all_day ? 'Todo el día' : `${fmt(ev.starts_at)} - ${fmt(ev.ends_at)}`}
              {ev.lugar && <> • {ev.lugar}</>}
              {ev.calendario_nombre && <> • <b>{ev.calendario_nombre}</b></>}
            </div>
            {ev.asistentes?.length>0 && (
              <div className="asist">
                {ev.asistentes.map(a=>{
                  const f = a.feder_id ? federById[a.feder_id] : null
                  const label = f ? `${f.nombre} ${f.apellido}` : (a.nombre || a.email_externo)
                  return <span key={`${a.tipo_id}-${a.feder_id || a.email_externo}`} className="chip">{label}</span>
                })}
              </div>
            )}
          </div>
          <div className="ops">
            {canUpdate && <button className="fh-btn ghost" onClick={()=>onEdit?.(ev)}>Editar</button>}
            {canDelete && <button className="fh-btn danger outline" onClick={()=>onDelete?.(ev.id)}>Eliminar</button>}
          </div>
        </div>
      ))}
    </div>
  )
}