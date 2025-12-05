import Avatar from './Avatar.jsx'
import './PersonTag.scss'

export default function PersonTag({ p = {}, subtitle }) {
  if (!p) return <span className="fhPersonTag off">—</span>
  const full = [p.nombre, p.apellido].filter(Boolean).join(' ').trim()

  return (
    <div className="fhPersonTag">
      <Avatar className="avatar" src={p.avatar_url} name={full} size={36} />
      <div className="meta">
        <div className="nm">{[p.apellido, p.nombre].filter(Boolean).join(' ') || '—'}</div>
        <div className="sub">
          {subtitle || p.cargo_nombre || '—'}
        </div>
      </div>
    </div>
  )
}
