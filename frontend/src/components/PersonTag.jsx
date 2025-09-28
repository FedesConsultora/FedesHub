import Avatar from './Avatar.jsx'
import './PersonTag.scss'

function triFromRoles(roles = []) {
  const s = new Set(roles || [])
  if (s.has('TriMarketing')) return 'Marketing'
  if (s.has('TriPerformance')) return 'Performance'
  if (s.has('TriTecnologia')) return 'Tecnología'
  return null
}

export default function PersonTag({ p = {}, subtitle }) {
  if (!p) return <span className="fhPersonTag off">—</span>
  const full = [p.nombre, p.apellido].filter(Boolean).join(' ').trim()
  const tri = triFromRoles(p.roles)

  return (
    <div className="fhPersonTag">
      <Avatar className="avatar" src={p.avatar_url} name={full} size={36} />
      <div className="meta">
        <div className="nm">{[p.apellido, p.nombre].filter(Boolean).join(' ') || '—'}</div>
        <div className="sub">
          {subtitle || p.cargo_nombre || '—'}
          {tri && <span className="chip tri">Tri: {tri}</span>}
        </div>
      </div>
    </div>
  )
}
