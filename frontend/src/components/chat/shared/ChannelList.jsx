// src/components/chat/shared/ChannelList.jsx
import './ChannelList.scss'
import { resolveMediaUrl } from '../../../utils/media'

export default function ChannelList({
  channels = [],
  selectedId = null,
  onOpen,
  unreadLookup = {},
  mentionLookup = {}
}) {
  return (
    <div className="chat-channels">
      <div className="list">
        {channels.map(c => {
          const unread = (unreadLookup[c.id] | 0) > 0
          const hasMention = (mentionLookup[c.id] | 0) > 0
          const name = c.nombre || c.slug || `Canal #${c.id}`
          const initials = (c.slug || c.nombre || '?').slice(0, 2).toUpperCase()
          const img = c.imagen_url ? resolveMediaUrl(c.imagen_url) : null

          return (
            <button
              key={c.id}
              className={'row' + (selectedId === c.id ? ' sel' : '')}
              onClick={() => onOpen?.(c.id)}
              title={c.descripcion || c.topic || name}
            >
              <span className={'bubble' + (hasMention ? ' mention' : '') + (img ? ' hasImg' : '')}>
                {img ? <img src={img} alt={name} loading="lazy" /> : initials}
                {unread && <i className="dot" />}
              </span>

              <div className="meta">
                <div className="name">
                  {name}
                  {hasMention && <span className="mentionTag">@</span>}
                </div>
                {c.topic && <div className="sub">{c.topic}</div>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
