

function initials(fullname = '') {
  const p = (fullname || '').trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '·'
  const a = p[0][0] || ''
  const b = p.length > 1 ? p[p.length - 1][0] : ''
  return (a + b).toUpperCase()
}

export default function AvatarStack({ people = [], size = 22, titlePrefix = '' }) {
  return (
    <div className="fh-avatars" style={{ '--av-size': `${size}px` }}>
      {people.slice(0, 5).map((p, i) => {
        const avatarUrl = p.avatar_url || p.avatar || null
        const displayName = p.nombre || p.name || p.email || ''
        const fullName = p.apellido ? `${p.nombre || ''} ${p.apellido}`.trim() : displayName

        return (
          <div
            key={p.id || p.email || i}
            className="fh-avatar"
            title={`${titlePrefix}${fullName}`}
            style={{ zIndex: 10 - i }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="" />
              : <span>{initials(fullName)}</span>
            }
          </div>
        )
      })}
      {people.length > 5 && <div className="fh-avatar fh-avatar--more">+{people.length - 5}</div>}
    </div>
  )
}

