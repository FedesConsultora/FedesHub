// /src/components/chat/desktop/ChatDesktop.jsx
import { useMemo, useEffect, useRef, useState } from 'react'
import ChannelList from '../shared/ChannelList'
import DMList from '../shared/DMList'
import Timeline from '../shared/Timeline'
import Composer from '../shared/Composer'
import Tabs from '../shared/Tabs'
import ChannelCreateModal from './ChannelCreateModal'
import ChannelHeader from './ChannelHeader'
import { useMessages, useDmCandidates, useChatRealtime, useChannelMembers } from '../../../hooks/useChat'
import { useAuthCtx } from '../../../context/AuthContext.jsx'
import { chatApi } from '../../../api/chat'
import { ChatActionCtx } from '../shared/context'
import { useRealtime } from '../../../realtime/RealtimeProvider'
import TypingIndicator from '../shared/TypingIndicator'
import { displayName } from '../../../utils/people'
import '../shared/TypingIndicator.scss'
import './ChatDesktop.scss'

export default function ChatDesktop({ channels = [], currentId = null, onOpen }) {
  const { user } = useAuthCtx()
  const myId = user?.id
  const { unreadByCanal, mentionByCanal, clearUnreadFor, setCurrentCanal } = useRealtime()

  const [cid, setCid] = useState(currentId || channels?.[0]?.id || null)
  const [view, setView] = useState(() => localStorage.getItem('fh:chat:view') || 'channels')

  // Modal de creación unificado (también lo usa el header)
  const [modal, setModal] = useState(false)
  const [createCfg, setCreateCfg] = useState({
    initialTipo: 'canal',
    lockTipo: false,
    initialNombre: '',
    preselectUserIds: []
  })
  const openCreate = (cfg = {}) => {
    setCreateCfg(prev => ({ ...prev, ...cfg }))
    setModal(true)
  }

  const [replyTo, setReplyTo] = useState(null)
  const composerRef = useRef(null)
  const setViewPersist = (v) => { setView(v); localStorage.setItem('fh:chat:view', v) }

  useEffect(() => setCid(currentId || channels?.[0]?.id || null), [currentId, channels])

  // ordenar canales por updated_at desc
  const sortedChannels = useMemo(() => {
    const arr = Array.isArray(channels) ? [...channels] : []
    arr.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    return arr
  }, [channels])

  const sel = useMemo(() => sortedChannels.find(c => c.id === cid) || null, [cid, sortedChannels])
  const msgs = useMessages(cid, { limit: 50 })
  useChatRealtime()

  const { data: membersFull = [] } = useChannelMembers(cid)

  // DMs barra lateral
  const dmQ = useDmCandidates()
  const dmItems = useMemo(() => {
    const arr = [...(dmQ.data || [])]
    arr.sort((a, b) => {
      const ta = a.last_msg_at ? new Date(a.last_msg_at).getTime() : 0
      const tb = b.last_msg_at ? new Date(b.last_msg_at).getTime() : 0
      if (ta === tb) {
        const na = (displayName(a) || '').toLowerCase()
        const nb = (displayName(b) || '').toLowerCase()
        return na.localeCompare(nb)
      }
      return tb - ta
    })
    return arr
  }, [dmQ.data])

  // ---- Badges por pestaña
  const anyUnread = (ids = []) => ids.some(id => (unreadByCanal?.[id] | 0) > 0 || (mentionByCanal?.[id] | 0) > 0)

  const groupIds = useMemo(() => sortedChannels.filter(c => c?.tipo?.codigo === 'grupo').map(c => c.id), [sortedChannels])
  const canalIds = useMemo(() => sortedChannels.filter(c => c?.tipo?.codigo !== 'grupo' && c?.tipo?.codigo !== 'dm').map(c => c.id), [sortedChannels])
  const dmIds = useMemo(() => (dmItems || []).map(u => u.dm_canal_id).filter(Boolean), [dmItems])

  const tabs = [
    { key: 'channels', label: 'Canales', badge: anyUnread(canalIds) },
    { key: 'groups', label: 'Grupos', badge: anyUnread(groupIds) },
    { key: 'dms', label: 'Chat', badge: anyUnread(dmIds) }
  ]

  const listChannels = useMemo(() => {
    const base = sortedChannels
    if (view === 'groups') return base.filter(c => c?.tipo?.codigo === 'grupo')
    if (view === 'channels') return base.filter(c => c?.tipo?.codigo !== 'dm' && c?.tipo?.codigo !== 'grupo')
    return []
  }, [sortedChannels, view])

  const canPost = useMemo(() => {
    if (!sel) return true
    const onlyMods = !!sel.only_mods_can_post
    if (!onlyMods) return true
    const myMember = sel.miembros?.find(m => m.user_id === myId) || sel.miembros?.[0] || null
    const myRol = myMember?.rol?.codigo || null
    return ['owner', 'admin', 'mod'].includes(myRol)
  }, [sel, myId])

  const onZoneDragOver = (e) => { e.preventDefault(); if (!canPost) return; e.dataTransfer.dropEffect = 'copy' }
  const onZoneDrop = (e) => {
    e.preventDefault()
    if (!canPost) return
    const arr = Array.from(e.dataTransfer?.files || [])
    if (arr.length) composerRef.current?.addFiles?.(arr)
  }

  const openDm = async (u) => {
    let targetId = u.dm_canal_id
    if (!targetId) {
      try {
        const c = await chatApi.channels.create({ tipo_codigo: 'dm', invited_user_ids: [u.user_id] })
        targetId = c.id
      } catch (e) { console.error('create dm', e); return }
    }
    setCid(targetId)
    setViewPersist('dms')
    onOpen?.(targetId)
  }

  useEffect(() => {
    if (!cid) return
    setCurrentCanal(cid)
    clearUnreadFor(cid)
  }, [cid]) // eslint-disable-line

  const unreadLookup = unreadByCanal
  const mentionLookup = mentionByCanal

  return (
    <div className="chat-desktop">
      <aside className="dock">
        <Tabs
          tabs={tabs}
          activeKey={view}
          onChange={setViewPersist}
          rightSlot={(view === 'channels' || view === 'groups')
            ? <button className="addBtn" title="Nuevo canal/grupo" onClick={() => openCreate({ initialTipo: view === 'groups' ? 'grupo' : 'canal', lockTipo: false })}>+</button>
            : null}
        />

        {(view === 'channels' || view === 'groups') && (
          <ChannelList
            channels={listChannels}
            selectedId={cid}
            onOpen={(id) => { setCid(id); onOpen?.(id) }}
            unreadLookup={unreadLookup}
            mentionLookup={mentionLookup}
          />
        )}
        {view === 'dms' && (
          <DMList
            items={dmItems}
            onOpenDm={openDm}
            selectedId={cid}
            unreadLookup={unreadLookup}
            mentionLookup={mentionLookup}
          />
        )}
      </aside>

      <section className="panel">
        <ChannelHeader
          canal={sel}
          onOpenChannel={(id) => { setCid(id); onOpen?.(id) }}
          setView={setViewPersist}
          onStartCreateGroup={(cfg) => openCreate(cfg)}  // ← crear grupo desde header (DM)
        />
        <div className="chat-dropzone" onDragOver={onZoneDragOver} onDrop={onZoneDrop}>
          <ChatActionCtx.Provider value={{ replyTo, setReplyTo }}>
            <Timeline
              rows={msgs.data || []}
              loading={msgs.isLoading}
              canal_id={cid}
              my_user_id={myId}
              members={membersFull}
            />

            <div className="composeArea">
              <TypingIndicator canal_id={cid} my_user_id={myId} members={membersFull} />
              {cid && (
                <Composer
                  ref={composerRef}
                  canal={sel}
                  canal_id={cid}
                  disabled={!canPost}
                  reason={sel?.only_mods_can_post ? 'Sólo moderadores pueden postear en este canal' : ''}
                />
              )}
            </div>
          </ChatActionCtx.Provider>
        </div>
      </section>

      <ChannelCreateModal
        open={modal}
        onClose={() => setModal(false)}
        onCreated={(c) => {
          setModal(false)
          setViewPersist(c?.tipo?.codigo === 'grupo' ? 'groups' : 'channels')
          setCid(c.id)
          onOpen?.(c.id)
        }}
        initialTipo={createCfg.initialTipo}
        lockTipo={createCfg.lockTipo}
        initialNombre={createCfg.initialNombre}
        preselectUserIds={createCfg.preselectUserIds}
      />
    </div>
  )
}