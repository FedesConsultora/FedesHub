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
      <div className="userBox" title={user?.email}>
        <img className="avatar" alt="avatar"
          src={`https://ui-avatars.com/api/?background=0f1720&color=fff&name=${encodeURIComponent(user?.email||'F')}`} />
        <div className="userMeta">
          <div className="name">{user?.email}</div>
          <button className="logout" onClick={onLogout}>Salir</button>
        </div>
      </div>
    </header>
  )
}
