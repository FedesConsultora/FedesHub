import PersonTag from '../../components/PersonTag.jsx'
import './TridenteTable.scss'

function Row({ t }) {
  return (
    <div className="triRow">
      <div className="cel">{t.celula_nombre}</div>
      <PersonTag p={t.diseno}      subtitle="Diseño" />
      <PersonTag p={t.cuentas}     subtitle="Cuentas" />
      <PersonTag p={t.audiovisual} subtitle="Audiovisual" />
    </div>
  )
}

export default function TridenteTable({ rows=[] }) {
  return (
    <section className="fhTri">
      <h3>Tridentes de valor</h3>
      <div className="table">
        <div className="triRow head">
          <div className="cel">Célula</div>
          <div>Diseño</div><div>Cuentas</div><div>Audiovisual</div>
        </div>
        {rows.map(r => <Row key={r.celula_id} t={r} />)}
        {rows.length === 0 && <div className="empty">Sin tridentes</div>}
      </div>
    </section>
  )
}