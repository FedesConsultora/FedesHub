import { useMemo, useEffect, useRef, useState, useContext } from 'react'
import { FaArrowDown } from 'react-icons/fa'
import { FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi'
import { VscPinned } from "react-icons/vsc";
import { useSetRead, useEditMessage, useDeleteMessage, usePinMessage } from '../../../hooks/useChat'
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
  const hasScrolledToLastRead = useRef(new Set())

  // Scroll to last read message on first load, then to bottom on updates
  useEffect(() => {
    if (!rows?.length || !canal_id) return
    const root = rootRef.current
    if (!root) return

    // Autoscroll logic for updates
    if (hasScrolledToLastRead.current.has(canal_id)) {
      const nearBottom = (root.scrollHeight - root.scrollTop - root.clientHeight) < 150
      if (nearBottom) {
        // Use requestAnimationFrame or timeout to wait for render
        setTimeout(() => {
          root.scrollTop = root.scrollHeight
        }, 50)
      }
      return
    }

    // First time loading this canal: find last read or go to bottom
    const myMember = members?.find(m => Number(m.user_id) === Number(my_user_id))
    const lastReadMsgId = Number(myMember?.last_read_msg_id ?? 0)

    if (lastReadMsgId > 0) {
      const lastReadEl = document.getElementById(`msg-${lastReadMsgId}`)
      if (lastReadEl) {
        setTimeout(() => {
          lastReadEl.scrollIntoView({ behavior: 'instant', block: 'start' })
          hasScrolledToLastRead.current.add(canal_id)
        }, 100)
        return
      }
    }

    // Fallback: Scroll to bottom with a slight delay to ensure scrollHeight is ready
    setTimeout(() => {
      root.scrollTop = root.scrollHeight
      hasScrolledToLastRead.current.add(canal_id)
    }, 100)
  }, [rows, canal_id, my_user_id, members])

  // Clear the tracking when canal changes
  useEffect(() => {
    return () => {
      if (canal_id) {
        hasScrolledToLastRead.current.delete(canal_id)
      }
    }
  }, [canal_id])

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

  // Edit/Delete state
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const editMessage = useEditMessage()
  const deleteMessage = useDeleteMessage()
  const pinMessage = usePinMessage()

  const memberByUserId = useMemo(() => {
    const map = new Map()
    for (const mm of (members || [])) {
      map.set(toNum(mm.user_id), mm)
    }
    return map
  }, [members])

  const msgUserId = toNum(m.user_id ?? m.autor?.id ?? null)
  const isMine = (msgUserId != null && my_user_id != null && msgUserId === my_user_id)
  const isDeleted = !!m.deleted_at
  const isEdited = !!m.is_edited
  const isPinned = m.pins && m.pins.length > 0

  // Check if message is older than 30 minutes (use created_at for the original send time)
  const messageTime = new Date(m.created_at).getTime()
  const now = Date.now()
  const thirtyMinutes = 30 * 60 * 1000
  const canEditOrDelete = !isNaN(messageTime) && (now - messageTime) < thirtyMinutes

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

  const handleEdit = () => {
    setEditText(m.body_text || '')
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (!editText.trim()) return
    editMessage.mutate(
      { mensaje_id: m.id, body_text: editText, canal_id }
    )
  }

  // Close edit mode when mutation succeeds
  useEffect(() => {
    if (editMessage.isSuccess && isEditing) {
      setIsEditing(false)
      setEditText('')
      editMessage.reset() // Reset mutation state
    }
  }, [editMessage.isSuccess, isEditing, editMessage])

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditText('')
  }

  const handleDelete = () => {
    deleteMessage.mutate(
      { mensaje_id: m.id, canal_id },
      {
        onSuccess: () => {
          setShowDeleteConfirm(false)
        }
      }
    )
  }

  const msgTs = new Date(m.created_at || m.updated_at).getTime()

  const handleTogglePin = () => {
    pinMessage.mutate({ mensaje_id: m.id, canal_id: Number(canal_id), on: !isPinned })
  }

  return (
    <div id={`msg-${m.id}`} className={'bubble' + (isMine ? ' mine' : '') + (isDeleted ? ' deleted' : '') + (isPinned ? ' pinned' : '')}>
      {!isDeleted && <button className="replyIco" title="Responder" onClick={() => setReplyTo(m)}>↩</button>}

      {/* Message actions menu (edit/delete/pin) */}
      {!isDeleted && !isEditing && (
        <div className="msgActions">
          <button
            className={`actionBtn ${isPinned ? 'active' : ''}`}
            title={isPinned ? 'Desfijar' : 'Fijar'}
            onClick={handleTogglePin}
            disabled={pinMessage.isPending}
          >
            <VscPinned style={{ transform: isPinned ? 'rotate(45deg)' : 'none' }} />
          </button>

          {isMine && canEditOrDelete && (
            <>
              <button className="actionBtn" title="Editar" onClick={handleEdit}>
                <FiEdit2 />
              </button>
              <button className="actionBtn" title="Eliminar" onClick={() => setShowDeleteConfirm(true)}>
                <FiTrash2 />
              </button>
            </>
          )}
        </div>
      )}

      <div className="meta">
        <div className="avatarSide" style={{ position: 'relative' }}>
          <Avatar
            src={pickAvatar(member) || pickAvatar(m)}
            name={author}
            size={28}
            federId={authorFederId}
          />
          <AttendanceBadge modalidad={getModalidad(statuses, authorFederId)} size={12} />
        </div>
        <div className="author">{author}</div>
        <span className="dot">•</span>
        <div className="fecha">{ts}</div>
        {!isDeleted && isEdited && <span className="editedLabel">(editado)</span>}
        {!isDeleted && isPinned && (
          <span className="pinnedBadge" style={{ marginLeft: '8px' }}>
            <VscPinned size={12} /> fijado
          </span>
        )}
      </div>

      {m.parent && !isDeleted && (
        <div onClick={goToParent} style={{ cursor: 'pointer' }}>
          <ReplyPreview
            autor={fullName(m.parent?.autor) || displayName(m.parent?.autor) || 'alguien'}
            excerptHtml={renderReplyExcerpt(m.parent?.body_text || '')}
          />
        </div>
      )}

      {/* Deleted message display */}
      {isDeleted && (
        <div className="txt deleted">
          <em>{author} ha eliminado este mensaje</em>
        </div>
      )}

      {/* Edit mode */}
      {!isDeleted && isEditing && (
        <div className="editMode">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="editActions">
            <button className="saveBtn" onClick={handleSaveEdit} disabled={!editText.trim() || editMessage.isPending}>
              <FiCheck /> Guardar
            </button>
            <button className="cancelBtn" onClick={handleCancelEdit}>
              <FiX /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Normal message display */}
      {!isDeleted && !isEditing && (
        <>
          <div className="txt" dangerouslySetInnerHTML={renderBody(m.body_text || '')} />
          <MessageAttachments items={m.adjuntos || []} />
        </>
      )}

      {/* Footer: reacciones + visto, alineados derecha */}
      {!isDeleted && (
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
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="deleteConfirmOverlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="deleteConfirmModal" onClick={(e) => e.stopPropagation()}>
            <h3>¿Eliminar mensaje?</h3>
            <p>Esta acción no se puede deshacer.</p>
            <div className="modalActions">
              <button className="cancelBtn" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </button>
              <button className="deleteBtn" onClick={handleDelete} disabled={deleteMessage.isPending}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}