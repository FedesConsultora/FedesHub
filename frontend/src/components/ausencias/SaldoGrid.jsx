// /src/components/ausencias/SaldoGrid.jsx

import { FaUmbrellaBeach, FaBalanceScale, FaGraduationCap } from 'react-icons/fa'
import GlobalLoader from '../loader/GlobalLoader.jsx'
import './SaldoGrid.scss'

const iconFor = (codigo = '') => {
  const c = (codigo || '').toLowerCase()
  if (/comp|compens/.test(c)) return <FaBalanceScale />
  if (/train|formac|examen/.test(c)) return <FaGraduationCap />
  return <FaUmbrellaBeach />
}
const fmt = (n, unit) => unit === 'hora' ? Number(n || 0).toFixed(0) : Number(n || 0).toFixed(1)

export default function SaldoGrid({ breakdown = [], loading = false }) {
  return (
    <div className="aus-saldos" style={{ position: 'relative', minHeight: loading ? 100 : 0 }}>
      {loading && <GlobalLoader size={60} />}
      {!loading && breakdown.map(t => (
        <div key={t.tipo_id} className="fh-card aus-saldo">
          <div className="icon">{iconFor(t.tipo_codigo)}</div>
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
      ))}
    </div>
  )
}
