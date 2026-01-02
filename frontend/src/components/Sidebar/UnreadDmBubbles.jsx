import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRealtime } from '../../realtime/RealtimeProvider'
import { useDmCandidates, useChannels } from '../../hooks/useChat'
import { displayName } from '../../utils/people'
import './UnreadDmBubbles.scss'

function initialsFromUser(u) {
  const nm = (displayName(u) || '').trim()
  if (nm) {
    const parts = nm.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  const email = (u?.email || '').trim()
  if (email) {
    const head = email.split('@')[0]
    if (head.length >= 2) return head.slice(0, 2).toUpperCase()
    if (head.length === 1) return head[0].toUpperCase()
  }
  return '??'
}

// Deriva unread de canales DM comparando ids de mensaje leídos vs último
function deriveDmUnreadFromChannels(channels = []) {
  const out = new Map() // canal_id -> count
  channels.forEach(c => {
    if (!c || c?.tipo?.codigo !== 'dm') return
    const mm = c?.miembros?.[0] || {}
    const lastRead = Number(mm.last_read_msg_id ?? 0)
    const lastMsg = Number(c.last_msg_id ?? c.ultimo_msg_id ?? 0)
    if (lastMsg > lastRead) out.set(Number(c.id), Math.min(99, Math.max(1, lastMsg - lastRead)))
  })
  return out
}

export default function UnreadDmBubbles({ limit = 8 }) {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const { unreadByCanal, mentionByCanal, currentCanal } = useRealtime()

  // Para nombres / emails del otro extremo del DM
  const dmQ = useDmCandidates()

  // Para persistencia tras reload: derivamos unread desde canales
  const chQ = useChannels({ scope: 'mine', include_archivados: false })
  const derivedUnread = useMemo(() => deriveDmUnreadFromChannels(chQ.data || []), [chQ.data])
  const chById = useMemo(() => {
    const m = new Map()
      ; (chQ.data || []).forEach(c => m.set(Number(c.id), c))
    return m
  }, [chQ.data])

  // canal_id -> user del DM
  const dmByCanal = useMemo(() => {
    const map = new Map()
      ; (dmQ.data || []).forEach(u => { if (u.dm_canal_id) map.set(Number(u.dm_canal_id), u) })
    return map
  }, [dmQ.data])

  // Suprimir localmente un canal cuando lo marcamos leído (para no “reaparecer” hasta que el servidor refresque)
  const [suppressed, setSuppressed] = useState(() => new Set())
  useEffect(() => {
    const onCleared = (e) => {
      const id = Number(e?.detail?.canal_id || 0)
      if (!id) return
      setSuppressed(prev => {
        const next = new Set(prev); next.add(id); return next
      })
      // TTL de cortesía: si por alguna razón no refresca el catálogo, lo volvemos a considerar
      const t = setTimeout(() => {
        setSuppressed(prev => { const next = new Set(prev); next.delete(id); return next })
      }, 30_000)
      return () => clearTimeout(t)
    }
    window.addEventListener('fh:chat:channel:cleared', onCleared)
    window.addEventListener('fh:chat:sent', onCleared)
    return () => {
      window.removeEventListener('fh:chat:channel:cleared', onCleared)
      window.removeEventListener('fh:chat:sent', onCleared)
    }
  }, [])

  // Lista final: unión de realtime (con conteo exacto) + derivado de canales (persistencia tras reload).
  const items = useMemo(() => {
    const arr = []
    // Usamos todos los posibles canal_id (de DMs) que conozcamos
    const allDmIds = new Set([...dmByCanal.keys(), ...Array.from(derivedUnread.keys())])

    allDmIds.forEach(cid => {
      // Si este canal es el que el usuario está viendo, no mostrar badge
      if (currentCanal && Number(currentCanal) === cid) return

      const rtCount = (unreadByCanal?.[cid] | 0)
      const fallback = suppressed.has(cid) ? 0 : (derivedUnread.get(cid) || 0)
      const count = rtCount || fallback
      if (!count) return

      const u = dmByCanal.get(cid)
      if (!u) return // necesitamos usuario para avatar/iniciales

      const ch = chById.get(cid)
      const last = u?.last_msg_at || ch?.updated_at || null

      arr.push({
        canal_id: cid,
        user: u,
        label: initialsFromUser(u),
        last: last ? new Date(last).getTime() : 0,
        hasMention: (mentionByCanal?.[cid] | 0) > 0,
        unreadCount: Math.min(99, count)
      })
    })

    arr.sort((a, b) => b.last - a.last)
    return arr.slice(0, limit)
  }, [dmByCanal, derivedUnread, unreadByCanal, mentionByCanal, suppressed, chById, limit])

  // Animación sutil al aparecer
  const [animIds, setAnimIds] = useState(() => new Set())
  const prevIdsRef = useRef(new Set())
  useEffect(() => {
    const nowIds = new Set(items.map(it => it.canal_id))
    const prevIds = prevIdsRef.current
    const newcomers = Array.from(nowIds).filter(id => !prevIds.has(id))
    if (newcomers.length) {
      setAnimIds(prev => {
        const next = new Set(prev)
        newcomers.forEach(id => next.add(id))
        return next
      })
      const t = setTimeout(() => {
        setAnimIds(prev => {
          const next = new Set(prev)
          newcomers.forEach(id => next.delete(id))
          return next
        })
      }, 600)
      prevIdsRef.current = nowIds
      return () => clearTimeout(t)
    }
    prevIdsRef.current = nowIds
  }, [items])

  if (!items.length) return null

  return (
    <div className="sbBubbles" aria-label="DMs no leídos">
      {items.map(it => {
        const sel = pathname.startsWith(`/chat/c/${it.canal_id}`)
        const cls = 'sbBubble'
          + (sel ? ' sel' : '')
          + (it.hasMention ? ' mention' : '')
          + (animIds.has(it.canal_id) ? ' pop' : '')
        const title = displayName(it.user) || it.user?.email || `DM #${it.canal_id}`
        const countTxt = it.unreadCount > 99 ? '99+' : String(it.unreadCount)
        return (
          <button
            key={it.canal_id}
            className={cls}
            title={title}
            onClick={() => nav(`/chat/c/${it.canal_id}`)}
            aria-label={`Abrir DM con ${title}. ${countTxt} sin leer`}
          >
            {it.label}
            <i className="dot" aria-hidden="true" />
            <span className="mini" aria-hidden="true">{countTxt}</span>
          </button>
        )
      })}
    </div>
  )
}