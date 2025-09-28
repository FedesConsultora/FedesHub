// src/components/ausencias/AusenciasToolbar.jsx
import { FaCalendarAlt, FaPlus } from 'react-icons/fa'
import './AusenciasToolbar.scss'

const monthNames = [...Array(12)].map((_,i)=>new Date(2000,i,1).toLocaleString(undefined,{month:'long'}))

export default function AusenciasToolbar({
  year, monthIdx, onPrev, onToday, onNext, onYearChange,
  view, setView, canCreate, canAssign, onNewAbs, onNewAlloc, pendingBadge=0
}) {
  return (
    <div className="aus-toolbar">
      <div className="l">
        <button className="fh-btn ghost" onClick={onPrev}>←</button>
        <button className="fh-btn ghost" onClick={onToday}>Hoy</button>
        <button className="fh-btn ghost" onClick={onNext}>→</button>

        <div className="pill">
          <FaCalendarAlt />
          <YearPicker value={year} onChange={onYearChange} />
          {view==='month' && <span className="muted">· {monthNames[monthIdx]}</span>}
        </div>

        <div className="segmented">
          <button className={`seg ${view==='year'?'active':''}`} onClick={()=>setView('year')}>Año</button>
          <button className={`seg ${view==='month'?'active':''}`} onClick={()=>setView('month')}>Mes</button>
        </div>

        {pendingBadge>0 && (
          <span className="badge-pend">Pendientes: {pendingBadge}</span>
        )}
      </div>

      <div className="r">
        {canCreate && (
          <button className="fh-btn primary" onClick={onNewAbs}>
            <FaPlus /> Nueva ausencia
          </button>
        )}
        {canAssign && (
          <button className="fh-btn" onClick={onNewAlloc}>
            Solicitar asignación
          </button>
        )}
      </div>
    </div>
  )
}

function YearPicker({ value, onChange }) {
  const years = []
  const base = new Date().getFullYear()
  for (let y=base-2; y<=base+2; y++) years.push(y)
  return (
    <select className="year-picker" value={value} onChange={(e)=>onChange(Number(e.target.value))}>
      {years.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  )
}
