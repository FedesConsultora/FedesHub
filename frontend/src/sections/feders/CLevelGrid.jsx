import PersonTag from '../../components/PersonTag.jsx'
import './CLevelGrid.scss'

export default function CLevelGrid({ items=[] }){
  return (
    <section className="fhCLevel">
      <h3>C-level</h3>
      <div className="grid">
        {items.map((r,i)=>(
          <div key={i} className="card">
            <PersonTag
              p={{ nombre:r.nombre, apellido:r.apellido, avatar_url:r.avatar_url, roles:['CLevel'] }}
              subtitle={`${r.cargo_nombre ?? '—'} · ${r.ambito_nombre ?? '—'}`}
            />
            {r.user_email && <div className="userEmail">{r.user_email}</div>}
            {r.celula_nombre && <div className="celulaTag">{r.celula_nombre}</div>}
          </div>
        ))}
        {items.length===0 && <div className="empty">No hay C-level configurados</div>}
      </div>
    </section>
  )
}
