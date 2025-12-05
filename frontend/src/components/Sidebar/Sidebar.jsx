import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import UnreadDmBubbles from './UnreadDmBubbles.jsx'
import './Sidebar.scss'

const APPS = [
  { code: 'home', name: 'Inicio', to: '/' },
  { code: 'feders', name: 'Feders', to: '/feders' },
  { code: 'asistencia', name: 'Asistencia', to: '/asistencia' },
  { code: 'ausencia', name: 'Ausencias', to: '/ausencias' },
  { code: 'calendario', name: 'Calendario', to: '/calendario' },
  { code: 'tareas', name: 'Tareas', to: '/tareas' },
  { code: 'chat', name: 'Chat', to: '/chat' },
  { code: 'clientes', name: 'Clientes', to: '/clientes' },
]

export default function Sidebar() {
  const { hasPerm } = useAuthCtx()
  const [chatHasUnread, setChatHasUnread] = useState(false)

  useEffect(() => {
    const handler = (ev) => setChatHasUnread(!!ev?.detail?.hasUnread)
    window.addEventListener('fh:chat:hasUnread', handler)
    return () => window.removeEventListener('fh:chat:hasUnread', handler)
  }, [])

  const allowed = APPS.filter(a => !a.need || hasPerm(a.need.modulo, a.need.accion))

  // --- mobile collapse ---
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? matchMedia('(max-width: 980px)').matches : false)
  const [open, setOpen] = useState(() => !((typeof window !== 'undefined') && matchMedia('(max-width: 980px)').matches))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const m = matchMedia('(max-width: 980px)')
    const onChange = () => { setIsMobile(m.matches); if (!m.matches) setOpen(true) }
    onChange()
    m.addEventListener?.('change', onChange)
    return () => m.removeEventListener?.('change', onChange)
  }, [])

  return (
    <aside className={'fhSidebar' + (isMobile ? ' mobile' : '')}>
      {isMobile && (
        <button
          className="sbToggle"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls="sbMenu"
        >
          <span>Menú</span>
          <span className={'chev' + (open ? ' up' : '')}>▾</span>
        </button>
      )}

      <div id="sbMenu" className={'sbGroup' + (isMobile ? (open ? ' open' : ' closed') : '')}>
        {allowed.map(app => {
          const isChat = app.code === 'chat'
          const extraCls = isChat && chatHasUnread ? ' with-badge' : ''
          return (
            <NavLink
              key={app.code}
              to={app.to}
              end={app.to === '/'}
              className={({ isActive }) => 'sbItem' + (isActive ? ' active' : '') + extraCls}
            >
              {isChat && <i className="dot" />}
              <span>{app.name}</span>
              {isChat && chatHasUnread && <span className="badge-dot" aria-label="no leídos" />}
            </NavLink>
          )
        })}
      </div>

      {/* Burbujas DM */}
      {!isMobile && <UnreadDmBubbles limit={8} />}
      {isMobile && open && <UnreadDmBubbles limit={8} />}
    </aside>
  )
}
