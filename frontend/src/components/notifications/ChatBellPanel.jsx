// /src/components/notifications/ChatBellPanel.jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannels, useDmCandidates } from '../../hooks/useChat'
import { useRealtime } from '../../realtime/RealtimeProvider'
import './ChatBellPanel.scss'

function computeUnreadLookup(channels = []) {
  const res = {}
  for (const c of channels) {
    const mm = c?.miembros?.[0] || {}
    const lastReadMsgId = Number(mm.last_read_msg_id ?? 0)
    const lastMsgId     = Number(c.last_msg_id ?? c.ultimo_msg_id ?? 0)
    if (lastMsgId > 0) {
      // regla preferida: comparar ids
      res[c.id] = lastMsgId > lastReadMsgId
      continue
    }
    // fallback: sólo si creemos que hubo mensajes (updated_at posterior a created_at)
    const createdAt = c.created_at ? new Date(c.created_at).getTime() : 0
    const updatedAt = c.updated_at ? new Date(c.updated_at).getTime() : 0
    const lastReadAt = mm.last_read_at ? new Date(mm.last_read_at).getTime() : 0
    const looksLikeThereAreMsgs = updatedAt > createdAt
    res[c.id] = looksLikeThereAreMsgs && (updatedAt > lastReadAt)
  }
  return res
}

function initialsFrom(name, email) {
  const s = (name || '').trim()
  if (s) {
    const parts = s.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  const e = (email || '').trim()
  if (e) {
    const hh = e.split('@')[0]
    if (hh.length >= 2) return hh.slice(0,2).toUpperCase()
    if (hh.length === 1) return hh[0].toUpperCase()
  }
  return '??'
}

export default function ChatBellPanel({ closeAll }) {
  const nav = useNavigate()
  const chQ = useChannels({ scope:'mine' })
  const dmQ = useDmCandidates()
  const { unreadByCanal, mentionByCanal } = useRealtime()

  const channels = chQ.data || []
  const unreadLookup = useMemo(()=> computeUnreadLookup(channels), [channels])

  // Canales (no DM), ordenados por updated_at desc
  const canalList = useMemo(()=> (channels
    .filter(c => c?.tipo?.codigo !== 'dm')
    .sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at))
  ), [channels])

  // DMs: del servicio dms (ya trae last_msg_at). Orden por last_msg_at desc.
  const dmList = useMemo(() => {
    const map = new Map(channels.map(c => [c.id, c]))
    return (dmQ.data || [])
      .filter(u => !!u.dm_canal_id)
      .map(u => ({
        ...u,
        last_msg_at: u.last_msg_at || map.get(u.dm_canal_id)?.updated_at || null
      }))
      .sort((a,b) => new Date(b.last_msg_at || 0) - new Date(a.last_msg_at || 0))
  }, [dmQ.data, channels])

  const [tab, setTab] = useState('canales')
  const openChat = (id) => { closeAll?.(); nav(`/chat/c/${id}`) }

  return (
    <div className="chatBellPanel">
      <div className="tabs">
        <button className={`tab ${tab==='canales'?'active':''}`} onClick={()=> setTab('canales')}>
          Canales {canalList.some(c => unreadLookup[c.id]) && <i className="dot"/>}
        </button>
        <button className={`tab ${tab==='dms'?'active':''}`} onClick={()=> setTab('dms')}>
          Chat {dmList.some(u => !!(u.dm_canal_id && unreadLookup[u.dm_canal_id])) && <i className="dot"/>}
        </button>
        <button className="seeAll" onClick={()=> { closeAll?.(); nav('/chat') }}>Ver chat</button>
      </div>

      <div className="list">
        {tab==='canales' && canalList.slice(0,8).map(c => {
          const hasUnread = unreadLookup[c.id] || (unreadByCanal[c.id] > 0)
          const hasMention = (mentionByCanal[c.id] | 0) > 0
          return (
            <button key={c.id} className="row" onClick={()=> openChat(c.id)}>
              <span className="avatar">
                {(c.slug || c.nombre || '?').slice(0,2).toUpperCase()}
                {hasUnread && <i className={`dot${hasMention ? ' mention' : ''}`} />}
              </span>
              <div className="meta">
                <div className="name">{c.nombre || c.slug || `Canal #${c.id}`}</div>
                {c.topic && <div className="sub">{c.topic}</div>}
              </div>
              <span className="ago">{formatAgo(c.updated_at)}</span>
            </button>
          )
        })}

        {tab==='dms' && dmList.slice(0,8).map(u => {
          const hasUnread = !!(u.dm_canal_id && (unreadLookup[u.dm_canal_id] || (unreadByCanal[u.dm_canal_id] > 0)))
          const hasMention = (mentionByCanal[u.dm_canal_id] | 0) > 0
          return (
            <button key={u.user_id} className="row" onClick={()=> openChat(u.dm_canal_id)}>
              <span className="avatar">
                {initialsFrom(`${u.nombre || ''} ${u.apellido || ''}`.trim(), u.email)}
                {hasUnread && <i className={`dot${hasMention ? ' mention' : ''}`} />}
              </span>
              <div className="meta">
                <div className="name">{u.nombre ? `${u.nombre} ${u.apellido}` : u.email}</div>
                <div className="sub">{u.email}</div>
              </div>
              <span className="ago">{formatAgo(u.last_msg_at)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatAgo(d){
  if (!d) return ''
  const ts = new Date(d).getTime()
  const diff = (Date.now() - ts)/1000
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff/60)}m`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  return `${Math.floor(diff/86400)}d`
}