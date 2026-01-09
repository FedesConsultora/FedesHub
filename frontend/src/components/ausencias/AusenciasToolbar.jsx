// src/components/ausencias/AusenciasToolbar.jsx
import { FaCalendarAlt, FaPlus } from 'react-icons/fa'
import './AusenciasToolbar.scss'

const monthNames = [...Array(12)].map((_, i) => new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' }))

export default function AusenciasToolbar({
  canCreate, canAssign, onNewAbs, onNewAlloc, pendingBadge = 0
}) {
  return (
    <div className="aus-toolbar">
      <div className="l">
        <h1>Gestión de Ausencias</h1>
        {pendingBadge > 0 && (
          <span className="badge-pend">{pendingBadge} Pendientes</span>
        )}
      </div>

      <div className="r">
        {canCreate && (
          <button className="fh-btn primary" onClick={onNewAbs}>
            <FaPlus style={{ marginRight: 6 }} /> Nueva ausencia
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
  for (let y = base - 2; y <= base + 2; y++) years.push(y)
  return (
    <select className="year-picker" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {years.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  )
}
