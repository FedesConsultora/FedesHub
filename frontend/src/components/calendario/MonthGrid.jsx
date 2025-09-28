import './MonthGrid.scss'
const two = n=>String(n).padStart(2,'0')

export default function MonthGrid({ year, month, events=[], onDayClick, onEventClick }) {
  const first = new Date(year, month, 1)
  const startWeekDay = (first.getDay()+6)%7
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const cells = []
  for (let i=0;i<startWeekDay;i++) cells.push(null)
  for (let d=1; d<=daysInMonth; d++) cells.push(d)

  const map = new Map()
  for (const e of events){
    const s = new Date(e.starts_at); const ee = new Date(e.ends_at)
    let d = new Date(Math.max(s, new Date(year,month,1)))
    const end = new Date(Math.min(ee, new Date(year,month+1,0)))
    while (d <= end){
      const k = `${year}-${two(month+1)}-${two(d.getDate())}`
      const arr = map.get(k) || []; arr.push(e); map.set(k, arr)
      d = new Date(d.getTime()+86400000)
    }
  }

  const label = new Date(year, month, 1).toLocaleString(undefined, { month:'long', year:'numeric' })
  const today = new Date(); const todayStr = `${today.getFullYear()}-${two(today.getMonth()+1)}-${two(today.getDate())}`

  return (
    <div className="cal-month">
      <div className="title">{label}</div>
      <div className="dow">{['L','M','X','J','V','S','D'].map((d,i)=><span key={i}>{d}</span>)}</div>
      <div className="grid">
        {cells.map((d,idx)=>{
          if (!d) return <div key={idx} className="day empty" />
          const dateStr = `${year}-${two(month+1)}-${two(d)}`
          const items = (map.get(dateStr)||[]).slice(0,4)
          const more = (map.get(dateStr)||[]).length - items.length
          const wd = new Date(year,month,d).getDay()
          const weekend = (wd===0 || wd===6)
          const isToday = (dateStr===todayStr)
          return (
            <div
              key={idx}
              className={`day ${weekend?'wknd':''} ${isToday?'today':''}`}
              title={`${(map.get(dateStr)||[]).length||0} eventos`}
            >
              <button className="day-click" onClick={()=>onDayClick?.(dateStr)}>
                <span className="num">{d}</span>
              </button>

              {items.map((e,i)=>(
                <button key={i} className="evt" style={{ borderLeftColor: e.color || '#88b' }} onClick={()=> onEventClick?.(e)} title={e.titulo}>
                  <span className="when">
                    {e.all_day ? 'Todo el día' : new Date(e.starts_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </span>
                  <span className="ttl">{e.titulo}</span>
                </button>
              ))}
              {more>0 && <div className="more">+{more} más…</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
