import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { initFCM, registerStoredPushToken } from '../push/fcm'
import { useAuth } from '../context/AuthContext.jsx'
import { notifApi } from '../api/notificaciones'

const RealtimeCtx = createContext(null)
export const useRealtime = () => useContext(RealtimeCtx)

const SOUND_MAP = {
  chat:        '/sounds/notificacionChat.mp3',
  tareas:      '/sounds/notificacionTareas.mp3',
  calendario:  '/sounds/notificacionCalendario.mp3',
  default:     '/sounds/notificacionChat.mp3'
}

function resolveBuzonFromData(data) {
  if (data?.chat_canal_id || data?.canal_id) return 'chat'
  if (data?.tarea_id)      return 'tareas'
  if (data?.evento_id)     return 'calendario'
  return 'default'
}

// menciones
function extractMentionsFromPayload(data) {
  const j = data?.mensaje?.body_json || data?.msg?.body_json || data?.body_json || null
  const t = data?.mensaje?.body_text || data?.msg?.body_text || data?.body_text || ''
  const set = new Set()
  if (j?.mentions && Array.isArray(j.mentions)) j.mentions.forEach(u => Number.isInteger(u) && set.add(Number(u)))
  const re = /\B@user:(\d+)\b/g
  for (const m of t.matchAll(re)) set.add(parseInt(m[1], 10))
  return set
}

// 🔑 dedup robusto para evitar doble llegada (SSE + FCM/SW)
function buildDedupKey(raw) {
  const d = raw?.data ?? raw ?? {}
  const t = String(d?.type || d?.Tipo || d?.evento || d?.tipo || '').toLowerCase()
  const cid = d?.canal_id ?? d?.chat_canal_id ?? ''
  const nid = d?.notificacion_id ?? d?.notification_id ?? d?.notif_id
  if (nid) return `notif:${nid}`

  const mid = d?.mensaje?.id ?? d?.msg?.id ?? d?.message_id ?? d?.id
  if (mid) return `${t}|${cid}|msg:${mid}`

  const uuid = d?.mensaje?.uuid ?? d?.msg?.uuid ?? d?.uuid
  if (uuid) return `${t}|${cid}|uuid:${uuid}`

  const createdAt = d?.mensaje?.created_at ?? d?.msg?.created_at ?? d?.created_at
  if (createdAt) return `${t}|${cid}|at:${createdAt}`

  return `${t}|${cid}|fallback`
}

export default function RealtimeProvider({ children }) {
  const qc = useQueryClient()
  const { user, booted } = useAuth() || {}

  // ---- sonido
  const [muted, setMuted] = useState(() => localStorage.getItem('fh:sound:muted') === '1')
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('fh:sound:vol') ?? 1))
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const lastPlayByKeyRef = useRef(new Map()) // throttle por canal/buzón

  // ---- unread badges (por canal)
  const [unreadByCanal, setUnreadByCanal] = useState(() => Object.create(null))
  const [mentionByCanal, setMentionByCanal] = useState(() => Object.create(null))

  // canal actualmente abierto
  const currentCanalRef = useRef(null)
  const setCurrentCanal = (id) => { currentCanalRef.current = id }

  // ECO: mis envíos recientes
  const recentSelfSendsRef = useRef(new Map())
  const markSelfSend = (canal_id) => {
    if (!canal_id) return
    recentSelfSendsRef.current.set(Number(canal_id), Date.now())
  }
  const isLikelySelfEcho = (canal_id, windowMs=3000) => {
    const ts = recentSelfSendsRef.current.get(Number(canal_id))
    return !!(ts && (Date.now() - ts) <= windowMs)
  }

  // Notifs de chat a bajar por canal
  const notifByCanalRef = useRef(new Map())
  const rememberNotifForCanal = (canal_id, notif_id) => {
    if (!canal_id || !notif_id) return
    const id = Number(canal_id)
    const set = notifByCanalRef.current.get(id) || new Set()
    set.add(Number(notif_id))
    notifByCanalRef.current.set(id, set)
  }

  // Barrido extra: si hubo carrera y llegó la notif después, la bajamos igual
  const sweepUnreadChatForCanal = async (canal_id) => {
    try {
      const inbox = await notifApi.inbox({ buzon:'chat', only_unread:true, sort:'newest', limit: 30 }).catch(()=>null)
      const rows = inbox?.rows || []
      const ids = rows
        .map(r => r?.notificacion)
        .filter(Boolean)
        .filter(n =>
          (n?.chatCanal?.id && Number(n.chatCanal.id) === Number(canal_id)) ||
          (n?.data?.canal_id && Number(n.data.canal_id) === Number(canal_id)) ||
          (n?.canal_id && Number(n.canal_id) === Number(canal_id))
        )
        .map(n => n.id)
        .filter(Boolean)
      if (ids.length) await Promise.allSettled(ids.map(id => notifApi.read(id, true)))
    } catch {}
  }

  const flushChatNotifsForCanal = async (canal_id) => {
    const id = Number(canal_id)
    const set = notifByCanalRef.current.get(id)
    if (set && set.size) {
      const ids = Array.from(set)
      try { await Promise.allSettled(ids.map(nid => notifApi.read(nid, true))) } catch {}
      notifByCanalRef.current.delete(id)
    }
    await sweepUnreadChatForCanal(id) // catch-up
    qc.invalidateQueries({ queryKey: ['notif','counts'] })
    qc.invalidateQueries({ queryKey: ['notif','inbox'] })
    window.dispatchEvent(new Event('fh:notif:changed'))
  }

  // unlock autoplay (más eventos para asegurar)
  useEffect(() => {
    if (audioUnlocked) return
    const unlock = async () => {
      try {
        const a = new Audio(SOUND_MAP.default); a.volume = 0
        await a.play().catch(() => {}); a.pause(); a.currentTime = 0
        setAudioUnlocked(true)
        ['click','keydown','pointerdown','touchstart'].forEach(ev => document.removeEventListener(ev, unlock))
      } catch {}
    }
    ['click','keydown','pointerdown','touchstart'].forEach(ev => document.addEventListener(ev, unlock))
    return () => ['click','keydown','pointerdown','touchstart'].forEach(ev => document.removeEventListener(ev, unlock))
  }, [audioUnlocked])

  useEffect(() => {
    localStorage.setItem('fh:sound:vol', String(volume))
  }, [volume])
  useEffect(() => { localStorage.setItem('fh:sound:muted', muted ? '1' : '0') }, [muted])

  // Repro con throttle + retry
  function playSoundFor(data) {
    if (muted || !audioUnlocked) return
    const buzon = resolveBuzonFromData(data)
    const cid = data?.canal_id ?? data?.chat_canal_id
    const key = cid ? `${buzon}:${cid}` : buzon

    const now = Date.now()
    const last = lastPlayByKeyRef.current.get(key) || 0
    if (now - last < 750) return // throttle
    lastPlayByKeyRef.current.set(key, now)

    const src = SOUND_MAP[buzon] || SOUND_MAP.default
    const a = new Audio(src)
    a.volume = volume
    a.play().catch(() => setTimeout(() => a.play().catch(()=>{}), 150))
  }

  // ---- SSE → window event (inyectamos type si viene vacío)
  useEffect(() => {
    if (!booted || !user) return
    let es = new EventSource('/api/realtime/stream', { withCredentials: true })

    const forward = (ev) => {
      const evType = ev?.type || 'message'
      let payload = {}
      try { payload = JSON.parse(ev?.data || '{}') } catch {}
      if (!payload.type) payload.type = evType
      console.log('[SSE→fh:push]', evType, payload)
      window.dispatchEvent(new CustomEvent('fh:push', { detail: payload }))
    }
    const onOpen = () => { window.__FH_SSE_OK = true; console.log('[SSE] open') }
    const onErr  = (e) => { console.warn('[SSE] error', e); try { es.close() } catch {}; es = null; window.__FH_SSE_OK = false }

    const TYPES = [
      'message', 'ping',
      'chat.typing',
      'chat.message.created', 'chat.message.edited', 'chat.message.deleted',
      'chat.channel.updated', 'chat.channel.archived', 'chat.channel.read'
    ]
    es.addEventListener('open', onOpen)
    TYPES.forEach(t => es.addEventListener(t, forward))
    es.onerror = onErr

    return () => {
      try { es?.removeEventListener('open', onOpen); TYPES.forEach(t => es?.removeEventListener(t, forward)); es?.close() } catch {}
      window.__FH_SSE_OK = false
    }
  }, [booted, user])

  // de-dup (clave -> ts)
  const dedupRef = useRef(new Map())
  const seenOnce = (key, ttl=5000) => {
    if (!key) return false
    const now = Date.now()
    for (const [k, t] of dedupRef.current.entries()) if (now - t > ttl) dedupRef.current.delete(k)
    if (dedupRef.current.has(key)) return true
    dedupRef.current.set(key, now)
    return false
  }

  // ---- main handler
  function onIncoming(anyData) {
    const data = anyData?.data ?? anyData ?? {}
    const type = String(data?.type || data?.Tipo || data?.evento || data?.tipo || '').toLowerCase()
    const myId = Number(user?.id || 0)

    const dedupKey = buildDedupKey(anyData)
    if (seenOnce(dedupKey)) return

    console.log('notification data: ', data)

    // invalidaciones mínimas
    if (type.startsWith('chat.')) {
      const canal_id = data?.canal_id
      if (/chat\.message\.(created|edited|deleted)/.test(type) && canal_id) {
        qc.invalidateQueries({ queryKey: ['chat','msgs', canal_id] })
      }
      if (/chat\.channel\./.test(type) && canal_id) {
        qc.invalidateQueries({ queryKey: ['chat','channels'] })
        qc.invalidateQueries({ queryKey: ['chat','members', canal_id] })
      }
    }

    // READ remoto: limpiar badges + header
    if (type === 'chat.channel.read') {
      const canal_id = Number(data?.canal_id || 0)
      const who = Number(data?.user_id || 0)
      if (canal_id && who === myId) {
        setUnreadByCanal(prev => {
          if (!prev[canal_id]) return prev
          const next = { ...prev }; delete next[canal_id]; return next
        })
        setMentionByCanal(prev => {
          if (!prev[canal_id]) return prev
          const next = { ...prev }; delete next[canal_id]; return next
        })
        flushChatNotifsForCanal(canal_id).catch(()=>{})
      }
    }

    // “nuevo mensaje de chat”
    const looksLikeNewChatMsg =
      type === 'chat.message.created' ||
      (type === 'chat_mensaje' && !!data?.chat_canal_id)

    if (looksLikeNewChatMsg) {
      const canal_id = Number(
        data?.canal_id ?? data?.mensaje?.canal_id ?? data?.msg?.canal_id ?? data?.chat_canal_id ?? 0
      )
      const authorId = Number(
        data?.user_id ?? data?.mensaje?.user_id ?? data?.msg?.user_id ?? 0
      )
      if (!canal_id || !myId) return

      const notifId = Number(data?.notificacion_id || 0)
      const isCurrentOpen = currentCanalRef.current === canal_id

      // si el canal está abierto, marcamos la notif inmediatamente para evitar “pegadas”
      if (isCurrentOpen && notifId) {
        notifApi.read(notifId, true).catch(()=>{})
      }

      // si sé que soy yo, ignoro; si no hay autor, evito eco de mi envío reciente
      if (authorId && authorId === myId) return
      if (!authorId && isLikelySelfEcho(canal_id)) return

      if (!isCurrentOpen) {
        if (notifId) rememberNotifForCanal(canal_id, notifId)
        playSoundFor({ chat_canal_id: canal_id })
        const mentionSet = extractMentionsFromPayload(data)
        const iWasMentioned = mentionSet.has(myId)
        setUnreadByCanal(prev => ({ ...prev, [canal_id]: (prev[canal_id] || 0) + 1 }))
        if (iWasMentioned) {
          setMentionByCanal(prev => ({ ...prev, [canal_id]: (prev[canal_id] || 0) + 1 }))
        }
      }
    }

    // notificaciones genéricas
    qc.invalidateQueries({ queryKey: ['notif','counts'] })
    qc.invalidateQueries({ queryKey: ['notif','inbox'] })
  }

  // listener global (FCM foreground + SW + SSE unificados)
  useEffect(() => {
    const handler = (ev) => onIncoming(ev?.detail || {})
    window.addEventListener('fh:push', handler)
    const onSelfSent = (e) => { if (e?.detail?.canal_id) markSelfSend(e.detail.canal_id) }
    window.addEventListener('fh:chat:sent', onSelfSent)
    return () => {
      window.removeEventListener('fh:push', handler)
      window.removeEventListener('fh:chat:sent', onSelfSent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // FCM
  useEffect(() => {
    if (!booted || !user) return
    initFCM()
      .then(() => registerStoredPushToken())
      .catch((e) => console.log('[FCM] init err', e?.message || e))
  }, [booted, user])

  // ✅ Propagar “hay/no hay unread en chat” **post-commit** (evita warning en Sidebar)
  useEffect(() => {
    const hasAny = Object.values(unreadByCanal || {}).some(v => (v|0) > 0)
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('fh:chat:hasUnread', { detail: { hasUnread: hasAny } }))
    })
  }, [unreadByCanal])

  const value = useMemo(() => ({
    muted, setMuted, volume, setVolume,
    unreadByCanal, mentionByCanal,
    clearUnreadFor: (canal_id) => {
      setUnreadByCanal(prev => {
        if (!prev[canal_id]) return prev
        const next = { ...prev }; delete next[canal_id]
        return next
      })
      setMentionByCanal(prev => {
        if (!prev[canal_id]) return prev
        const next = { ...prev }; delete next[canal_id]
        return next
      })
      flushChatNotifsForCanal(canal_id).catch(()=>{})
    },
    setCurrentCanal,
    markSelfSend,
    flushChatNotifsForCanal,
    playTest: () => onIncoming({ type: 'chat.message.created', canal_id: 1, user_id: -1 })
  }), [muted, volume, unreadByCanal, mentionByCanal])

  return (
    <RealtimeCtx.Provider value={value}>
      {children}
    </RealtimeCtx.Provider>
  )
}
