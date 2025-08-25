import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import './Login.scss'

export default function Login() {
  const { login } = useAuthCtx()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()

  const isFedes = (e) => /@fedes\.ai$/i.test(e.trim())

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!isFedes(email)) { setError('Sólo correos @fedes.ai'); return }
    try {
      setLoading(true)
      await login(email.trim(), password)
      const to = loc.state?.from?.pathname || '/'
      nav(to, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Credenciales inválidas')
    } finally { setLoading(false) }
  }

  return (
    <div className="loginWrap">
      <form className="loginCard" onSubmit={onSubmit}>
        <h1>FedesHub</h1>
        <p className="muted">Acceso restringido a dominios @fedes.ai</p>

        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tuusuario@fedes.ai" autoFocus />

        <label>Contraseña</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />

        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
