import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import '../Login/login.scss'
import bg from '../../assets/img/fondoOfi.webp'
import { resetPassword } from '../../api/auth'
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi'

export default function ResetPassword() {
  const loc = useLocation()
  const nav = useNavigate()
  const params = new URLSearchParams(loc.search)
  const urlToken = params.get('token') || ''

  const [token, setToken] = useState(urlToken)
  const [pwd1, setPwd1] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const formRef = useRef(null)

  // Reglas
  const strong = useMemo(
    () => /[a-z]/.test(pwd1) && /[A-Z]/.test(pwd1) && /\d/.test(pwd1) && pwd1.length >= 10,
    [pwd1]
  )
  const match  = pwd1 && pwd1 === pwd2
  const valid  = strong && match && !!token

  // Submit
  const onSubmit = async (e) => {
    e.preventDefault()
    if (loading || !valid) return
    setError(null)
    try {
      setLoading(true)
      await resetPassword({ token, new_password: pwd1 })
      setOk(true)

      // Evitar F5 reintente: limpiamos querystring (y token en estado)
      window.history.replaceState({}, '', loc.pathname)
      setToken('')

      // Limpia inputs para que no queden datos sensibles
      setPwd1(''); setPwd2('')
    } catch (e2) {
      setError(e2?.response?.data?.message || 'El enlace no es válido o expiró')
    } finally {
      setLoading(false)
    }
  }

  // Enter envía si es válido
  useEffect(() => {
    const f = formRef.current
    if (!f) return
    const onKey = (ev) => { if (ev.key === 'Enter' && valid && !loading) f.requestSubmit() }
    f.addEventListener('keydown', onKey)
    return () => f.removeEventListener('keydown', onKey)
  }, [valid, loading])

  return (
    <div className="loginWrap" style={{ ['--fh-login-bg']: `url(${bg})` }}>
      <form ref={formRef} className="loginCard" onSubmit={onSubmit} noValidate aria-busy={loading}>
        <div className="brand">
          <div className="logo">FedesHub</div>
          <div className="subtitle">Restablecer contraseña</div>
        </div>

        {!token && !ok ? (
          <>
            <div className="error" role="alert">Falta el token o el enlace ya fue utilizado.</div>
            <div className="linksRow" style={{marginTop:12}}>
              <Link to="/auth/forgot">Solicitar un nuevo enlace</Link>
              <Link to="/login">Volver a iniciar sesión</Link>
            </div>
          </>
        ) : !ok ? (
          <>
            <label className="lbl" htmlFor="rp-pwd1">Nueva contraseña</label>
            <div className={'field ' + (pwd1 && !strong ? 'is-error' : '')}>
              <FiLock className="ico" aria-hidden />
              <input
                id="rp-pwd1"
                name="new-password"
                type={show1 ? 'text' : 'password'}
                value={pwd1}
                onChange={e=>setPwd1(e.target.value)}
                placeholder="Nueva contraseña"
                autoComplete="new-password"
                aria-invalid={!!pwd1 && !strong}
                aria-describedby={!strong && pwd1 ? 'hint-strong' : undefined}
                disabled={loading}
              />
              <button
                type="button"
                className="eye"
                aria-label={show1 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShow1(v => !v)}
                disabled={loading}
              >
                {show1 ? <FiEyeOff /> : <FiEye />}
              </button>
              {!strong && pwd1 && (
                <div id="hint-strong" className="hint">
                  Debe tener mayúscula, minúscula, número y al menos 10 caracteres.
                </div>
              )}
            </div>

            <label className="lbl" htmlFor="rp-pwd2">Repetir contraseña</label>
            <div className={'field ' + (pwd2 && !match ? 'is-error' : '')}>
              <FiLock className="ico" aria-hidden />
              <input
                id="rp-pwd2"
                name="confirm-password"
                type={show2 ? 'text' : 'password'}
                value={pwd2}
                onChange={e=>setPwd2(e.target.value)}
                placeholder="Repetir contraseña"
                autoComplete="new-password"
                aria-invalid={!!pwd2 && !match}
                aria-describedby={!match && pwd2 ? 'hint-match' : undefined}
                disabled={loading}
              />
              <button
                type="button"
                className="eye"
                aria-label={show2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShow2(v => !v)}
                disabled={loading}
              >
                {show2 ? <FiEyeOff /> : <FiEye />}
              </button>
              {!match && pwd2 && <div id="hint-match" className="hint">No coincide</div>}
            </div>

            {error && <div className="error" role="alert" aria-live="polite">{error}</div>}

            <button className={'submit ' + (loading ? 'is-loading' : '')} type="submit" disabled={!valid || loading}>
              Cambiar
            </button>

            <div className="linksRow" style={{marginTop:12}}>
              <Link to="/login">Volver a iniciar sesión</Link>
            </div>
          </>
        ) : (
          <>
            <div className="success" role="status" aria-live="polite">
              ¡Listo! Ya podés iniciar sesión con tu nueva contraseña.
            </div>
            <button type="button" className="submit" onClick={()=>nav('/login', { replace:true })}>
              Volver a login
            </button>
          </>
        )}
      </form>
    </div>
  )
}
