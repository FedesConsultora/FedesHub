// /frontend/src/components/chat/mobile/ChatMobile.jsx
import { useEffect, useState, useMemo } from 'react'
import { FiChevronLeft, FiSearch, FiMessageSquare, FiPlus } from 'react-icons/fi'
import Timeline from '../shared/Timeline'
import Composer from '../shared/Composer'
import PinnedBar from '../shared/PinnedBar'
import Tabs from '../shared/Tabs'
import ChannelList from '../shared/ChannelList'
import DMList from '../shared/DMList'
import { useMessages, useDmCandidates, useChannelMembers } from '../../../hooks/useChat'
import { useRealtime } from '../../../realtime/RealtimeProvider'
import { chatApi } from '../../../api/chat'
import GlobalLoader from '../../loader/GlobalLoader.jsx'
import { displayName } from '../../../utils/people'
import './ChatMobile.scss'

export default function ChatMobile({ channels = [], currentId = null, onOpen }) {
  const [view, setView] = useState(currentId ? 'chat' : 'list')
  const [tab, setTab] = useState(() => localStorage.getItem('fh:chat:mobileView') || 'channels')
  const [cid, setCid] = useState(currentId || null)
  const [search, setSearch] = useState('')

  const { unreadByCanal, mentionByCanal, clearUnreadFor, setCurrentCanal } = useRealtime()

  useEffect(() => {
    if (currentId) {
      setCid(currentId)
      setView('chat')
    }
  }, [currentId])

  useEffect(() => {
    if (view === 'list') {
      setCurrentCanal(null)
    } else if (cid) {
      setCurrentCanal(cid)
      clearUnreadFor(cid)
    }
  }, [view, cid, setCurrentCanal, clearUnreadFor])

  const msgs = useMessages(cid, { limit: 50 })
  const dmQ = useDmCandidates()
  const { data: membersFull = [] } = useChannelMembers(cid)

  const setTabPersist = (v) => {
    setTab(v)
    localStorage.setItem('fh:chat:mobileView', v)
  }

  const handleOpen = (id) => {
    setCid(id)
    setView('chat')
    onOpen?.(id)
  }

  const openDm = async (u) => {
    let targetId = u.dm_canal_id
    if (!targetId) {
      try {
        const c = await chatApi.channels.create({ tipo_codigo: 'dm', invited_user_ids: [u.user_id] })
        targetId = c.id
      } catch (e) { console.error('create dm', e); return }
    }
    handleOpen(targetId)
  }

  const handleSelectMessage = (msg) => {
    const el = document.getElementById(`msg-${msg.id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('hi-lite')
      setTimeout(() => el.classList.remove('hi-lite'), 2000)
    }
  }

  const sortedChannels = useMemo(() => {
    const arr = Array.isArray(channels) ? [...channels] : []
    arr.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    return arr
  }, [channels])

  const dmItems = useMemo(() => {
    const arr = [...(dmQ.data || [])]
    arr.sort((a, b) => {
      const ta = a.last_msg_at ? new Date(a.last_msg_at).getTime() : 0
      const tb = b.last_msg_at ? new Date(b.last_msg_at).getTime() : 0
      return tb - ta
    })
    return arr
  }, [dmQ.data])

  const filteredItems = useMemo(() => {
    if (tab === 'dms') {
      if (!search) return dmItems
      return dmItems.filter(u => displayName(u).toLowerCase().includes(search.toLowerCase()))
    }
    const type = tab === 'groups' ? 'grupo' : 'canal'
    const base = sortedChannels.filter(c => {
      if (tab === 'groups') return c?.tipo?.codigo === 'grupo'
      return c?.tipo?.codigo !== 'grupo' && c?.tipo?.codigo !== 'dm'
    })
    if (!search) return base
    return base.filter(c => (c.nombre || '').toLowerCase().includes(search.toLowerCase()))
  }, [tab, sortedChannels, dmItems, search])

  const anyUnread = (ids = []) => ids.some(id => (unreadByCanal?.[id] | 0) > 0 || (mentionByCanal?.[id] | 0) > 0)
  const sumUnread = (ids = []) => ids.reduce((acc, id) => acc + (unreadByCanal?.[id] | 0), 0)

  const groupIds = useMemo(() => sortedChannels.filter(c => c?.tipo?.codigo === 'grupo').map(c => c.id), [sortedChannels])
  const canalIds = useMemo(() => sortedChannels.filter(c => c?.tipo?.codigo !== 'grupo' && c?.tipo?.codigo !== 'dm').map(c => c.id), [sortedChannels])
  const dmIds = useMemo(() => dmItems.map(u => u.dm_canal_id).filter(Boolean), [dmItems])

  const tabs = [
    { key: 'channels', label: 'Canales', badgeCount: sumUnread(canalIds), badge: anyUnread(canalIds) },
    { key: 'groups', label: 'Grupos', badgeCount: sumUnread(groupIds), badge: anyUnread(groupIds) },
    { key: 'dms', label: 'Chat', badgeCount: sumUnread(dmIds), badge: anyUnread(dmIds) }
  ]

  const sel = useMemo(() => {
    return sortedChannels.find(x => x.id === cid) || dmItems.find(u => u.dm_canal_id === cid)
  }, [cid, sortedChannels, dmItems])

  const activeTitle = sel ? (sel.nombre ? (sel.apellido ? `${sel.nombre} ${sel.apellido}` : sel.nombre) : (sel.email || 'Chat')) : 'Chat'

  return (
    <div className="chat-mobile">
      {view === 'list' && (
        <div className="mobile-list-view">
          <header className="list-header">
            <div className="top">
              <h1>Mensajes</h1>
              <button className="add-btn"><FiPlus /></button>
            </div>
            <div className="search-bar">
              <FiSearch />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </header>

          <Tabs tabs={tabs} activeKey={tab} onChange={setTabPersist} />

          <div className="chats-list">
            {tab === 'dms' ? (
              <DMList
                items={filteredItems}
                onOpenDm={openDm}
                selectedId={cid}
                unreadLookup={unreadByCanal}
                mentionLookup={mentionByCanal}
              />
            ) : (
              <ChannelList
                channels={filteredItems}
                selectedId={cid}
                onOpen={handleOpen}
                unreadLookup={unreadByCanal}
                mentionLookup={mentionByCanal}
                emptyMsg={tab === 'groups' ? 'No se encontraron grupos.' : 'No se encontraron canales.'}
              />
            )}
          </div>
        </div>
      )}

      {view === 'chat' && (
        <div className="mobile-chat-view">
          <header className="top-nav">
            <button className="back-btn" onClick={() => setView('list')}>
              <FiChevronLeft />
            </button>
            <div className="channel-info">
              <div className="labels">
                <span className="ttl">{activeTitle}</span>
                <span className="status">en línea</span>
              </div>
            </div>
          </header>
          <PinnedBar canal_id={cid} onSelectMessage={handleSelectMessage} />
          <div className="timeline-container">
            <GlobalLoader isLoading={msgs.isLoading || msgs.isPreviousData} size={60} />
            <Timeline rows={msgs.data || []} loading={msgs.isLoading} canal_id={cid} members={membersFull} />
          </div>
          {cid && (
            <div className="composer-container">
              <Composer canal_id={cid} canal={sel} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}