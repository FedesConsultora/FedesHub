// /src/components/chat/shared/TypingIndicator.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import './TypingIndicator.scss'
import { displayName } from '../../../utils/people'

const DEBUG = true

export default function TypingIndicator({ canal_id, my_user_id, members=[] }) {
  const [map, setMap] = useState(() => Object.create(null)) // user_id -> expiresTs
  const tickRef = useRef(null)

  // Limpia expirados
  useEffect(() => {
    tickRef.current = setInterval(() => {
      const now = Date.now()
      setMap(prev => {
        const next = { ...prev }
        let changed = false
        for (const k of Object.keys(next)) {
          if (next[k] <= now) { delete next[k]; changed = true }
        }
        return changed ? next : prev
      })
    }, 800)
    return () => clearInterval(tickRef.current)
  }, [])

  // Normaliza payloads de SSE
  function normalize(detail = {}) {
    const inner = detail?.data ?? detail?.payload ?? detail
    const d = (inner?.data && (inner?.type || inner?.topic || inner?.event)) ? inner.data : inner
    const rawType =
      detail?.type ?? detail?.topic ?? detail?.event ??
      inner?.type ?? inner?.topic ?? inner?.event ?? ''
    const type = String(rawType).toLowerCase().replace(/:/g,'.')

    const cId = Number(
      d?.canal_id ?? d?.chat_canal_id ?? d?.channel_id ?? d?.channelId ??
      detail?.canal_id ?? detail?.chat_canal_id ?? 0
    )

    const uId = Number(
      d?.user_id ?? d?.userId ?? d?.user?.id ??
      detail?.user_id ?? 0
    )

    const on = (typeof d?.on === 'boolean') ? d.on : true

    let expires = null
    if (d?.until) {
      const t = new Date(d.until).getTime()
      if (!Number.isNaN(t)) expires = t
    }
    if (!expires) {
      const ttlSec = Number(d?.ttl_seconds ?? d?.ttl ?? 5)
      const ttl = Number.isFinite(ttlSec) ? Math.max(2, ttlSec) : 5
      expires = Date.now() + ttl * 1000
    }

    return { type, cId, uId, on, expires }
  }

  useEffect(() => {
    const sseHandler = (ev) => {
      const { type, cId, uId, on, expires } = normalize(ev?.detail || {})

      // ✅ Aceptamos "chat.channel.typing" y cualquier cosa que termine en ".typing"
      const isTypingEvt =
        type === 'typing' ||
        type === 'chat.typing' ||
        type === 'chat.presence.typing' ||
        type === 'chat.channel.typing' ||
        type.endsWith('.typing')

      if (!isTypingEvt) return
      if (Number(cId) !== Number(canal_id)) return

      // OJO: si estás probando solo, esto te oculta a vos mismo.
      // Para test, podés comentar la siguiente línea.
      if (!uId || Number(uId) === Number(my_user_id)) return


      setMap(prev => {
        const next = { ...prev }
        if (on === false) {
          if (next[uId]) delete next[uId]
          return next
        }
        next[uId] = expires
        return next
      })
    }

    // Eco local de dev (emisor: useTypingEmitter con debugSelf)
    const localHandler = (ev) => {
      const d = ev?.detail || {}
      if (Number(d?.canal_id) !== Number(canal_id)) return
      if (!d?.user_id) return


      setMap(prev => {
        const next = { ...prev }
        if (d.on === false) { if (next[d.user_id]) delete next[d.user_id]; return next }
        const ttlSec = Number(d.ttl_seconds ?? 5)
        next[d.user_id] = Date.now() + Math.max(2, ttlSec) * 1000
        return next
      })
    }

    window.addEventListener('fh:push', sseHandler)
    window.addEventListener('fh:typing', sseHandler)         // fallback
    window.addEventListener('fh:typing-local', localHandler) // eco dev

    return () => {
      window.removeEventListener('fh:push', sseHandler)
      window.removeEventListener('fh:typing', sseHandler)
      window.removeEventListener('fh:typing-local', localHandler)
    }
  }, [canal_id, my_user_id])

  const names = useMemo(() => {
    const ids = Object.keys(map).map(n => Number(n)).filter(Boolean)
    if (!ids.length) return []
    const nameOf = (id) => {
      const m = (members || []).find(mm => Number(mm.user_id) === id)
      return displayName(m) || `Usuario ${id}`
    }
    const out = ids.map(nameOf)
    return out
  }, [map, members])

  if (!names.length) return null

  const text = names.length === 1
    ? `${names[0]} está escribiendo`
    : `${names.slice(0, 2).join(' y ')}${names.length > 2 ? ` y ${names.length - 2} más` : ''} están escribiendo`

  return (
    <div className="typingIndicator" role="status" aria-live="polite" data-testid="typing-indicator">
      <span className="txt">{text}</span>
      <span className="dots" aria-hidden="true"><i/><i/><i/></span>
    </div>
  )
}