import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import {
  FiBell,
  FiMessageSquare,
  FiCheckSquare,
  FiCalendar,
  FiExternalLink,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiCheckCircle
} from 'react-icons/fi'
import { notifApi } from '../../api/notificaciones'
import ChatBellPanel from './ChatBellPanel.jsx'
import { useRealtime } from '../../realtime/RealtimeProvider'
import GlobalLoader from '../loader/GlobalLoader.jsx'
import './BellCluster.scss'

// Helper para limpiar HTML de descripciones de tareas
function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

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

function useInbox(buzon, params = {}, options = {}) {
  const p = useMemo(() => {
    const obj = { ...params }
    if (buzon) obj.buzon = buzon
    return obj
  }, [buzon, params])

  return useQuery({
    queryKey: ['notif', 'inbox', buzon || 'todo', p],
    queryFn: () => notifApi.inbox(p),
    enabled: !!buzon || buzon === undefined,
    ...options
  })
}

export default function BellCluster({ onAnyOpen }) {
  const [openKey, setOpenKey] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { data: counts } = useCounts()
  const qc = useQueryClient()
  const ref = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // estado LOCAL de chat (para alinear icono aunque el contador del backend esté desfasado)
  const { unreadByCanal, mentionByCanal, suppressedCanals } = useRealtime()
  const localChatUnreadCount = useMemo(() =>
    Object.entries(unreadByCanal || {}).reduce((a, [cid, count]) => {
      if (suppressedCanals.has(Number(cid))) return a
      return a + (count || 0)
    }, 0)
    , [unreadByCanal, suppressedCanals])
  const localChatHasMention = useMemo(() =>
    Object.entries(mentionByCanal || {}).some(([cid, v]) => {
      if (suppressedCanals.has(Number(cid))) return false
      return (v | 0) > 0
    })
    , [mentionByCanal, suppressedCanals])

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

  // Reconciliación del conteo de chat:
  // Si el backend dice que hay 1 y nosotros acabamos de limpiar uno (suppressed), prefiero confiar en el local 0.
  const finalChatCount = useMemo(() => {
    const backendCount = counts?.chat ?? 0
    // Si el backend dice 0, usamos local.
    if (backendCount === 0) return localChatUnreadCount
    // Si el local es 0 y tenemos canales suprimidos, es muy probable que el backend esté desfasado (ghost badge).
    if (localChatUnreadCount === 0 && suppressedCanals.size > 0) {
      // Si el backend dice 1 o 2, y nosotros acabamos de limpiar canales, es probable que ese 1 o 2 sea lo que acabamos de limpiar.
      // En este caso, preferimos mostrar 0 para evitar la sensación de "no se borra".
      if (backendCount <= suppressedCanals.size) return 0
    }
    // En otros casos, el backend suele ser más completo (mensajes antiguos).
    return Math.max(backendCount, localChatUnreadCount)
  }, [counts?.chat, localChatUnreadCount, suppressedCanals.size])

  const items = useMemo(() => ([
    {
      key: 'chat',
      label: 'Chat',
      count: finalChatCount,
      dot: finalChatCount === 0 && localChatUnreadCount > 0, // Inconsistencia, mostrar punto? (raro)
      mention: localChatHasMention
    },
    { key: 'tareas', label: 'Tareas', count: counts?.tareas ?? 0 },
    { key: 'calendario', label: 'Calendario', count: counts?.calendario ?? 0 },
  ]), [counts, finalChatCount, localChatUnreadCount, localChatHasMention])

  const totalCount = useMemo(() => items.reduce((a, b) => a + (b.count || 0), 0), [items])

  if (isMobile) {
    return (
      <div className="fhBellCluster grouped" ref={ref}>
        <div className={`bell ${openKey ? 'open' : ''}`}>
          <button className="iconBtn mainBell" onClick={(e) => { e.stopPropagation(); setOpenKey(k => k ? null : 'all') }} aria-label="Notificaciones">
            <FiBell />
            {!!totalCount && <span className="badge">{totalCount}</span>}
          </button>

          {openKey && (
            <div className="panel mobilePanel">
              <div className="tabs">
                {items.map(it => (
                  <button
                    key={it.key}
                    className={`tab ${openKey === it.key || (openKey === 'all' && it.key === 'chat') ? 'active' : ''}`}
                    onClick={() => setOpenKey(it.key)}
                  >
                    {ICONS[it.key]}
                    {!!it.count && <span className="tabBadge">{it.count}</span>}
                  </button>
                ))}
              </div>
              <div className="tabContent">
                <BellButtonContent
                  buzon={openKey === 'all' ? 'chat' : openKey}
                  label={items.find(i => i.key === (openKey === 'all' ? 'chat' : openKey))?.label}
                  closeAll={() => setOpenKey(null)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

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
  return (
    <div className={`bell ${active ? 'open' : ''}`}>
      <button className="iconBtn" onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label={label} title={label}>
        {ICONS[buzon]}
        {!!count && <span className="badge">{count}</span>}
        {dot && !count && <span className="dot" aria-hidden />}
      </button>

      {active && (
        <div className="panel">
          <BellButtonContent buzon={buzon} label={label} closeAll={closeAll} />
        </div>
      )}
    </div>
  )
}

function BellButtonContent({ buzon, label, closeAll }) {
  const navigate = useNavigate()
  const seenOnce = useRef(false)
  const isChat = buzon === 'chat'
  const qc = useQueryClient()

  const { data, isLoading, isError } = useInbox(
    buzon,
    { limit: 15, only_unread: true, sort: 'newest' },
    { enabled: !isChat && !!buzon }
  )

  const list = useMemo(() => (Array.isArray(data?.rows) ? data.rows : []), [data])

  useEffect(() => {
    if (seenOnce.current || !list.length) return
    seenOnce.current = true
    list.slice(0, 10).forEach(r => {
      const id = r?.notificacion?.id
      if (id) notifApi.seen(id).catch(() => { })
    })
  }, [list])

  const { clearAllChatUnreads } = useRealtime()

  const handleClearAll = async () => {
    try {
      await notifApi.clearAll(buzon, 'read')
      qc.invalidateQueries({ queryKey: ['notif'] })
      window.dispatchEvent(new Event('fh:notif:changed'))
      // Si es chat, también invalidar chats y limpiar burbujas locales
      if (isChat) {
        qc.invalidateQueries({ queryKey: ['chat', 'canales'] })
        clearAllChatUnreads?.()
      }
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err)
    }
  }

  return (
    <>
      <header className="panelHead">
        <span className="lbl">{ICONS[buzon]} {label}</span>
        <div className="headActions">
          <button
            className="clearAllBtn"
            onClick={handleClearAll}
            title="Quitar todas de la vista"
          >
            <FiTrash2 /> Limpiar
          </button>
          <button
            className="seeAll"
            onClick={() => { closeAll(); navigate(isChat ? '/chat/listado' : `/notificaciones/${buzon}`) }}
            title={isChat ? 'Ver chat' : 'Ver todas'}
          >
            <FiExternalLink /> {isChat ? 'Ver chat' : 'Ver todas'}
          </button>
        </div>
      </header>

      {buzon === 'chat' ? (
        <ChatBellPanel closeAll={closeAll} />
      ) : (
        <div className="list" style={{ position: 'relative', minHeight: 100 }}>
          {isLoading && <GlobalLoader size={60} />}
          {isError && <div className="fh-err">Error cargando.</div>}
          {!isLoading && !isError && !list.length && (
            <div className="fh-empty-state">
              <div className="icon"><FiBell /></div>
              <p>Sin notificaciones</p>
              <span>Te avisaremos cuando haya novedades importantes</span>
            </div>
          )}
          {list.map(row => <NotifItem key={row.id} row={row} closeAll={closeAll} />)}
        </div>
      )}
    </>
  )
}

function NotifItem({ row, closeAll }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const n = row.notificacion || {}
  console.log('-------------------->', n)
  const title =
    n.titulo || n?.tarea?.titulo || n?.evento?.titulo ||
    (n?.chatCanal ? `Mención en ${n.chatCanal.nombre} ` : n?.tipo?.nombre || 'Notificación')

  const toggleRead = async () => {
    await notifApi.read(n.id, !row.read_at)
    qc.invalidateQueries({ queryKey: ['notif', 'counts'] })
    qc.invalidateQueries({ queryKey: ['notif', 'inbox'] })
    window.dispatchEvent(new Event('fh:notif:changed'))
  }

  // Parsear el link_url para detectar si es una tarea
  const handleOpenLink = async (e) => {
    e.preventDefault()
    closeAll?.()
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
    <div className={`item ${row.read_at ? 'read' : ''} `}>
      <div className="main">
        <div className="ttl">{title}</div>
        {n.mensaje && <div className="msg">{stripHtml(n.mensaje)}</div>}
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