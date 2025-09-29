import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../Login/Login.scss'
import bg from '../../assets/img/fondoOfi.webp'
import { forgotPassword } from '../../api/auth'
import { FiMail } from 'react-icons/fi'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isFedes = (e) => /@fedes\.ai$/i.test(String(e || '').trim())
  const valid = !!email && isFedes(email)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (loading || !valid) return
    setError(null)
    try {
      setLoading(true)
      await forgotPassword(email.trim())
      setSent(true)
    } catch (e2) {
      setError(e2?.response?.data?.message || 'No pudimos enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="loginWrap" style={{ ['--fh-login-bg']: `url(${bg})` }}>
      <form className="loginCard" onSubmit={onSubmit} noValidate aria-busy={loading}>
        <div className="brand">
          <div className="logo">FedesHub</div>
          <div className="subtitle">Recuperar contraseña</div>
        </div>

        {!sent ? (
          <>
            <div className={'field ' + (!valid && email ? 'is-error' : '')}>
              <FiMail className="ico" aria-hidden />
              <input
                id="fp-email"
                name="email"
                type="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                placeholder="tuusuario@fedes.ai"
                inputMode="email"
                autoComplete="username"
                autoFocus
                aria-invalid={!!email && !valid}
                aria-describedby={!valid && email ? 'err-fp-email' : undefined}
                disabled={loading}
              />
              <div className="addon" aria-hidden />
              {!valid && email && (
                <div id="err-fp-email" className="hint">Sólo correos @fedes.ai</div>
              )}
            </div>

            {error && <div className="error" role="alert" aria-live="polite">{error}</div>}

            <button className={'submit ' + (loading ? 'is-loading' : '')} type="submit" disabled={!valid || loading}>
              Enviar enlace
            </button>

            <div className="linksRow" style={{marginTop:12}}>
              <Link to="/login">Volver a iniciar sesión</Link>
            </div>
          </>
        ) : (
          <>
            <div className="success" role="status" aria-live="polite">
              Te enviamos un enlace para restablecer tu contraseña si el correo existe en el sistema.
            </div>
            <div className="linksRow" style={{marginTop:12}}>
              <Link to="/login">Volver a iniciar sesión</Link>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
