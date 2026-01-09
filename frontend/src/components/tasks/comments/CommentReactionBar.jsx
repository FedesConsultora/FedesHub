import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiSmile } from 'react-icons/fi'
import EmojiPicker from '../../common/EmojiPicker'
import { useAuthCtx } from '../../../context/AuthContext.jsx'
import { displayName } from '../../../utils/people'
import '../../chat/shared/ReactionBar.scss' // Reusing styles

/**
 * Props:
 * - c: comment object with { id, reacciones?: [{ emoji, user_id, created_at? }] }
 * - feders: array of feders (to resolve names from user_id)
 * - onToggle: (emoji, on) => void
 */
export default function CommentReactionBar({ c, feders = [], onToggle }) {
    const { user } = useAuthCtx()
    const myUid = Number(user?.id ?? 0)

    // === Map user_id to feder info for displayNames
    const federByUid = useMemo(() => {
        const map = new Map()
        for (const f of (feders || [])) {
            if (f.user_id) map.set(Number(f.user_id), f)
        }
        return map
    }, [feders])

    const reacts = useMemo(() => {
        const byEmoji = new Map()
        for (const r of (c.reacciones || [])) {
            const key = r.emoji
            const obj = byEmoji.get(key) || { emoji: key, count: 0, mine: false, users: [] }
            obj.count += 1
            if (Number(r.user_id) === myUid) obj.mine = true

            const fed = federByUid.get(Number(r.user_id))
            obj.users.push(fed ? fed : { user_id: r.user_id, nombre: `Usuario ${r.user_id}` })

            byEmoji.set(key, obj)
        }
        return [...byEmoji.values()].sort((a, b) => (b.count - a.count) || String(a.emoji).localeCompare(String(b.emoji)))
    }, [c.reacciones, myUid, federByUid])

    const [pickerOpen, setPickerOpen] = useState(false)
    const pickerBtnRef = useRef(null)

    return (
        <div className="reactBar">
            {!!reacts.length && (
                <div className="reacts">
                    {reacts.map(r => (
                        <ChipWithHoverList
                            key={r.emoji}
                            emoji={r.emoji}
                            count={r.count}
                            mine={r.mine}
                            users={r.users}
                            onToggleMine={() => onToggle(r.emoji, !r.mine)}
                        />
                    ))}
                </div>
            )}

            <div className="pickerWrap">
                <button
                    ref={pickerBtnRef}
                    type="button"
                    className="reactBtn more"
                    onClick={() => setPickerOpen(v => !v)}
                    title="Añadir reacción"
                    aria-expanded={pickerOpen}
                >
                    <FiSmile />
                </button>

                {pickerOpen && (
                    <CenteredPicker onClose={() => setPickerOpen(false)}>
                        <EmojiPicker
                            theme="light"
                            width="280px"
                            height="380px"
                            onSelect={(emoji) => {
                                setPickerOpen(false)
                                const cur = reacts.find(r => r.emoji === emoji)
                                onToggle(emoji, cur ? !cur.mine : true)
                            }}
                            onClickOutside={() => setPickerOpen(false)}
                        />
                    </CenteredPicker>
                )}
            </div>
        </div>
    )
}

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
                        {users.map((u, i) => (
                            <li key={u.user_id || i}>
                                <span className="name">{displayName(u) || u.nombre}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

function CenteredPicker({ onClose, children }) {
    return createPortal(
        <>
            <div className="emojiPortalBackdrop" onClick={onClose} />
            <div className="emojiPortalLayer" style={{ top: 'unset', left: 'unset', placeItems: 'center' }}>
                <div className="emojiPanel">
                    {children}
                </div>
            </div>
        </>,
        document.body
    )
}
