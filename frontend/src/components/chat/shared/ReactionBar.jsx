import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiSmile } from 'react-icons/fi'
import EmojiPicker from '../../common/EmojiPicker'
import { useToggleReaction } from '../../../hooks/useChat'
import { useAuthCtx } from '../../../context/AuthContext.jsx'
import { displayName } from '../../../utils/people'
import './ReactionBar.scss'

/**
 * Props:
 * - canal_id: number
 * - mensaje: { id, reacciones?: [{ emoji, user_id, created_at? }] }
 * - members: array de miembros del canal (para resolver nombres)
 * - showAdd: boolean (opcional, default true) para mostrar el botón de agregar reacción
 */
export default function ReactionBar({ canal_id, mensaje, members = [], showAdd = true, isMine = false }) {
  const toggle = useToggleReaction()
  const { user } = useAuthCtx()
  const myUid = Number(user?.id ?? 0)

  // === Agrupado por emoji, conservando count, si es "mine", y lista de usuarios
  const memberByUid = useMemo(() => {
    const map = new Map()
    for (const mm of (members || [])) map.set(Number(mm.user_id), mm)
    return map
  }, [members])

  const reacts = useMemo(() => {
    const byEmoji = new Map()
    for (const r of (mensaje.reacciones || [])) {
      const key = r.emoji
      const obj = byEmoji.get(key) || { emoji: key, count: 0, mine: false, users: [] }
      obj.count += 1
      if (Number(r.user_id) === myUid) obj.mine = true
      obj.users.push(memberByUid.get(Number(r.user_id)) || { user_id: r.user_id })
      byEmoji.set(key, obj)
    }
    return [...byEmoji.values()].sort((a, b) => (b.count - a.count) || String(a.emoji).localeCompare(String(b.emoji)))
  }, [mensaje.reacciones, myUid, memberByUid])

  const mutate = (emoji, on) => toggle.mutate({ mensaje_id: mensaje.id, emoji, on, canal_id })

  // === Picker en portal (sale del contenedor)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerBtnRef = useRef(null)

  return (
    <div className={`reactBar ${isMine ? 'is-mine' : ''}`}>
      {!!reacts.length && (
        <div className="reacts">
          {reacts.map(r => (
            <ChipWithHoverList
              key={r.emoji}
              emoji={r.emoji}
              count={r.count}
              mine={r.mine}
              users={r.users}
              onToggleMine={() => mutate(r.emoji, !r.mine)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <div className="pickerWrap">
          <button
            ref={pickerBtnRef}
            type="button"
            className="reactBtn more"
            onClick={() => setPickerOpen(v => !v)}
            title="Más emojis"
            aria-expanded={pickerOpen}
          >
            <FiSmile />
          </button>

          {pickerOpen && (
            <CenteredPicker onClose={() => setPickerOpen(false)}>
              <EmojiPicker
                onSelect={(emoji) => {
                  setPickerOpen(false)
                  const cur = reacts.find(r => r.emoji === emoji)
                  mutate(emoji, cur ? !cur.mine : true)
                }}
                onClickOutside={() => setPickerOpen(false)}
              />
            </CenteredPicker>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- Hover list (popover por hover) ---------------- */
function ChipWithHoverList({ emoji, count, mine, users = [], onToggleMine }) {
  const [hover, setHover] = useState(false)
  const leaveTimer = useRef(null)

  const open = () => { clearTimeout(leaveTimer.current); setHover(true) }
  const close = () => { leaveTimer.current = setTimeout(() => setHover(false), 120) }

  useEffect(() => () => clearTimeout(leaveTimer.current), [])

  return (
    <div className="chipWrap" onMouseEnter={open} onMouseLeave={close}>
      <button
        type="button"
        className={`chip ${mine ? 'mine' : ''}`}
        title={mine ? 'Quitar reacción' : 'Reaccionar'}
        onClick={onToggleMine}
      >
        <span className="em">{emoji}</span>
        <span className="n">{count}</span>
      </button>

      {hover && (
        <div className="chipPopover" role="dialog" aria-label="Reaccionaron">
          <header>{emoji} • {count} {count === 1 ? 'reacción' : 'reacciones'}</header>
          <ul>
            {users.map(u => (
              <li key={u.user_id}>
                <span className="name">{displayName(u) || `Usuario ${u.user_id}`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ---------------- Picker centrado por CSS (portal) ---------------- */
export function CenteredPicker({ onClose, children, className = '', layerClassName = '' }) {
  return createPortal(
    <>
      <div className="emojiPortalBackdrop" onClick={onClose} />
      <div
        className={`emojiPortalLayer ${layerClassName}`}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className={`emojiPanel ${className}`}>
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
