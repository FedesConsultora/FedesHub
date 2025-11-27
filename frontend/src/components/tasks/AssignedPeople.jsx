
import Avatar from '../Avatar.jsx'
import './assigned-people.scss'

export default function AssignedPeople({ responsables=[], colaboradores=[] }){
  return (
    <div className="peopleGrid">
      <Group
       
        title="Responsable"
        items={responsables}
        showRole={false}
        // renderBadge={(p)=> p.es_lider ? (<><FaCrown className="crown"/><span>Líder</span></>) : null}
      />
      <Group
        
        title="Colaboradores"
        items={colaboradores}
        showRole={true}
      />
    </div>
  )
}

function Group({ title, icon, items=[], showRole=false, renderBadge }){
  return (
    <div className="peopleGroup">
      <div className="pgHead">
        <span className="fh-row" style={{gap:8}}>
          {icon}<span>{title}</span>
        </span>
       
      </div>

      <div className="peopleList">
        {items.length ? items.map((p, i) => {
          const fullName = [p.nombre, p.apellido].filter(Boolean).join(' ') || p.name || '—'
          const badgeEl = renderBadge ? renderBadge(p) : null
          return (
            <div className="person" key={p.feder_id || p.id || i}>
              <Avatar src={p.avatar_url || undefined} name={fullName} size={36} usePlaceholder={false} />
              <div className="info">
                <div className="name">{fullName}</div>
              </div>
              {badgeEl && <div className="badge">{badgeEl}</div>}
            </div>
          )
        }) : <div className="empty">Sin {title.toLowerCase()}</div>}
      </div>
    </div>
  )
}