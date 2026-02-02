import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { initFCM, registerStoredPushToken } from '../push/fcm'
import { useAuth } from '../context/AuthContext.jsx'
import { notifApi } from '../api/notificaciones'
import { displayName, pickAvatar } from '../utils/people'

const RealtimeCtx = createContext(null)
export const useRealtime = () => useContext(RealtimeCtx)

const SOUND_MAP = {
  chat: '/sounds/notificacionChat.mp3',
  tareas: '/sounds/notificacionTareas.mp3',
  calendario: '/sounds/notificacionCalendario.mp3',
  default: '/sounds/notificacionChat.mp3'
}

function resolveBuzonFromData(data) {
  if (data?.chat_canal_id || data?.canal_id) return 'chat'
  if (data?.tarea_id) return 'tareas'
  if (data?.evento_id) return 'calendario'
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
  // 1. Identificadores técnicos (Crucial para cruce SSE/FCM)
  const mid = d?.mensaje_id ?? d?.message?.id ?? d?.mensaje?.id ?? d?.msg?.id ?? d?.message_id ?? d?.id
  const nid = d?.notificacion_id ?? d?.notification_id ?? d?.notif_id
  const unifiedId = mid ? String(mid) : (nid ? `notif:${nid}` : null)

  // 2. Normalizar tipo y canal
  let t = String(d?.type || d?.Tipo || d?.evento || d?.tipo || '').toLowerCase()
  if (t === 'chat_mensaje' || t === 'chat.message.created') t = 'chat_new_msg'
  const cid = d?.canal_id ?? d?.chat_canal_id ?? d?.message?.canal_id ?? d?.mensaje?.canal_id ?? ''

  // 3. Texto para dedup semántico (Limpiar ruidos de sistema)
  let text = (
    d?.fcm_body ||
    d?.message?.body_text ||
    d?.mensaje?.body_text ||
    d?.body_text ||
    d?.body ||
    d?.texto ||
    ''
  ).trim().toLowerCase().slice(0, 100)

  // SIEMPRE priorizar el ID único si existe
  if (unifiedId) return `uid:${unifiedId}`

  // Fallback a Canal + Texto (para cuando el ID viene 'undefined' o nulo)
  if (t === 'chat_new_msg' && cid) return `chat|${cid}|${text}`
  if (cid) return `can|${cid}|${text}`
  return `msg|${text}`
}

// 🔍 Buscador recursivo de fotos de perfil (Avatar Hunter 3.0 - Ultra Permisivo)
function recursiveFindAvatar(obj, depth = 0) {
  if (depth > 6 || !obj || typeof obj !== 'object') return null

  const searchTerms = ['author_avatar', 'avatar', 'fcm_icon', 'image', 'picture', 'icon', 'photo', 'foto', 'perfil', 'url', 'thumbnail']
  const keys = Object.keys(obj)

  // 1. Nivel actual: Buscar strings que parezcan URLs de imagen
  for (const k of keys) {
    const val = obj[k]
    if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('/'))) {
      const lowerK = k.toLowerCase()
      const isImgUrl = /\.(jpg|jpeg|png|webp|gif|svg|ico)$/i.test(val) || val.includes('googleusercontent') || val.includes('avatar') || val.includes('/api/perfil/foto') || lowerK.includes('author_avatar')
      if (isImgUrl && searchTerms.some(t => lowerK.includes(t))) return val
    }
  }

  // 2. Búsqueda profunda
  for (const k of keys) {
    const found = recursiveFindAvatar(obj[k], depth + 1)
    if (found) return found
  }
  return null
}

export default function RealtimeProvider({ children }) {
  const qc = useQueryClient()
  const { user, booted } = useAuth() || {}

  // ---- Refs de Estado y Deduplicación
  const dedupRef = useRef(new Map())
  const lastPlayByKeyRef = useRef(new Map())
  const pendingBannersRef = useRef(new Map())
  const currentCanalRef = useRef(null)
  const recentSelfSendsRef = useRef(new Map())
  const notifByCanalRef = useRef(new Map())
  const audioContextRef = useRef(null)
  const processedNotifsRef = useRef(new Map()) // Clave -> Nivel (SSE=1, FCM=2)
  const lastInteractionRef = useRef(0)
  const audioContextStateRef = useRef('unknown')
  const broadcastChannelRef = useRef(null)
  const isMasterTabRef = useRef(false)
  const [tabId] = useState(() => Math.random().toString(36).slice(2, 9))

  // ---- Estados Reactivos
  const [muted, setMuted] = useState(() => localStorage.getItem('fh:sound:muted') === '1')
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('fh:sound:vol') ?? 1))
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [isMasterTab, setIsMasterTab] = useState(false)
  const [firstClickCaptured, setFirstClickCaptured] = useState(false) // Reset per session
  const [windowVisible, setWindowVisible] = useState(!document.hidden)
  const [unreadByCanal, setUnreadByCanal] = useState(() => Object.create(null))
  const [mentionByCanal, setMentionByCanal] = useState(() => Object.create(null))
  const [currentCanal, setCurrentCanalState] = useState(null)  // Canal actualmente visible
  const [suppressedCanals, setSuppressedCanals] = useState(() => new Set())
  const [notifPermission, setNotifPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  // ---- Helpers de Gestión Automática
  const checkSeenOnce = (key, ttl = 5000) => {
    if (!key) return false
    const now = Date.now()
    for (const [k, t] of dedupRef.current.entries()) if (now - t > ttl) dedupRef.current.delete(k)
    if (dedupRef.current.has(key)) return true
    dedupRef.current.set(key, now)
    return false
  }

  const markSelfSend = (canal_id) => {
    if (!canal_id) return
    const cid = Number(canal_id)
    recentSelfSendsRef.current.set(cid, Date.now())
    // Suprimir inmediatamente para evitar flash del badge
    setSuppressedCanals(prev => { if (prev.has(cid)) return prev; const n = new Set(prev); n.add(cid); return n })
  }
  const isLikelySelfEcho = (canal_id, windowMs = 5000) => {
    const ts = recentSelfSendsRef.current.get(Number(canal_id))
    return !!(ts && (Date.now() - ts) <= windowMs)
  }

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return 'unsupported'
    try {
      const res = await Notification.requestPermission()
      setNotifPermission(res)
      if (res === 'granted') {
        console.log('[🔔 NOTIF] Permission granted by user action.')
        initFCM().then(() => registerStoredPushToken()).catch(() => { })
      }
      return res
    } catch (err) {
      console.error('[🔔 NOTIF] Error requesting permission:', err)
      return 'error'
    }
  }

  const rememberNotifForCanal = (canal_id, notif_id) => {
    if (!canal_id || !notif_id) return
    const id = Number(canal_id)
    const set = notifByCanalRef.current.get(id) || new Set()
    set.add(Number(notif_id))
    notifByCanalRef.current.set(id, set)
  }

  const sweepUnreadChatForCanal = async (canal_id) => {
    try {
      const inbox = await notifApi.inbox({ buzon: 'chat', only_unread: true, sort: 'newest', limit: 30 }).catch(() => null)
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
    } catch { }
  }

  const flushChatNotifsForCanal = async (canal_id) => {
    const id = Number(canal_id)
    const set = notifByCanalRef.current.get(id)
    if (set && set.size) {
      const ids = Array.from(set)
      try { await Promise.allSettled(ids.map(nid => notifApi.read(nid, true))) } catch { }
      notifByCanalRef.current.set(id, new Set())
    }
    await sweepUnreadChatForCanal(id)
    qc.invalidateQueries({ queryKey: ['notif', 'counts'] })
    qc.invalidateQueries({ queryKey: ['notif', 'inbox'] })
    window.dispatchEvent(new Event('fh:notif:changed'))
    // Asegurar que el el local unread también se limpie
    setUnreadByCanal(prev => { if (!prev[id]) return prev; const n = { ...prev }; delete n[id]; return n })
    setMentionByCanal(prev => { if (!prev[id]) return prev; const n = { ...prev }; delete n[id]; return n })
  }

  // ---- LocalStorage Sync
  useEffect(() => {
    localStorage.setItem('fh:sound:vol', String(volume))
    localStorage.setItem('fh:sound:muted', muted ? '1' : '0')
  }, [volume, muted])

  // ---- Window Visibility
  useEffect(() => {
    const handleVisibilityChange = () => setWindowVisible(!document.hidden)
    const handleFocus = () => setWindowVisible(true)
    const handleBlur = () => setWindowVisible(false)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // ---- Audio Unlock (Captura invisible del primer click)
  useEffect(() => {
    if (audioUnlocked || firstClickCaptured) return
    const unlock = async () => {
      lastInteractionRef.current = Date.now()
      try {
        console.log('[🔊 AUDIO] Intentando desbloquear audio...')
        // 1. Reproducir buffer silencioso
        const a = new Audio(SOUND_MAP.default);
        a.volume = 0.001; // Almost silent but definitely not 0 for some browsers
        await a.play().catch(e => { console.warn('[🔊 AUDIO] Desbloqueo nativo falló:', e.message) });
        a.pause()

        // 2. Inicializar AudioContext si no existe
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        }

        // 3. Reanudar si está suspendido
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }

        audioContextStateRef.current = audioContextRef.current.state;
        setAudioUnlocked(true)
        setFirstClickCaptured(true)
        console.log('[🔊 AUDIO] ✅ Audio desbloqueado exitosamente. Estado:', audioContextStateRef.current);

        // Clean up all events
        ['click', 'keydown', 'pointerdown', 'touchstart'].forEach(ev => document.removeEventListener(ev, unlock));
      } catch (e) {
        console.error('[🔊 AUDIO] Error crítico al desbloquear:', e);
      }
    }

    // Captura el PRIMER click/interacción en CUALQUIER lugar de la app
    ['click', 'keydown', 'pointerdown', 'touchstart'].forEach(ev =>
      document.addEventListener(ev, unlock, { once: true, capture: true })
    );

    return () => ['click', 'keydown', 'pointerdown', 'touchstart'].forEach(ev =>
      document.removeEventListener(ev, unlock, { capture: true })
    )
  }, [audioUnlocked, firstClickCaptured])

  // ---- Helper Notificaciones Nativas
  async function showNotification(data, priority = 1) {
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'denied'
    if (permission !== 'granted') return false

    const d = data || {}
    const msgId = buildDedupKey(d)

    // Control Atómico: No repetir o bajar de nivel para el mismo mensaje
    const currentLevel = processedNotifsRef.current.get(msgId) || 0
    if (currentLevel >= priority && priority !== 0) return false
    processedNotifsRef.current.set(msgId, priority)

    console.log(`[🔔 NOTIF] 📦 FULL DATA DUMP for ${msgId}:`, d)

    const msgObj = d?.message ?? d?.mensaje ?? d?.msg ?? {}
    const userObj = msgObj?.user ?? d?.user ?? {}

    // 1. Autor Inteligente (Prioridad: Utils que ya saben navegar el objeto)
    let authorName = displayName(d) || displayName(msgObj) || displayName(userObj) || d?.author_name || msgObj?.author_name || d?.fcm_title || 'FedesHub'
    let textBody = d?.fcm_body ?? msgObj?.body_text ?? d?.body ?? d?.texto ?? d?.text ?? 'Nuevo mensaje'

    // Limpieza de Email: si el nombre es un mail y tenemos alternativas ricas dentro, las usamos
    if (authorName.includes('@')) {
      const alt = displayName(userObj) || displayName(msgObj) || displayName(d)
      if (alt && !alt.includes('@')) authorName = alt
    }

    if ((authorName === 'FedesHub' || authorName.includes('@')) && String(textBody).includes(': ')) {
      const parts = String(textBody).split(': ')
      if (parts.length > 1) {
        authorName = parts[0]
        textBody = parts.slice(1).join(': ')
      }
    }

    // 2. Avatar Robusto (Utils + Avatar Hunter 3.0 + Cache Buster por mensaje)
    const foundIcon = pickAvatar(d) || pickAvatar(msgObj) || recursiveFindAvatar(d)
    let icon = foundIcon || '/favicon.ico'
    if (icon && !icon.startsWith('http')) icon = window.location.origin + icon

    // Usamos el ID del mensaje como buster para que sea consistente pero fresco
    const mid = d?.mensaje_id ?? d?.message?.id ?? d?.mensaje?.id ?? d?.msg?.id ?? d?.message_id ?? d?.id
    const busterId = mid || Date.now()
    icon += icon.includes('?') ? `&v=${busterId}` : `?v=${busterId}`

    const canalId = d?.canal_id || d?.chat_canal_id || msgObj?.canal_id

    // ESTRATEGIA ATÓMICA: 
    // Usamos el mismo TAG para Lv1 y Lv2. Esto hace que el Lv2 REEMPLACE al Lv1 
    // en lugar de crear un segundo banner. Evita la molestia del "doble banner".
    const tag = `chat-${canalId || 'global'}`

    console.log(`[🔔 NOTIF] 🚀 [Lv${priority}] Nuclear Hunter:`, { title: authorName, tag, icon })
    if (foundIcon) console.log('[🔔 NOTIF] 🎯 Avatar Hunter found target:', foundIcon)

    const isUpdate = currentLevel >= 1
    const options = {
      body: String(textBody).slice(0, 150),
      icon,
      badge: window.location.origin + '/favicon.ico',
      tag,
      renotify: true,
      silent: true, // 🔊 SIEMPRE SILENCIO: Evitamos el "doble pitido" (Browser + Sistema) ya que disparamos playSoundFor manualmente.
      timestamp: Date.now(),
      data: { canalId, url: `/chat/${canalId}` }
    }

    // DISPARO DE AUDIO FIABLE
    // Solo hacemos sonido si es el PRIMER aviso (Lv1) para evitar el doble pitido.
    // Además, forzamos que sea el Master Tab quien pita.
    if (!isUpdate && !muted && isMasterTabRef.current) {
      playSoundFor({ ...d, chat_canal_id: canalId })
    }

    try {
      const hasSW = 'serviceWorker' in navigator
      const hasController = !!navigator.serviceWorker?.controller
      console.log(`[🔔 NOTIF] 🛠 Status: sw=${hasSW}, controller=${hasController}, priority=${priority}`)

      // 1. Intentar por SW (Mejor para sonido y background)
      if (hasSW) {
        navigator.serviceWorker.ready.then(reg => {
          // Si hay controller, preferimos postMessage para que el SW gestione el tag/close
          if (hasController) {
            navigator.serviceWorker.controller.postMessage({
              type: 'fh:show_notification',
              title: authorName,
              options
            })
          } else {
            // Si no hay controller (F5 reciente), disparamos por el registro directo
            reg.showNotification(authorName, options)
          }
        }).catch(err => {
          console.warn('[🔔 NOTIF] SW Ready failed:', err)
          new Notification(authorName, options)
        })
      } else {
        // 2. Fallback Nativo total
        new Notification(authorName, options)
      }

      // 3. Respaldo extra para Nivel 1 (para asegurar el BIP inicial)
      if (priority === 1 && !hasController) {
        console.log('[🔔 NOTIF] ⚠️ Extra backup for Level 1.')
        new Notification(authorName, options)
      }

      return true
    } catch (e) {
      console.error('[🔔 NOTIF] ❌ Critical Error:', e)
      return false
    }
  }

  // ---- Audio Playback
  async function playSoundFor(data) {
    if (muted) return
    if (!isMasterTabRef.current) {
      console.log('[🔊 AUDIO] Esta pestaña no es master, audio delegado')
      return
    }
    const buzon = resolveBuzonFromData(data)
    const cid = data?.canal_id ?? data?.chat_canal_id
    const key = cid ? `${buzon}:${cid}` : buzon
    const now = Date.now()
    const last = lastPlayByKeyRef.current.get(key) || 0

    // throttle de 2.5s: SSE y FCM suelen llegar con < 1s de diferencia.
    if (now - last < 2500) {
      console.log(`[🔊 AUDIO] 🔇 SKIP (Throttle ${now - last}ms < 2500ms) for key: ${key}`)
      return
    }

    console.log(`[🔊 AUDIO] 🔊 PLAY AUDIO for buzon: ${buzon}, key: ${key}`)
    lastPlayByKeyRef.current.set(key, now)

    const src = SOUND_MAP[buzon] || SOUND_MAP.default

    if (audioUnlocked) {
      try {
        const a = new Audio(src); a.volume = volume
        await a.play()
        return
      } catch { }
    }

    if (audioContextRef.current) {
      try {
        const audioCtx = audioContextRef.current
        if (audioCtx.state === 'suspended') await audioCtx.resume()
        const res = await fetch(src)
        const buf = await audioCtx.decodeAudioData(await res.arrayBuffer())
        const source = audioCtx.createBufferSource()
        const gainNode = audioCtx.createGain()
        gainNode.gain.value = volume
        source.buffer = buf
        source.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        source.start(0)
        return
      } catch { }
    }
    // Si el audio web falla, mandamos un Lv0    // NO lanzamos banner Lv0 aquí si es CHAT, para evitar ráfagas prohibidas en macOS.
    // Solo permitimos Lv0 si es algo genérico (tareas, etc.)
    if (!data?.chat_canal_id && !data?.canal_id) {
      console.log('[🔊 AUDIO] Fallback to Lv0 Banner for generic notification sound.')
      showNotification(data, 0)
    }
  }

  // ---- Main Handler
  async function onIncoming(anyData) {
    const data = anyData?.data ?? anyData ?? {}
    const type = String(data?.type || data?.Tipo || data?.evento || data?.tipo || '').toLowerCase()
    const myId = Number(user?.id || 0)

    const dKey = buildDedupKey(anyData)
    const isRich = !!data.fcm_title
    const isDuplicate = checkSeenOnce(dKey)

    // Si es un duplicado y NO es una notificación rica (FCM), ignoramos por completo
    if (isDuplicate && !isRich) return

    if (type !== 'ping') console.log('[Realtime] incoming:', type, 'isDuplicate:', isDuplicate, data)

    // 1. ACTUALIZACIONES DE ESTADO Y CACHÉ (Solo una vez por ID de mensaje)
    if (!isDuplicate) {
      // Invalidaciones de Query
      if (type.startsWith('chat.')) {
        const cid = data?.canal_id ? Number(data.canal_id) : null
        if (/chat\.message\.(created|edited|deleted|pin)/.test(type) && cid) {
          qc.invalidateQueries({ queryKey: ['chat', 'msgs', cid] })
          qc.invalidateQueries({ queryKey: ['chat', 'pins', cid] })
        }
        if (/chat\.channel\./.test(type) && cid) {
          qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
          qc.invalidateQueries({ queryKey: ['chat', 'members', cid] })
        }
      }

      if (type === 'chat.channel.read') {
        const cid = Number(data?.canal_id || 0)
        if (cid && Number(data?.user_id || 0) === myId) {
          setUnreadByCanal(prev => { if (!prev[cid]) return prev; const n = { ...prev }; delete n[cid]; return n })
          setMentionByCanal(prev => { if (!prev[cid]) return prev; const n = { ...prev }; delete n[cid]; return n })
          flushChatNotifsForCanal(cid).catch(() => { })
        }
      }

      const looksLikeChat = type === 'chat.message.created' || (type === 'chat_mensaje' && !!data?.chat_canal_id)
      if (looksLikeChat) {
        const cid = Number(data?.canal_id ?? data?.message?.canal_id ?? data?.mensaje?.canal_id ?? data?.chat_canal_id ?? 0)
        const aid = Number(data?.user_id ?? data?.message?.user_id ?? data?.mensaje?.user_id ?? data?.author_id ?? 0)

        // Si el mensaje es propio (desde cualquier sesión), limpiar estado y salir
        if (aid === myId && cid) {
          setUnreadByCanal(prev => { if (!prev[cid]) return prev; const n = { ...prev }; delete n[cid]; return n })
          setMentionByCanal(prev => { if (!prev[cid]) return prev; const n = { ...prev }; delete n[cid]; return n })
          qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
          window.dispatchEvent(new CustomEvent('fh:chat:channel:cleared', { detail: { canal_id: cid } }))
          setSuppressedCanals(prev => { if (prev.has(cid)) return prev; const next = new Set(prev); next.add(cid); return next })
          return
        }

        if (cid && myId && (aid || !isLikelySelfEcho(cid))) {
          if (currentCanalRef.current !== cid) {
            const nId = Number(data?.notificacion_id || 0)
            if (nId) rememberNotifForCanal(cid, nId)

            const mentions = extractMentionsFromPayload(data)
            setUnreadByCanal(prev => ({ ...prev, [cid]: (prev[cid] || 0) + 1 }))
            if (mentions.has(myId)) setMentionByCanal(prev => ({ ...prev, [cid]: (prev[cid] || 0) + 1 }))

            setSuppressedCanals(prev => { if (!prev.has(cid)) return prev; const next = new Set(prev); next.delete(cid); return next })
          }
        }
      }

      qc.invalidateQueries({ queryKey: ['notif', 'counts'] })
      qc.invalidateQueries({ queryKey: ['notif', 'inbox'] })
    }

    // 2. NOTIFICACIONES (BANNERS)
    // Esto sí puede ejecutarse dos veces si el segundo es "isRich" (FCM), para hacer el upgrade del banner.
    const looksLikeChat = type === 'chat.message.created' || (type === 'chat_mensaje' && !!data?.chat_canal_id)
    if (looksLikeChat) {
      const cid = Number(data?.canal_id ?? data?.message?.canal_id ?? data?.mensaje?.canal_id ?? data?.chat_canal_id ?? 0)
      const aid = Number(data?.user_id ?? data?.message?.user_id ?? data?.mensaje?.user_id ?? data?.author_id ?? 0)

      if (aid !== myId && cid && currentCanalRef.current !== cid) {
        const bKey = `banner:${cid}`
        if (isRich) {
          if (pendingBannersRef.current.has(bKey)) {
            clearTimeout(pendingBannersRef.current.get(bKey))
            pendingBannersRef.current.delete(bKey)
          }
          showNotification(data, 2)
        } else {
          if (pendingBannersRef.current.has(bKey)) clearTimeout(pendingBannersRef.current.get(bKey))
          const timer = setTimeout(() => {
            showNotification(data, 1)
            pendingBannersRef.current.delete(bKey)
          }, 450)
          pendingBannersRef.current.set(bKey, timer)
        }
      }
    }

    const looksLikeTarea = /tarea/.test(type) || !!data?.tarea_id
    if (looksLikeTarea && !looksLikeChat) {
      showNotification({
        ...data,
        author_name: data.author_name || data.titulo || 'FedesHub',
        fcm_body: data.mensaje || data.titulo || 'Nueva notificación de tarea'
      }, 1)
    }
  }

  // ---- Effects de Inicialización
  useEffect(() => {
    if (!user || !booted) return
    let es = new EventSource('/api/realtime/stream', { withCredentials: true })
    const forward = (ev) => {
      const type = ev?.type || 'message'
      let payload = {}
      try { payload = JSON.parse(ev?.data || '{}') } catch { }
      if (!payload.type) payload.type = type
      window.dispatchEvent(new CustomEvent('fh:push', { detail: payload }))
    }
    const TYPES = ['message', 'ping', 'chat.typing', 'chat.message.created', 'chat.message.edited', 'chat.message.deleted', 'chat.message.pin', 'chat.channel.updated', 'chat.channel.read']
    TYPES.forEach(t => es.addEventListener(t, forward))
    return () => { try { es.close() } catch { } }
  }, [user, booted])

  useEffect(() => {
    const handler = (ev) => onIncoming(ev?.detail || {})
    const onChatSent = (ev) => { if (ev.detail?.canal_id) markSelfSend(ev.detail.canal_id) }
    window.addEventListener('fh:push', handler)
    window.addEventListener('fh:chat:sent', onChatSent)

    // 📡 Listener para mensajes del Service Worker (FCM en primer plano)
    const onSwMessage = (e) => {
      if (e.data && e.data.type === 'fh:push') {
        onIncoming(e.data.data || {})
      }
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage)
    }

    return () => {
      window.removeEventListener('fh:push', handler)
      window.removeEventListener('fh:chat:sent', onChatSent)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage)
      }
    }
  }, [user?.id])  // Removido onIncoming de dependencias - la función tiene acceso al closure

  useEffect(() => {
    if (booted && user) {
      initFCM().then(() => registerStoredPushToken()).catch(() => { })
    }
  }, [booted, user])

  useEffect(() => {
    const hasAny = Object.values(unreadByCanal || {}).some(v => (v | 0) > 0)
    window.dispatchEvent(new CustomEvent('fh:chat:hasUnread', { detail: { hasUnread: hasAny } }))
  }, [unreadByCanal])

  // ---- Master Tab Coordination via BroadcastChannel
  useEffect(() => {
    if (!user || !booted) return

    const bc = new BroadcastChannel('fh:audio:master')
    broadcastChannelRef.current = bc

    const claimMaster = () => {
      isMasterTabRef.current = true
      setIsMasterTab(true)
      bc.postMessage({ type: 'claim_master', tabId })
      console.log(`[🔊 AUDIO] Esta pestaña (${tabId}) es ahora MASTER de audio`)
    }

    // Escuchar mensajes
    bc.onmessage = (e) => {
      const msg = e.data || {}
      if (msg.type === 'ping') {
        bc.postMessage({ type: 'pong', tabId, isMaster: isMasterTabRef.current })
      } else if (msg.type === 'claim_master') {
        if (msg.tabId < tabId) {
          isMasterTabRef.current = false
          setIsMasterTab(false)
          console.log(`[🔊 AUDIO] Pestaña (${tabId}) cedió el trono a (${msg.tabId})`)
        } else if (isMasterTabRef.current) {
          bc.postMessage({ type: 'claim_master', tabId })
        }
      } else if (msg.type === 'pong' && msg.isMaster) {
        if (msg.tabId < tabId) {
          isMasterTabRef.current = false
          setIsMasterTab(false)
        }
      }
    }

    bc.postMessage({ type: 'ping', tabId })

    const masterTimer = setTimeout(() => {
      if (!isMasterTabRef.current) {
        claimMaster()
      }
    }, 600)

    return () => {
      clearTimeout(masterTimer)
      bc.close()
    }
  }, [user, booted, tabId])

  // ---- AudioContext Keep-Alive
  useEffect(() => {
    if (!audioContextRef.current || !isMasterTab) return

    const keepAlive = setInterval(async () => {
      if (audioContextRef.current?.state === 'suspended') {
        console.log('[🔊 AUDIO] Detectado AudioContext suspendido, intentando reanudar...')
        try {
          await audioContextRef.current.resume()
          audioContextStateRef.current = audioContextRef.current.state
          console.log('[🔊 AUDIO] AudioContext reanudado exitosamente')
        } catch (err) {
          console.error('[🔊 AUDIO] Error al reanudar AudioContext:', err)
        }
      }
    }, 3000)

    return () => clearInterval(keepAlive)
  }, [isMasterTab])

  const value = useMemo(() => ({
    muted, setMuted, volume, setVolume, unreadByCanal, mentionByCanal, currentCanal, suppressedCanals,
    notifPermission, requestNotificationPermission, isMasterTab, audioUnlocked,
    clearUnreadFor: (cid) => {
      const id = Number(cid)
      setUnreadByCanal(p => { if (!p[id]) return p; const n = { ...p }; delete n[id]; return n })
      setMentionByCanal(p => { if (!p[id]) return p; const n = { ...p }; delete n[id]; return n })
      setSuppressedCanals(prev => { if (prev.has(id)) return prev; const n = new Set(prev); n.add(id); return n })
      flushChatNotifsForCanal(id).catch(() => { })
      window.dispatchEvent(new CustomEvent('fh:chat:channel:cleared', { detail: { canal_id: id } }))
    },
    setCurrentCanal: (id) => {
      currentCanalRef.current = id
      setCurrentCanalState(id)
    },
    markSelfSend,
    flushChatNotifsForCanal,
    getHealthReport: () => ({
      permission: notifPermission,
      audioUnlocked,
      audioContextState: audioContextStateRef.current,
      lastInteraction: lastInteractionRef.current ? new Date(lastInteractionRef.current).toISOString() : 'none',
      isWindowVisible: document.visibilityState === 'visible',
      swReady: !!('serviceWorker' in navigator),
      hasController: !!navigator.serviceWorker?.controller,
      isMasterTab: isMasterTabRef.current
    }),
    playTest: (delay = 0) => {
      const run = () => {
        onIncoming({
          type: 'chat_mensaje',
          chat_canal_id: 1,
          author_name: 'Test de Diagnóstico',
          mensaje: { body_text: 'Esto es una notificación de prueba para verificar sonidos y banners.', id: Date.now() },
          fcm_title: 'Prueba de Sistema',
          fcm_body: 'Si ves esto, las notificaciones funcionan correctamente.',
          author_avatar: null
        })
      }
      if (delay > 0) {
        console.log(`[🔔 NOTIF] Test scheduled in ${delay}ms...`)
        setTimeout(run, delay)
      } else {
        run()
      }
    },
    unlockAudioManually: async () => {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      const a = new Audio(SOUND_MAP.default);
      a.volume = volume;
      await a.play();
      setAudioUnlocked(true)
      audioContextStateRef.current = audioContextRef.current?.state || 'ready';
    },
    clearAllChatUnreads: () => {
      setUnreadByCanal({})
      setMentionByCanal({})
      setSuppressedCanals(new Set())
      window.dispatchEvent(new CustomEvent('fh:chat:hasUnread', { detail: { hasUnread: false } }))
    }
  }), [muted, volume, unreadByCanal, mentionByCanal, currentCanal, suppressedCanals, notifPermission, audioUnlocked])

  return <RealtimeCtx.Provider value={value}>{children}</RealtimeCtx.Provider>
}
