// /src/components/chat/desktop/ChatDesktop.jsx
import { useMemo, useEffect, useRef, useState } from 'react'
import { FiMessageSquare } from 'react-icons/fi'
import ChannelList from '../shared/ChannelList'
import DMList from '../shared/DMList'
import Timeline from '../shared/Timeline'
import Composer from '../shared/Composer'
import Tabs from '../shared/Tabs'
import ChannelCreateModal from './ChannelCreateModal'
import ChannelHeader from './ChannelHeader'
import { useMessages, useDmCandidates, useChatRealtime, useChannelMembers, useChannelPins } from '../../../hooks/useChat'
import { useAuthCtx } from '../../../context/AuthContext.jsx'
import { chatApi } from '../../../api/chat'
import { ChatActionCtx } from '../shared/context'
import { useRealtime } from '../../../realtime/RealtimeProvider'
import TypingIndicator from '../shared/TypingIndicator'
import PinnedBar from '../shared/PinnedBar'
import { useLoading } from '../../../context/LoadingContext.jsx'
import GlobalLoader from '../../loader/GlobalLoader.jsx'
import { displayName } from '../../../utils/people'
import '../shared/TypingIndicator.scss'
import './ChatDesktop.scss'

export default function ChatDesktop({ channels = [], currentId = null, onOpen }) {
  const { user } = useAuthCtx()
  const { isLoading } = useLoading()
  const myId = user?.id
  const { unreadByCanal, mentionByCanal, clearUnreadFor, setCurrentCanal } = useRealtime()

  const [cid, setCid] = useState(currentId || null)
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

  useEffect(() => setCid(currentId || null), [currentId])

  // ordenar canales por updated_at desc
  const sortedChannels = useMemo(() => {
    const arr = Array.isArray(channels) ? [...channels] : []
    arr.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    return arr
  }, [channels])

  const sel = useMemo(() => sortedChannels.find(c => c.id === cid) || null, [cid, sortedChannels])

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

  const msgs = useMessages(cid, { limit: 50 })
  useChatRealtime()
  const { data: membersFull = [] } = useChannelMembers(cid)

  // Sync view tab with selected channel type
  useEffect(() => {
    if (!cid) return

    // 1. Check in normal channels
    if (sel?.tipo?.codigo) {
      const tipo = sel.tipo.codigo
      if (tipo === 'dm' && view !== 'dms') setViewPersist('dms')
      else if (tipo === 'grupo' && view !== 'groups') setViewPersist('groups')
      else if (tipo !== 'dm' && tipo !== 'grupo' && view !== 'channels') setViewPersist('channels')
      return
    }

    // 2. Fallback: Check in DM items (for just created DMs or those not in 'mine' scope yet)
    const isDM = dmItems.some(u => u.dm_canal_id === cid)
    if (isDM && view !== 'dms') {
      setViewPersist('dms')
    }
  }, [cid, sel, dmItems]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectMessage = (msg) => {
    const el = document.getElementById(`msg-${msg.id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('hi-lite')
      setTimeout(() => el.classList.remove('hi-lite'), 2000)
    }
  }

  // ---- Badges por pestaña
  const anyUnread = (ids = []) => ids.some(id => (unreadByCanal?.[id] | 0) > 0 || (mentionByCanal?.[id] | 0) > 0)
  const sumUnread = (ids = []) => ids.reduce((acc, id) => acc + (unreadByCanal?.[id] | 0), 0)

  const groupIds = useMemo(() => sortedChannels.filter(c => c?.tipo?.codigo === 'grupo').map(c => c.id), [sortedChannels])
  const canalIds = useMemo(() => sortedChannels.filter(c => c?.tipo?.codigo !== 'grupo' && c?.tipo?.codigo !== 'dm').map(c => c.id), [sortedChannels])
  const dmIds = useMemo(() => (dmItems || []).map(u => u.dm_canal_id).filter(Boolean), [dmItems])

  const tabs = [
    { key: 'channels', label: 'Canales', badgeCount: sumUnread(canalIds), badge: anyUnread(canalIds) },
    { key: 'groups', label: 'Grupos', badgeCount: sumUnread(groupIds), badge: anyUnread(groupIds) },
    { key: 'dms', label: 'Chat', badgeCount: sumUnread(dmIds), badge: anyUnread(dmIds) }
  ]

  const listChannels = useMemo(() => {
    const base = sortedChannels
    if (view === 'groups') return base.filter(c => c?.tipo?.codigo === 'grupo')
    if (view === 'channels') return base.filter(c => c?.tipo?.codigo !== 'dm' && c?.tipo?.codigo !== 'grupo')
    return []
  }, [sortedChannels, view])

  const canPost = useMemo(() => {
    if (!sel) return true
    if (!sel.only_mods_can_post) return true
    if (sel.miembros && Array.isArray(sel.miembros)) {
      const myMember = sel.miembros.find(m => m.user_id === myId)
      if (myMember) {
        const myRol = myMember.rol?.codigo || null
        return ['owner', 'admin', 'mod'].includes(myRol)
      }
    }
    return true
  }, [sel, myId])

  const canPin = useMemo(() => {
    if (!sel) return false
    if (sel.miembros && Array.isArray(sel.miembros)) {
      const myMember = sel.miembros.find(m => m.user_id === myId)
      if (myMember) {
        const myRol = myMember.rol?.codigo || null
        return ['owner', 'admin'].includes(myRol)
      }
    }
    return false
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
            emptyMsg={view === 'groups' ? 'No se encontraron grupos.' : 'No se encontraron canales.'}
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
        {cid && sel ? (
          <>
            <ChannelHeader
              canal={sel}
              onOpenChannel={(id) => { setCid(id); onOpen?.(id) }}
              setView={setViewPersist}
              onStartCreateGroup={(cfg) => openCreate(cfg)}
              onSelectMessage={handleSelectMessage}
            />
            <PinnedBar canal_id={cid} onSelectMessage={handleSelectMessage} canUnpin={canPin} />
            <div className="chat-dropzone" onDragOver={onZoneDragOver} onDrop={onZoneDrop}>
              <ChatActionCtx.Provider value={{ replyTo, setReplyTo }}>
                <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <GlobalLoader isLoading={msgs.isLoading || msgs.isPreviousData} size={80} />
                  <Timeline
                    rows={msgs.data || []}
                    loading={msgs.isLoading}
                    canal_id={cid}
                    my_user_id={myId}
                    members={membersFull}
                    canPin={canPin}
                    canReply={canPost}
                  />
                </div>

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
          </>
        ) : (
          <div className="chat-placeholder">
            <div className="placeholder-content">
              <FiMessageSquare size={52} />
              <h3>Buenas, {user?.nombre || 'Enzo'}</h3>
              <p>Elegí una conversación para continuar.</p>
              <GlobalLoader isLoading={isLoading} size={40} />
            </div>
          </div>
        )}
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