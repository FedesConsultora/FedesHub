// frontend/src/sections/feders/Person.jsx
import './Person.scss'
export default function Person({ p, subtitle }){
  if (!p) return <span className="fhPerson off">—</span>
  return (
    <div className="fhPerson">
      <img src={p.avatar_url || '/avatar.svg'} alt={`${p.nombre ?? ''} ${p.apellido ?? ''}`} />
      <div>
        <div className="nm">{p.apellido} {p.nombre}</div>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
    </div>
  )
}
