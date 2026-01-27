// src/components/Header/Header.jsx
import { Link, useNavigate } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import AsistenciaDot from '../asistencia/AsistenciaDot.jsx'
import { useState, useEffect } from 'react'
import { FiHeadphones, FiChevronDown, FiBell } from 'react-icons/fi'
import { useMemo } from 'react'
import BellCluster from '../notifications/BellCluster.jsx'
import AdminDrawer from '../admin/AdminDrawer/AdminDrawer.jsx'
import Avatar from '../Avatar.jsx'
import { useProfilePreview } from '../../context/ProfilePreviewProvider'
import NotifHealthModal from '../notifications/NotifHealthModal/NotifHealthModal.jsx'
import { useRealtime } from '../../realtime/RealtimeProvider'
import './Header.scss'

const SUPPORT_URL = 'https://miro.com/app/board/uXjVGf1enLk=/'

function NotifRequestBtn({ onOpenHealth }) {
  const { notifPermission } = useRealtime()
  if (notifPermission !== 'default') return null

  return (
    <button
      className="notifRequestBtn"
      onClick={onOpenHealth}
      title="Habilitar notificaciones de escritorio"
    >
      <FiBell />
      <span className="dot" />
    </button>
  )
}

function AudioStatusIndicator({ onClick }) {
  const { notifPermission, audioUnlocked, isMasterTab } = useRealtime()

  const status = useMemo(() => {
    if (notifPermission !== 'granted') return 'no-permission' // 🔴 Rojo
    if (!audioUnlocked) return 'audio-locked' // 🟠 Naranja
    return 'ready' // 🟢 Verde
  }, [notifPermission, audioUnlocked])

  const title = useMemo(() => {
    if (status === 'no-permission') return '⚠️ Notificaciones desactivadas - Click para habilitar'
    if (status === 'audio-locked') return '🔊 Audio bloqueado - Click para desbloquear'
    return `✅ Notificaciones activas${isMasterTab ? ' (Master)' : ''}`
  }, [status, isMasterTab])

  return (
    <button
      className={`audioStatusIndicator status-${status}`}
      onClick={onClick}
      title={title}
    >
      <FiBell />
      <span className="status-dot" />
    </button>
  )
}

export default function Header() {
  const { user, hasPerm, logout } = useAuthCtx()
  const context = useProfilePreview()
  const openProfile = context?.openProfile

  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(() => localStorage.getItem('fh_admin_open') === 'true')
  const [healthOpen, setHealthOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('fh_admin_open', adminOpen)
  }, [adminOpen])

  const onLogout = async () => { await logout(); nav('/login') }

  // Check if user can access admin
  const isAdmin = hasPerm('auth', 'manage') || hasPerm('rrhh', 'manage')

  const handleSupportClick = () => {
    window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <header className={`fhHeader ${open ? 'user-menu-open' : ''}`}>
        <Link to="/" className="brand">FedesHub</Link>
        <span className='sys-version'>BETA v3</span>
        <div className="spacer" />
        <div className="rightCluster">
          <button
            className="supportBtn"
            onClick={handleSupportClick}
            title="Soporte"
          >
            <FiHeadphones />
          </button>
          <AudioStatusIndicator onClick={() => setHealthOpen(true)} />
          <NotifRequestBtn onOpenHealth={() => setHealthOpen(true)} />
          <BellCluster onAnyOpen={() => setOpen(false)} />
          <AsistenciaDot />
          <button className="userChip" onClick={() => setOpen(v => !v)} aria-haspopup="menu" title={user?.email}>
            <Avatar
              src={user?.avatar_url}
              name={`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.email}
              size={28}
              federId={user?.feder_id}
              enablePreview={false}
            />
            <span className="user-name">{`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.email}</span>
            <span className="caret"><FiChevronDown /></span>
          </button>
          {open && (
            <div className="menu" role="menu" onMouseLeave={() => setOpen(false)}>
              <button onClick={() => { setOpen(false); openProfile(user?.feder_id) }} role="menuitem">Mi perfil</button>
              <button onClick={() => { setOpen(false); setHealthOpen(true) }} role="menuitem">
                <FiBell style={{ marginRight: 8, verticalAlign: 'middle' }} /> Notificaciones
              </button>
              {isAdmin && (
                <button onClick={() => { setOpen(false); setAdminOpen(true) }} role="menuitem">Admin</button>
              )}
              <hr />
              <button className="danger" onClick={onLogout} role="menuitem">Cerrar sesión</button>
            </div>
          )}
        </div>
      </header>

      <AdminDrawer open={adminOpen} onClose={() => setAdminOpen(false)} />
      <NotifHealthModal isOpen={healthOpen} onClose={() => setHealthOpen(false)} />
    </>
  )
}

