import { useNavigate } from 'react-router-dom'
import PersonTag from '../../components/PersonTag.jsx'
import Avatar from '../../components/Avatar.jsx'
import './CelulasGrid.scss'

function CelulaCard({ c }) {
  const navigate = useNavigate()
  const handleClick = () => navigate(`/feders/celulas/${c.id}`)

  return (
    <section className="celCard" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <header className="title">
        <Avatar src={c.avatar_url} name={c.nombre} size={28} rounded="md" />
        <h4>{c.nombre}</h4>
        <span className={`chip ${c.estado_codigo}`}>{c.estado_codigo}</span>
      </header>

      <div className="miembros">
        {c.miembros.length === 0 && <div className="empty">Sin miembros activos</div>}
        {c.miembros.map(m => (
          <PersonTag
            key={m.feder_id}
            p={{ nombre: m.nombre, apellido: m.apellido, avatar_url: m.avatar_url }}
            subtitle={m.cargo_nombre || (m.es_principal ? 'Miembro (principal)' : 'Miembro')}
          />
        ))}
      </div>
    </section>
  )
}

export default function CelulasGrid({ items = [] }) {
  return (
    <section className="fhCelulas">
      <h3>Células</h3>
      <div className="grid">
        {items.map(c => <CelulaCard key={c.id} c={c} />)}
      </div>
    </section>
  )
}
