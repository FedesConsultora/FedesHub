// /frontend/src/components/chat/FloatingBubbles.jsx
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRealtime } from '../../realtime/RealtimeProvider'
import { useChannels, useDmCandidates } from '../../hooks/useChat'
import { FiX } from 'react-icons/fi'
import Avatar from '../Avatar.jsx'
import { pickAvatar, displayName } from '../../utils/people'
import { resolveMediaUrl } from '../../utils/media'
import './FloatingBubbles.scss'

export default function FloatingBubbles() {
    const location = useLocation()
    const navigate = useNavigate()
    const { unreadByCanal, mentionByCanal, clearUnreadFor, suppressedCanals } = useRealtime()
    const { data: channels } = useChannels({ scope: 'mine' })
    const { data: dms } = useDmCandidates()

    const isChatPage = location.pathname.startsWith('/chat')

    const bubbles = useMemo(() => {
        if (isChatPage) return []

        const list = []

        // Canales con unread
        for (const cid in unreadByCanal) {
            const id = Number(cid)
            if (unreadByCanal[id] <= 0 || suppressedCanals.has(id)) continue

            const ch = (channels || []).find(c => c.id === id)
            if (ch) {
                list.push({
                    id,
                    name: ch.nombre || ch.slug,
                    count: unreadByCanal[id],
                    mention: mentionByCanal[id] > 0,
                    image: ch.imagen_url ? resolveMediaUrl(ch.imagen_url) : null,
                    initials: (ch.nombre || ch.slug || '?').slice(0, 2).toUpperCase(),
                    type: 'channel'
                })
            } else {
                // Podría ser un DM
                const dm = (dms || []).find(u => u.dm_canal_id === id)
                if (dm) {
                    list.push({
                        id,
                        name: displayName(dm),
                        count: unreadByCanal[id],
                        mention: true, // DMs siempre son importantes
                        avatar: pickAvatar(dm),
                        federId: dm.feder_id || dm.id_feder,
                        type: 'dm'
                    })
                }
            }
        }

        return list
    }, [unreadByCanal, mentionByCanal, suppressedCanals, channels, dms, isChatPage])

    if (bubbles.length === 0) return null

    return (
        <div className="fh-floating-bubbles">
            {bubbles.map(b => (
                <div key={b.id} className={`bubble-item ${b.mention ? 'mention' : ''}`}>
                    <button
                        className="bubble-main"
                        onClick={() => {
                            navigate(`/chat/c/${b.id}`)
                            clearUnreadFor(b.id)
                        }}
                        title={b.name}
                    >
                        <div className="avatar-wrap">
                            {b.type === 'dm' ? (
                                <Avatar src={b.avatar} name={b.name} size={60} federId={b.federId} />
                            ) : (
                                <div className="channel-avatar">
                                    {b.image ? <img src={b.image} alt={b.name} /> : b.initials}
                                </div>
                            )}
                        </div>
                        <span className="badge">{b.count > 99 ? '99+' : b.count}</span>
                    </button>
                    <button
                        className="bubble-close"
                        onClick={() => clearUnreadFor(b.id)}
                        aria-label="Cerrar"
                    >
                        <FiX />
                    </button>
                </div>
            ))}
        </div>
    )
}
