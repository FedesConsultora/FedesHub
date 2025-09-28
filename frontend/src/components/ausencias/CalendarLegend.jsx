// src/components/ausencias/CalendarLegend.jsx
import './CalendarLegend.scss'

export default function CalendarLegend(){
  return (
    <div className="cal-legend">
      <span className="dot ok" /> Aprobada
      <span className="dot warn" /> Pendiente
      <span className="dot err" /> Denegada
      <span className="dot cancel" /> Cancelada
      <span className="sep" />
      <span className="dot today" /> Hoy
      <span className="dot wknd" /> Fin de semana
    </div>
  )
}
