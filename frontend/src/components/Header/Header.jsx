import { Link, useNavigate } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import './Header.scss'

export default function Header() {
  const { user, logout } = useAuthCtx()
  const nav = useNavigate()

  const onLogout = async () => { await logout(); nav('/login') }

  return (
    <header className="fhHeader">
      <Link to="/" className="brand">FedesHub</Link>
      <div className="spacer" />
      {/* acá van: buscador global, notificaciones, punto de asistencia, etc. */}
      <div className="userBox">
        <img className="avatar" src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nombre ?? 'F')}`} />
        <div className="userMeta">
          <div className="name">{user?.nombre} {user?.apellido}</div>
          <button className="logout" onClick={onLogout}>Salir</button>
        </div>
      </div>
    </header>
  )
}
