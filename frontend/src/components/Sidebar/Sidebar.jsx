import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import { useUploadContext } from '../../context/UploadProvider.jsx'
import { useToast } from '../toast/ToastProvider.jsx'
import { FaHourglassHalf } from 'react-icons/fa'
import UnreadDmBubbles from './UnreadDmBubbles.jsx'
import './Sidebar.scss'

const IS_DEV = import.meta.env.DEV

const APPS = [
  { code: 'home', name: 'Inicio', to: '/' },
  { code: 'feders', name: 'Feders', to: '/feders' },
  { code: 'asistencia', name: 'Asistencia', to: '/asistencia' },
  { code: 'ausencia', name: 'Ausencias', to: '/ausencias', inDev: true },
  { code: 'calendario', name: 'Calendario', to: '/calendario', inDev: true },
  { code: 'tareas', name: 'Tareas', to: '/tareas' },
  { code: 'chat', name: 'Chat', to: '/chat' },
  { code: 'clientes', name: 'Clientes', to: '/clientes', directivosOnly: true },
]

export default function Sidebar() {
  console.log('-------------------Entorno de Desarrollo:-------------', IS_DEV)
  const { hasPerm, roles } = useAuthCtx()
  const uploadCtx = useUploadContext()
  const toast = useToast()
  const [chatHasUnread, setChatHasUnread] = useState(false)

  // Verificar si es directivo (NivelB o admin)
  const isDirectivo = roles?.includes('NivelB') || hasPerm('auth', 'assign')

  useEffect(() => {
    const handler = (ev) => setChatHasUnread(!!ev?.detail?.hasUnread)
    window.addEventListener('fh:chat:hasUnread', handler)
    return () => window.removeEventListener('fh:chat:hasUnread', handler)
  }, [])

  // Filtrar apps según permisos
  const allowed = APPS.filter(a => {
    // Si requiere directivos y no lo es, ocultar
    if (a.directivosOnly && !isDirectivo) return false
    // Si tiene permiso específico
    if (a.need && !hasPerm(a.need.modulo, a.need.accion)) return false
    return true
  })

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

  // Calcular progreso promedio de uploads activos
  const activeUploads = (uploadCtx?.uploads || []).filter(u => u.status === 'uploading' || u.status === 'processing')
  const showSidebarIndicator = activeUploads.length > 0 && uploadCtx?.showFloatingIndicator === false
  const avgProgress = activeUploads.length > 0
    ? Math.round(activeUploads.reduce((sum, u) => sum + u.progress, 0) / activeUploads.length)
    : 0

  const handleUploadIndicatorClick = () => {
    uploadCtx?.revealFloatingIndicator?.()
  }

  const handleDevClick = (e, appName) => {
    e.preventDefault()
    toast.warn(`"${appName}" - Ventana en Desarrollo`)
  }

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

          // Si está en desarrollo, usar botón en lugar de NavLink (solo en producción)
          if (app.inDev && !IS_DEV) {
            return (
              <button
                key={app.code}
                className="sbItem sbItem--dev"
                onClick={(e) => handleDevClick(e, app.name)}
                title="En desarrollo"
              >
                <span>{app.name}</span>
                <FaHourglassHalf className="devIcon" />
              </button>
            )
          }


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

      {/* Mini indicador de uploads cuando el flotante está cerrado */}
      {showSidebarIndicator && (
        <button
          className="sbUploadIndicator"
          onClick={handleUploadIndicatorClick}
          title={`${activeUploads.length} archivo${activeUploads.length > 1 ? 's' : ''} subiendo - Click para ver`}
        >
          <svg className="progressRing" viewBox="0 0 36 36">
            <circle
              className="bg"
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="3"
            />
            <circle
              className="progress"
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="#4dd0e1"
              strokeWidth="3"
              strokeDasharray={`${avgProgress} 100`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span className="uploadCount">{activeUploads.length}</span>
        </button>
      )}
    </aside>
  )
}
