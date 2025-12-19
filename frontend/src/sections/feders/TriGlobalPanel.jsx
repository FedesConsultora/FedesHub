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
            p={{ id: p.feder_id, nombre: p.nombre, apellido: p.apellido, avatar_url: p.avatar_url, roles: p.roles }}
            subtitle={p.cargo_nombre || 'Miembro'}
            extra={p.is_leader && <span className="leaderBadge">Líder</span>}
          />
        ))}
      </div>
    </div>
  )
}

export default function TriGlobalPanel({ areas = {} }) {
  const areaList = Object.values(areas)

  return (
    <section className="fhTriGlobal">
      <h3>Áreas / Departamentos</h3>
      <div className="grid">
        {areaList.map(area => (
          <TriCard key={area.codigo} title={area.nombre} people={area.people} />
        ))}
        {areaList.length === 0 && <div className="empty">No se encontraron áreas organicás asignadas.</div>}
      </div>
    </section>
  )
}
