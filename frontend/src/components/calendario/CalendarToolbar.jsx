// src/components/calendario/CalendarToolbar.jsx
import './CalendarToolbar.scss'

const MONTHS = [...Array(12)].map((_,i)=> new Date(2024,i,1).toLocaleString(undefined,{month:'long'}))

function Avatar({ feder }) {
  const url = feder?.avatar_url || feder?.foto_url || ''
  const initials = feder ? `${(feder.nombre||'')[0]||''}${(feder.apellido||'')[0]||''}`.toUpperCase() : '?'
  if (url) return <img className="fh-avatar" src={url} alt={`${feder?.nombre||''} ${feder?.apellido||''}`.trim() || 'U'} />
  return <div className="fh-avatar initials">{initials}</div>
}

export default function CalendarToolbar({
  view, onViewChange,
  year, monthIdx, onPrev, onNext, onToday, setMonthIdx,
  calendars=[], federById={}, selectedIds=[], onToggleCal,
  bottomRightSlot=null
}){
  return (
    <div className="cal-toolbar">
      {/* fila superior */}
      <div className="row top">
        <div className="segmented">
          <button className={`seg ${view==='month'?'active':''}`} onClick={()=>onViewChange?.('month')}>Mes</button>
          <button className={`seg ${view==='week'?'active':''}`}  onClick={()=>onViewChange?.('week')}>Semana</button>
        </div>
        <button className="fh-btn ghost" onClick={onPrev}>◀</button>
        <div className="when">
          <select className="fh-input" value={monthIdx} onChange={e=>setMonthIdx(Number(e.target.value))} disabled={view==='week'}>
            {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
          <span className="year">{year}</span>
        </div>
        <button className="fh-btn ghost" onClick={onNext}>▶</button>
        <button className="fh-btn" onClick={onToday}>Hoy</button>
        <div className="spacer" />
      </div>

      {/* fila inferior */}
      <div className="row bottom">
        <div className="cal-select">
          {calendars.map(c=>{
            const f = c.feder_id ? federById[c.feder_id] : null
            const fullName = f ? `${f.nombre||''} ${f.apellido||''}`.trim() : ''
            const label = fullName || (c.nombre || '')
            return (
              <label
                key={c.id}
                className={`cal-chip ${selectedIds.includes(c.id)?'on':''}`}
                title={label}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={()=>onToggleCal?.(c.id)}
                />
                <span className="avatar">
                  {f ? <Avatar feder={f} /> : <span className="dot" style={{ background:c.color || '#88b' }} />}
                </span>
                <span className="name">{label}</span>
              </label>
            )
          })}
        </div>

        <div className="actions-right">
          {bottomRightSlot}
        </div>
      </div>
    </div>
  )
}