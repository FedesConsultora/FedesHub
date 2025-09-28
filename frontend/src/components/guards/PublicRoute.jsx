import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'

export default function PublicRoute({ fallback = null }) {
  const { user, booted } = useAuthCtx()
  const loc = useLocation()

  // Mientras bootea mostramos un mini loader (evita pantalla en blanco)
  if (!booted) return fallback ?? <div style={{padding:24}}>Preparando…</div>

  // Si ya hay sesión, mandamos a donde venía o a "/"
  if (user) {
    const to = loc.state?.from?.pathname || '/'
    return <Navigate to={to} replace />
  }

  // Si no hay sesión, renderizamos la página pública (login)
  return <Outlet />
}
