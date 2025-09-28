import PersonTag from '../../components/PersonTag.jsx'
import Avatar from '../../components/Avatar.jsx'
import './TriGlobalPanel.scss'

function TriCard({ title, people = [] }) {
  return (
    <div className="triCard">
      <header className="triHead">
        <Avatar name={title} size={28} />
        <h4>{title}</h4>
      </header>
      <div className="triBody">
        {people.length === 0 && <div className="empty">Sin asignar</div>}
        {people.map((p, i) => (
          <PersonTag
            key={p.feder_id || i}
            p={{ nombre:p.nombre, apellido:p.apellido, avatar_url:p.avatar_url, roles:p.roles }}
            subtitle={p.cargo_nombre || 'Miembro'}
          />
        ))}
      </div>
    </div>
  )
}

export default function TriGlobalPanel({ tri = {} }) {
  const tecnologia = tri.tecnologia || []
  const performance = tri.performance || []
  const marketing = tri.marketing || []

  return (
    <section className="fhTriGlobal">
      <h3>Tridentes</h3>
      <div className="grid">
        <TriCard title="Tecnología"   people={tecnologia} />
        <TriCard title="Performance"  people={performance} />
        <TriCard title="Marketing"    people={marketing} />
      </div>
    </section>
  )
}
