import { useMemo, useEffect, useRef, useState, useContext } from 'react'
import { FaArrowDown } from 'react-icons/fa'
import { useSetRead } from '../../../hooks/useChat'
import ReactionBar from './ReactionBar'
import MessageAttachments from './MessageAttachments'
import ReplyPreview from './ReplyPreview'
import ReadReceiptBadge from './ReadReceiptBadge'
import Avatar from '../../Avatar.jsx'
import { ChatActionCtx } from '../shared/context'
import { fullName, displayName, pickAvatar } from '../../../utils/people'
import AttendanceBadge from '../../common/AttendanceBadge.jsx'
import useAttendanceStatus, { getModalidad } from '../../../hooks/useAttendanceStatus.js'
import './Timeline.scss'

const fmtDay = (d) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
const escapeHtml = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const linkify = (html = '') => html.replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')

export default function Timeline({ rows = [], loading = false, canal_id = null, my_user_id = null, members = [] }) {

  const ordered = useMemo(() => {
    return [...rows].sort((a, b) => new Date(a.created_at || a.updated_at) - new Date(b.created_at || b.updated_at))
  }, [rows])

  // Collect feder_ids for attendance status
  const authorFederIds = useMemo(() => {
    const ids = new Set()
    // Intentar sacar feder_id de todas las fuentes posibles (mismo patrón que pickFeder)
    for (const m of ordered) {
      const fid = toNum(
        m.feder_id ?? m.id_feder ??
        m.feder?.id ?? m.id_feder ??
        m.user?.feder?.id ??
        m.autor?.feder_id ?? m.autor?.id_feder ??
        m.autor?.feder?.id
      )
      if (fid) ids.add(fid)
    }
    // También de los miembros del canal
    for (const mem of (members || [])) {
      const fid = toNum(
        mem.feder_id ?? mem.id_feder ??
        mem.feder?.id ??
        mem.user?.feder?.id
      )
      if (fid) ids.add(fid)
    }
    return [...ids]
  }, [ordered, members])

  const { statuses } = useAttendanceStatus(authorFederIds)

  const groups = useMemo(() => {
    const g = {}
    for (const m of ordered) {
      const key = new Date(m.created_at || m.updated_at).toDateString()
      if (!g[key]) g[key] = []
      g[key].push(m)
    }
    return Object.entries(g)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([k, items]) => ({ k, label: fmtDay(k), items }))
  }, [ordered])

  // ... (sentinel & read logic)
  const sentinelRef = useRef(null)
  const rootRef = useRef(null)
  const [atBottom, setAtBottom] = useState(true)
  const [showJump, setShowJump] = useState(false)
  const setRead = useSetRead()
  const lastSentRef = useRef({ canal_id: null, id: 0 })
  const timerRef = useRef(null)

  useEffect(() => {
    if (!rows?.length) return
    const root = rootRef.current
    if (!root) return
    root.scrollTop = root.scrollHeight
  }, [rows])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const root = el.closest('.chat-timeline')
    rootRef.current = root
    const io = new IntersectionObserver(
      (entries) => setAtBottom(entries[0]?.isIntersecting ?? false),
      { root, threshold: 0.6 }
    )
    io.observe(el)

    const onScroll = () => {
      if (!root) return
      const nearBottom = (root.scrollHeight - root.scrollTop - root.clientHeight) < 120
      setShowJump(!nearBottom)
    }
    root.addEventListener('scroll', onScroll)
    onScroll()

    return () => { io.disconnect(); root?.removeEventListener('scroll', onScroll) }
  }, [])

  const lastId = ordered.length ? (ordered[ordered.length - 1]?.id ?? 0) : 0

  useEffect(() => {
    if (!canal_id || !lastId || !atBottom) return
    if (lastSentRef.current.canal_id === canal_id && lastSentRef.current.id >= lastId) return

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setRead.mutate(
        { canal_id, last_read_msg_id: lastId },
        { onSuccess: () => (lastSentRef.current = { canal_id, id: lastId }) }
      )
    }, 450)
    return () => clearTimeout(timerRef.current)
  }, [canal_id, lastId, atBottom, setRead])

  const scrollToBottom = () => {
    const root = rootRef.current
    if (!root) return
    root.scrollTo({ top: root.scrollHeight, behavior: 'smooth' })
  }

  return (
    <div className="chat-timeline">
      {loading && <div className="loading">Cargando…</div>}
      {!loading && !rows?.length && <div className="empty">No hay mensajes</div>}

      {groups.map(({ k, label, items }) => (
        <div key={k} className="dayGroup">
          <div className="daySep">{label}</div>
          {items.map(m => (
            <MessageItem
              key={m.id}
              m={m}
              canal_id={canal_id}
              my_user_id={my_user_id}
              members={members}
              statuses={statuses}
            />
          ))}
        </div>
      ))}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {showJump && (
        <button className="scrollToBottom" title="Ir al final" onClick={scrollToBottom} aria-label="Ir al final">
          <FaArrowDown />
        </button>
      )}
    </div>
  )
}

function MessageItem({ m, canal_id, my_user_id, members, statuses }) {
  const ts = new Date(m.created_at || m.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const { setReplyTo } = useContext(ChatActionCtx)

  const memberByUserId = useMemo(() => {
    const map = new Map()
    for (const mm of (members || [])) {
      map.set(toNum(mm.user_id), mm)
    }
    return map
  }, [members])

  const msgUserId = toNum(m.user_id ?? m.autor?.id ?? null)
  const isMine = (msgUserId != null && my_user_id != null && msgUserId === my_user_id)

  const member = memberByUserId.get(toNum(m.user_id))
  const author = member ? displayName(member) : displayName(m?.autor) || 'usuario'
  const authorFederId = toNum(
    member?.feder_id ?? member?.id_feder ?? member?.feder?.id ?? member?.user?.feder?.id ??
    m.feder_id ?? m.id_feder ?? m.feder?.id ?? m.user?.feder?.id ??
    m.autor?.feder_id ?? m.autor?.id_feder ?? m.autor?.feder?.id
  )

  const renderBody = (texto = '') => {
    let html = escapeHtml(texto).replace(/\n/g, '<br/>')
    const repl = (_, id) => `<span class="mentions">@${memberByUserId.get(Number(id))?.nombre || id}</span>`
    html = html.replace(/@user:(\d+)\b/g, repl).replace(/@(\d+)\b/g, repl)
    return { __html: linkify(html) }
  }
  const renderReplyExcerpt = (texto = '') => {
    let html = escapeHtml(texto.replace(/\s+/g, ' '))
    html = html.replace(/@user:(\d+)\b/g, (_, id) => `<span class="mentions">@${memberByUserId.get(Number(id))?.nombre || id}</span>`)
      .replace(/@(\d+)\b/g, (_, id) => `<span class="mentions">@${memberByUserId.get(Number(id))?.nombre || id}</span>`)
    return { __html: linkify(html) }
  }

  const goToParent = () => {
    const el = document.getElementById(`msg-${m.parent?.id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('hi-lite')
    setTimeout(() => el.classList.remove('hi-lite'), 1200)
  }

  const msgTs = new Date(m.created_at || m.updated_at).getTime()

  return (
    <div id={`msg-${m.id}`} className={'bubble' + (isMine ? ' mine' : '')}>
      <button className="replyIco" title="Responder" onClick={() => setReplyTo(m)}>↩</button>

      <div className="meta">
        <div className="avatarSide" style={{ position: 'relative' }}>
          <Avatar
            src={pickAvatar(m)}
            name={author}
            size={28}
          />
          <AttendanceBadge modalidad={getModalidad(statuses, authorFederId)} size={12} />
        </div>
        <div className="author">{author}</div>
        <span className="dot">•</span>
        <div className="fecha">{ts}</div>
      </div>

      {m.parent && (
        <div onClick={goToParent} style={{ cursor: 'pointer' }}>
          <ReplyPreview
            autor={fullName(m.parent?.autor) || displayName(m.parent?.autor) || 'alguien'}
            excerptHtml={renderReplyExcerpt(m.parent?.body_text || '')}
          />
        </div>
      )}

      <div className="txt" dangerouslySetInnerHTML={renderBody(m.body_text || '')} />
      <MessageAttachments items={m.adjuntos || []} />

      {/* Footer: reacciones + visto, alineados derecha */}
      <div className="msgFooter">
        <ReactionBar canal_id={canal_id} mensaje={m} members={members} />
        {isMine && (
          <ReadReceiptBadge
            canal_id={canal_id}
            msg_id={m.id}
            msg_ts={msgTs}
            my_user_id={my_user_id}
            members={members}
            align={isMine ? 'right' : 'left'}
          />
        )}
      </div>
    </div>
  )
}