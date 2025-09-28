// /frontend/src/components/chat/mobile/ChatMobile.jsx
import { useEffect, useState } from 'react'
import Timeline from '../shared/Timeline'
import Composer from '../shared/Composer'
import { useMessages, useDmCandidates } from '../../../hooks/useChat'
import { chatApi } from '../../../api/chat'
import './ChatMobile.scss'

export default function ChatMobile({ channels=[], currentId=null, onOpen }) {
  const [view, setView] = useState(currentId ? 'chat' : 'list')
  const [cid, setCid]   = useState(currentId || null)

  useEffect(()=> {
    if (currentId) { setCid(currentId); setView('chat') }
  }, [currentId])

  const msgs = useMessages(cid, { limit: 50 })

  // DMs
  const dmQ = useDmCandidates()
  const openDm = async (u) => {
    let targetId = u.dm_canal_id
    if (!targetId) {
      try {
        const c = await chatApi.channels.create({ tipo_codigo: 'dm', invited_user_ids: [u.user_id] })
        targetId = c.id
      } catch (e) { console.error('create dm', e); return }
    }
    setCid(targetId); setView('chat'); onOpen?.(targetId)
  }

  return (
    <div className="chat-mobile">
      {view==='list' && (
        <div className="bubble-tray">
          {channels.map(c => (
            <button key={c.id} className="bubble" onClick={()=>{ setCid(c.id); setView('chat'); onOpen?.(c.id) }}>
              {(c.slug || c.nombre || '?').slice(0,2).toUpperCase()}
            </button>
          ))}
          {/* Burbujas de DMs */}
          {(dmQ.data || []).map(u => (
            <button key={`dm-${u.user_id}`} className="bubble" onClick={()=> openDm(u)}>
              {(u.nombre?.[0] || u.email?.[0] || '?').toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {view==='chat' && (
        <>
          <div className="top">
            <button className="fh-btn ghost" onClick={()=> setView('list')}>‹</button>
            <span className="ttl">{channels.find(x=>x.id===cid)?.nombre || 'Chat'}</span>
          </div>
          <Timeline rows={msgs.data || []} loading={msgs.isLoading} />
          {cid && <Composer canal_id={cid} />}
        </>
      )}
    </div>
  )
}