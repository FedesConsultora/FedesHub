import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import './Login.scss'
import bg from '../../assets/img/fondoOfi.webp'
import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi'

export default function Login() {
  const { login } = useAuthCtx()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const formRef = useRef(null)

  const isFedes = (e) => /@fedesconsultora\.com$/i.test(String(e || '').trim())

  const emailError = useMemo(() => {
    if (!email) return null
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Formato inválido'
    if (!isFedes(email)) return 'Sólo correos @fedesconsultora.com'
    return null
  }, [email])

  const passwordError = useMemo(() => {
    if (!password) return null
    if (password.length < 8) return 'Min. 8 caracteres'
    return null
  }, [password])

  const formValid = !!email && !!password && !emailError && !passwordError

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!formValid) return
    try {
      setLoading(true)
      await login(email.trim(), password)
      const to = loc.state?.from?.pathname || '/'
      nav(to, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Credenciales inválidas')
    } finally { setLoading(false) }
  }

  // Enter en inputs dispara submit si es válido
  useEffect(() => {
    const f = formRef.current
    if (!f) return
    const onKey = (ev) => { if (ev.key === 'Enter' && formValid) f.requestSubmit() }
    f.addEventListener('keydown', onKey)
    return () => f.removeEventListener('keydown', onKey)
  }, [formValid])

  return (
    <div className="loginWrap" style={{ ['--fh-login-bg']: `url(${bg})` }}>
      <form ref={formRef} className="loginCard" onSubmit={onSubmit} noValidate>
        <div className="brand">
          <div className="logo">FedesHub</div>
        </div>

        <label className="lbl" htmlFor="email">Email</label>
        <div className={'field ' + (emailError ? 'is-error' : '')}>
          <FiMail className="ico" aria-hidden />
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tuusuario@fedesconsultora.com"
            autoFocus
            inputMode="email"
            autoComplete="username"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'err-email' : undefined}
          />
          <div className="addon" aria-hidden />
          {emailError && <div id="err-email" className="hint">{emailError}</div>}
        </div>

        <label className="lbl" htmlFor="password">Contraseña</label>
        <div className={'field ' + (passwordError ? 'is-error' : '')}>
          <FiLock className="ico" aria-hidden />
          <input
            id="password"
            name="password"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? 'err-pass' : undefined}
          />
          <button
            type="button"
            className="eye"
            aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setShowPwd(v => !v)}
          >
            {showPwd ? <FiEyeOff /> : <FiEye />}
          </button>
          {passwordError && <div id="err-pass" className="hint">{passwordError}</div>}
        </div>

        {error && <div className="error" role="alert">{error}</div>}

        <button className="submit" type="submit" disabled={!formValid || loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <div className="linksRow">
          <Link to="/auth/forgot">¿Olvidaste tu contraseña?</Link>
        </div>
      </form>
    </div>
  )
}