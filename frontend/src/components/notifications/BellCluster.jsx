import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FiMessageSquare, FiCheckSquare, FiCalendar, FiExternalLink, FiEye, FiEyeOff } from 'react-icons/fi'
import { notifApi } from '../../api/notificaciones'
import ChatBellPanel from './ChatBellPanel.jsx'
import { useRealtime } from '../../realtime/RealtimeProvider'
import './BellCluster.scss'

const ICONS = {
  chat: <FiMessageSquare />,
  tareas: <FiCheckSquare />,
  calendario: <FiCalendar />
}

function useCounts() {
  return useQuery({
    queryKey: ['notif', 'counts'],
    queryFn: notifApi.counts,
    refetchInterval: 30000
  })
}

function useInbox(buzon, params) {
  const p = { ...params }
  if (buzon) p.buzon = buzon
  return useQuery({
    queryKey: ['notif', 'inbox', buzon || 'todo', p],
    queryFn: () => notifApi.inbox(p),
    enabled: !!buzon || buzon === undefined
  })
}

export default function BellCluster({ onAnyOpen }) {
  const [openKey, setOpenKey] = useState(null)
  const { data: counts } = useCounts()
  const qc = useQueryClient()
  const ref = useRef(null)

  // estado LOCAL de chat (para alinear icono aunque el contador del backend esté desfasado)
  const { unreadByCanal, mentionByCanal } = useRealtime()
  const localChatUnreadCount = useMemo(() =>
    Object.values(unreadByCanal || {}).reduce((a, b) => a + (b || 0), 0)
    , [unreadByCanal])
  const localChatHasMention = useMemo(() =>
    Object.values(mentionByCanal || {}).some(v => (v | 0) > 0)
    , [mentionByCanal])

  useEffect(() => { if (openKey) onAnyOpen?.(openKey) }, [openKey, onAnyOpen])

  useEffect(() => {
    const onDoc = (e) => { if (!ref.current) return; if (!ref.current.contains(e.target)) setOpenKey(null) }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => {
    const onInvalidate = () => {
      qc.invalidateQueries({ queryKey: ['notif', 'counts'] })
      qc.invalidateQueries({ queryKey: ['notif', 'inbox'] })
    }
    window.addEventListener('fh:push', onInvalidate)
    window.addEventListener('fh:notif:changed', onInvalidate)
    return () => {
      window.removeEventListener('fh:push', onInvalidate)
      window.removeEventListener('fh:notif:changed', onInvalidate)
    }
  }, [qc])

  const items = useMemo(() => ([
    {
      key: 'chat',
      label: 'Chat',
      count: counts?.chat ?? 0,
      dot: (counts?.chat ?? 0) === 0 && localChatUnreadCount > 0,    // 👈 si el backend dice 0 pero local hay unread, mostramos dot
      mention: localChatHasMention
    },
    { key: 'tareas', label: 'Tareas', count: counts?.tareas ?? 0 },
    { key: 'calendario', label: 'Calendario', count: counts?.calendario ?? 0 },
  ]), [counts, localChatUnreadCount, localChatHasMention])

  return (
    <div className="fhBellCluster" ref={ref}>
      {items.map(it => (
        <BellButton
          key={it.key}
          buzon={it.key}
          label={it.label}
          count={it.count}
          dot={it.dot}
          active={openKey === it.key}
          onToggle={() => setOpenKey(k => k === it.key ? null : it.key)}
          closeAll={() => setOpenKey(null)}
        />
      ))}
    </div>
  )
}

function BellButton({ buzon, label, count, dot = false, active, onToggle, closeAll }) {
  const useGenericInbox = buzon !== 'chat'
  const { data, isLoading, isError } = useGenericInbox
    ? useInbox(buzon, { limit: 15, only_unread: true, sort: 'newest' })
    : { data: null, isLoading: false, isError: false }

  const list = data?.rows || []
  const navigate = useNavigate()
  const qc = useQueryClient()
  const seenOnce = useRef(false)

  useEffect(() => {
    if (!active || seenOnce.current || !list.length) return
    seenOnce.current = true
    list.slice(0, 10).forEach(r => {
      const id = r?.notificacion?.id
      if (id) notifApi.seen(id).catch(() => { })
    })
  }, [active, list])

  return (
    <div className={`bell ${active ? 'open' : ''}`}>
      <button className="iconBtn" onClick={onToggle} aria-label={label} title={label}>
        {ICONS[buzon]}
        {!!count && <span className="badge">{count}</span>}
        {dot && !count && <span className="dot" aria-hidden />} {/* 👈 puntito rojo si no hay número pero sí unread local */}
      </button>

      {active && (
        <div className="panel">
          <header className="panelHead">
            <span className="lbl">{ICONS[buzon]} {label}</span>
            {buzon !== 'chat' && (
              <button
                className="seeAll"
                onClick={() => { closeAll(); navigate(`/notificaciones/${buzon}`) }}
                title="Ver todas"
              >
                <FiExternalLink /> Ver todas
              </button>
            )}
          </header>

          {buzon === 'chat' ? (
            <ChatBellPanel closeAll={closeAll} />
          ) : (
            <div className="list">
              {isLoading && <div className="fh-skel">Cargando…</div>}
              {isError && <div className="fh-err">Error cargando.</div>}
              {!isLoading && !isError && !list.length && <div className="fh-empty">Sin notificaciones.</div>}
              {list.map(row => <NotifItem key={row.id} row={row} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotifItem({ row }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const n = row.notificacion || {}
  const title =
    n.titulo || n?.tarea?.titulo || n?.evento?.titulo ||
    (n?.chatCanal ? `Mención en ${n.chatCanal.nombre}` : n?.tipo?.nombre || 'Notificación')

  const toggleRead = async () => {
    await notifApi.read(n.id, !row.read_at)
    qc.invalidateQueries({ queryKey: ['notif', 'counts'] })
    qc.invalidateQueries({ queryKey: ['notif', 'inbox'] })
    window.dispatchEvent(new Event('fh:notif:changed'))
  }

  // Parsear el link_url para detectar si es una tarea
  const handleOpenLink = async (e) => {
    e.preventDefault()
    const url = n.link_url || ''

    // Marcar como leída la notificación
    if (!row.read_at && n.id) {
      try {
        await notifApi.read(n.id, true)
        qc.invalidateQueries({ queryKey: ['notif', 'counts'] })
        qc.invalidateQueries({ queryKey: ['notif', 'inbox'] })
        window.dispatchEvent(new Event('fh:notif:changed'))
      } catch (err) {
        console.warn('Error marcando notificación como leída:', err)
      }
    }

    // Detectar link de tarea: /tareas/123 o similar
    const tareaMatch = url.match(/\/tareas\/(\d+)/)
    if (tareaMatch) {
      const tareaId = tareaMatch[1]
      // Navegar a /tareas con query param para abrir el modal
      navigate(`/tareas?open=${tareaId}`)
      return
    }

    // Detectar link de chat: /chat/c/123
    const chatMatch = url.match(/\/chat\/c\/(\d+)/)
    if (chatMatch) {
      navigate(url)
      return
    }

    // Para otros links, usar navegación normal o abrir en nueva pestaña si es externo
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else if (url.startsWith('/')) {
      navigate(url)
    }
  }

  return (
    <div className={`item ${row.read_at ? 'read' : ''}`}>
      <div className="main">
        <div className="ttl">{title}</div>
        {n.mensaje && <div className="msg">{n.mensaje}</div>}
      </div>
      <div className="act">
        {n.link_url && (
          <button className="lnk" onClick={handleOpenLink} title="Abrir">
            Abrir
          </button>
        )}
        <button className="muted eyeNotif" onClick={toggleRead} title={row.read_at ? 'Marcar no leído' : 'Marcar leído'}>
          {row.read_at ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
    </div>
  )
}