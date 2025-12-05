// src/components/Header/Header.jsx
import { Link, useNavigate } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import AsistenciaDot from '../asistencia/AsistenciaDot.jsx'
import { useState } from 'react'
import BellCluster from '../notifications/BellCluster.jsx'
import AdminDrawer from '../admin/AdminDrawer/AdminDrawer.jsx'
import './Header.scss'

export default function Header() {
  const { user, logout } = useAuthCtx()

  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  const onLogout = async () => { await logout(); nav('/login') }

  // Check if user has NivelA role (Admin)
  const isAdmin = user?.roles?.some(r => r.nombre === 'NivelA')

  return (
    <>
      <header className="fhHeader">
        <Link to="/" className="brand">FedesHub</Link>
        <span className='sys-version'>BETA v1.0</span>
        <div className="spacer" />
        <div className="rightCluster">
          <BellCluster onAnyOpen={() => setOpen(false)} />
          <AsistenciaDot />
          <button className="userChip" onClick={() => setOpen(v => !v)} aria-haspopup="menu" title={user?.email}>
            <img className="avatar" alt="avatar"
              src={`https://ui-avatars.com/api/?background=0b1118&color=fff&name=${encodeURIComponent(user?.email || 'F')}`} />
            <span className="email">{user?.email}</span>
            <span className="caret">▾</span>
          </button>
          {open && (
            <div className="menu" role="menu" onMouseLeave={() => setOpen(false)}>
              <button onClick={() => { setOpen(false); nav('/perfil') }} role="menuitem">Mi perfil</button>
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
