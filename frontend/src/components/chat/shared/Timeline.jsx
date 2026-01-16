import { useMemo, useEffect, useRef, useState, useContext } from 'react'
import { FaArrowDown } from 'react-icons/fa'
import { FiX, FiCheck } from 'react-icons/fi'
import { CiFaceSmile } from "react-icons/ci";
import { MdOutlineModeEdit } from "react-icons/md";
import { BsPinAngle } from "react-icons/bs";

import { FaRegTrashCan } from "react-icons/fa6";

import { LuReply } from "react-icons/lu";

import { useSetRead, useEditMessage, useDeleteMessage, usePinMessage, useToggleReaction } from '../../../hooks/useChat'
import ReactionBar, { CenteredPicker } from './ReactionBar'
import EmojiPicker from '../../common/EmojiPicker'
import MessageAttachments from './MessageAttachments'
import ReplyPreview from './ReplyPreview'
import ReadReceiptBadge from './ReadReceiptBadge'
import Avatar from '../../Avatar.jsx'
import { ChatActionCtx } from '../shared/context'
import { fullName, displayName, pickAvatar } from '../../../utils/people'
import AttendanceBadge from '../../common/AttendanceBadge.jsx'
import useAttendanceStatus, { getStatus } from '../../../hooks/useAttendanceStatus.js'
import './Timeline.scss'

const fmtDay = (d) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
const escapeHtml = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const linkify = (html = '') => html.replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')

export default function Timeline({ rows = [], loading = false, canal_id = null, my_user_id = null, members = [], canPin = true, canReply = true }) {

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
  console.log('[Timeline] statuses:', statuses)

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
    const myMember = members?.find(mem => Number(mem.user_id) === Number(my_user_id))
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
              canPin={canPin}
              canReply={canReply}
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

function MessageItem({ m, canal_id, my_user_id, members, statuses, canPin, canReply }) {
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

  const msgUserIdNum = toNum(m.user_id ?? m.autor?.id ?? null)
  const myUserIdNum = toNum(my_user_id)
  const isMine = (msgUserIdNum != null && myUserIdNum != null && msgUserIdNum === myUserIdNum)
  const isDeleted = !!m.deleted_at
  const isEdited = !!m.is_edited
  const isPinned = m.pins && m.pins.length > 0

  const member = memberByUserId.get(msgUserIdNum)
  const author = member ? (fullName(member) || displayName(member)) : (fullName(m?.autor) || displayName(m?.autor) || 'usuario')
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
        },
        onError: (err) => {
          console.error('[Timeline] delete error:', err)
          alert('Error al eliminar el mensaje: ' + (err?.response?.data?.error || err?.message || 'Error desconocido'))
          setShowDeleteConfirm(false)
        }
      }
    )
  }

  const msgTs = new Date(m.created_at || m.updated_at).getTime()

  const handleTogglePin = () => {
    pinMessage.mutate({ mensaje_id: m.id, canal_id: Number(canal_id), on: !isPinned })
  }

  // Reaction state
  const toggleReaction = useToggleReaction()
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleToggleReaction = (emoji) => {
    const reacts = m.reacciones || []
    const cur = reacts.find(r => r.emoji === emoji && Number(r.user_id) === Number(my_user_id))
    toggleReaction.mutate({ mensaje_id: m.id, emoji, on: !cur, canal_id })
    setPickerOpen(false)
  }

  return (
    <div id={`msg-${m.id}`} className={'msgWrapper' + (isMine ? ' mine' : '') + (isDeleted ? ' deleted' : '') + (isPinned ? ' pinned' : '')}>
      <div className="msgAvatarContainer" style={{ position: 'relative' }}>
        <Avatar
          src={pickAvatar(member) || pickAvatar(m)}
          name={author}
          size={32}
          federId={authorFederId}
        />
        <AttendanceBadge {...getStatus(statuses, authorFederId)} size={12} />
      </div>

      <div className="msgBody">
        <div className="msgMeta">
          <span className="author">{author}</span>
          <span className="time">{ts}</span>
          {!isDeleted && isEdited && <span className="editedLabel">(editado)</span>}
          {!isDeleted && isPinned && (
            <span className="pinnedBadge">
              <BsPinAngle size={12} /> fijado
            </span>
          )}
        </div>

        <div className="bubbleContainer">
          <div className="bubble">
            {m.parent && !isDeleted && (
              <div onClick={goToParent} style={{ cursor: 'pointer' }}>
                <ReplyPreview
                  autor={fullName(m.parent) || displayName(m.parent) || 'alguien'}
                  excerptHtml={renderReplyExcerpt(m.parent?.body_text || '')}
                />
              </div>
            )}

            {isDeleted ? (
              <div className="txt deleted">
                <em>{author} ha eliminado este mensaje</em>
              </div>
            ) : isEditing ? (
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
            ) : (
              <>
                <div className="txt" dangerouslySetInnerHTML={renderBody(m.body_text || '')} />
                <MessageAttachments items={m.adjuntos || []} isMine={isMine} />
              </>
            )}
          </div>

          {!isDeleted && !isEditing && (
            <>
              {canReply && (
                <button className="alwaysVisibleReply" title="Responder" onClick={() => setReplyTo(m)}>
                  <LuReply />
                </button>
              )}

              <div className="msgHoverActions">
                <button className="actionBtn" title="Reaccionar" onClick={() => setPickerOpen(true)}>
                  <CiFaceSmile />
                </button>
                {canPin && (
                  <button
                    className={`actionBtn ${isPinned ? 'active' : ''}`}
                    title={isPinned ? 'Desfijar' : 'Fijar'}
                    onClick={handleTogglePin}
                    disabled={pinMessage.isPending}
                  >
                    <BsPinAngle style={{ transform: isPinned ? 'rotate(45deg)' : 'none' }} />
                  </button>
                )}
                {isMine && (
                  <>
                    <button className="actionBtn" title="Editar" onClick={handleEdit}>
                      <MdOutlineModeEdit />
                    </button>
                    {(Date.now() - msgTs < 30 * 60 * 1000) && (
                      <button className="actionBtn" title="Eliminar" onClick={() => setShowDeleteConfirm(true)}>
                        <FaRegTrashCan />
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="msgFooter">
          <ReactionBar canal_id={canal_id} mensaje={m} members={members} showAdd={false} isMine={isMine} />
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

      {pickerOpen && (
        <CenteredPicker onClose={() => setPickerOpen(false)}>
          <EmojiPicker
            theme="dark"
            width="350px"
            height="450px"
            onSelect={handleToggleReaction}
            onClickOutside={() => setPickerOpen(false)}
          />
        </CenteredPicker>
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