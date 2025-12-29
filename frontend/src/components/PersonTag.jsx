import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar.jsx'
import './PersonTag.scss'

export default function PersonTag({ p = {}, subtitle, extra, clickable = true }) {
  const navigate = useNavigate()
  if (!p) return <span className="fhPersonTag off">—</span>
  const full = [p.nombre, p.apellido].filter(Boolean).join(' ').trim()
  const federId = p.id || p.feder_id || p.feder?.id

  const handleClick = (e) => {
    if (!clickable || !federId) return
    e.stopPropagation()
    navigate(`/feders/view/${federId}`)
  }

  return (
    <div
      className={`fhPersonTag ${clickable && federId ? 'is-clickable' : ''}`}
      onClick={handleClick}
    >
      <Avatar className="avatar" src={p.avatar_url} name={full} size={36} />
      <div className="meta">
        <div className="nameRow">
          <div className="nm">{[p.nombre, p.apellido].filter(Boolean).join(' ') || '—'}</div>
          {extra}
        </div>
        <div className="sub">
          {subtitle || p.cargo_nombre || '—'}
        </div>
      </div>
    </div>
  )
}