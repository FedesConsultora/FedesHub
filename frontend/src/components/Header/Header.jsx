// src/components/Header/Header.jsx
import { Link, useNavigate } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import AsistenciaDot from '../asistencia/AsistenciaDot.jsx'
import { useState } from 'react'
import { FiHeadphones } from 'react-icons/fi'
import BellCluster from '../notifications/BellCluster.jsx'
import AdminDrawer from '../admin/AdminDrawer/AdminDrawer.jsx'
import Avatar from '../Avatar.jsx'
import { useProfilePreview } from '../../context/ProfilePreviewProvider.jsx'
import './Header.scss'

const SUPPORT_URL = 'https://miro.com/app/board/uXjVGf1enLk=/'

export default function Header() {
  const { user, hasPerm, logout } = useAuthCtx()
  const { openProfile } = useProfilePreview()

  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  const onLogout = async () => { await logout(); nav('/login') }

  // Check if user can access admin (same as sidebar used)
  const isAdmin = hasPerm('auth', 'assign')

  const handleSupportClick = () => {
    window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <header className="fhHeader">
        <Link to="/" className="brand">FedesHub</Link>
        <span className='sys-version'>BETA v2.0</span>
        <div className="spacer" />
        <div className="rightCluster">
          <button
            className="supportBtn"
            onClick={handleSupportClick}
            title="Soporte"
          >
            <FiHeadphones />
          </button>
          <BellCluster onAnyOpen={() => setOpen(false)} />
          <AsistenciaDot />
          <button className="userChip" onClick={() => setOpen(v => !v)} aria-haspopup="menu" title={user?.email}>
            <Avatar
              src={user?.avatar_url}
              name={`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.email}
              size={28}
              federId={user?.feder_id}
            />
            <span className="user-name">{`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.email}</span>
            <span className="caret">▾</span>
          </button>
          {open && (
            <div className="menu" role="menu" onMouseLeave={() => setOpen(false)}>
              <button onClick={() => { setOpen(false); openProfile(user?.feder_id) }} role="menuitem">Mi perfil</button>
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
    </>
  )
}

