import './DMList.scss'
import { displayName, firstInitial } from '../../../utils/people'

const PRES_COL = { online:'#31c48d', away:'#f6ad55', dnd:'#ef4444', offline:'#6b7280' }

export default function DMList({ items=[], selectedId=null, unreadLookup={}, mentionLookup={}, onOpenDm }) {
  return (
    <div className="chat-dms">
      <div className="list">
        {items.map(u => {
          const canalId = u.dm_canal_id
          const unread = !!(canalId && unreadLookup[canalId])
          const hasMention = !!(canalId && mentionLookup[canalId])
          const sel = selectedId === canalId
          const name = displayName(u)
          return (
            <button
              key={u.user_id}
              className={`row ${sel?'sel':''}`}
              onClick={() => onOpenDm?.(u)}
              title={u.email}
            >
              <span className={'avatar' + (hasMention ? ' mention' : '')}>
                {firstInitial(u)}
                <i className="presence" style={{ background: PRES_COL[u.presence_status] || '#6b7280' }} />
                {unread && <i className="dot" />}
              </span>
              <div className="meta">
                <div className="name">
                  {name}
                  {hasMention && <span className="mentionTag">@</span>}
                </div>
                <div className="sub">{u.email}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
