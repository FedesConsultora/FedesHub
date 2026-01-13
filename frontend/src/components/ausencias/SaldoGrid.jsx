// /src/components/ausencias/SaldoGrid.jsx

import * as FiIcons from 'react-icons/fi'
import GlobalLoader from '../loader/GlobalLoader.jsx'
import './SaldoGrid.scss'

const fmt = (n, unit) => unit === 'hora' ? Number(n || 0).toFixed(0) : Number(n || 0).toFixed(1)

export default function SaldoGrid({ breakdown = [], loading = false }) {
  return (
    <div className="aus-saldos" style={{ position: 'relative', minHeight: loading ? 100 : 0 }}>
      {loading && <GlobalLoader size={60} />}
      {!loading && breakdown.map(t => {
        const IconComponent = FiIcons[t.tipo_icon] || FiIcons.FiTag
        return (
          <div key={t.tipo_id} className="fh-card aus-saldo" style={{ '--accent': t.tipo_color }}>
            <div className="icon"><IconComponent /></div>
            <div className="title">{t.tipo_nombre}</div>
            <div className="main">
              {fmt(t.available, t.unidad_codigo)} <span className="unit">{t.unidad_codigo === 'hora' ? 'h' : 'd'}</span>
            </div>
            <div className="muted">DISPONIBLE</div>
            <div className="grid">
              <label>Asignado</label><span>{fmt(t.allocated, t.unidad_codigo)}</span>
              <label>Aprobado</label><span>{fmt(t.approved, t.unidad_codigo)}</span>
              <label>Planificado</label><span>{fmt(t.planned, t.unidad_codigo)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
