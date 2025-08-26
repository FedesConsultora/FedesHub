// src/components/guards/PrivateRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'

export default function PrivateRoute({ fallback = null }) {
  const { user, loading, bootError } = useAuthCtx()
  const loc = useLocation()

  if (loading) {
    return fallback ?? (
      <div style={{padding:24}}>
        Cargando sesión…
        {bootError && (
          <div style={{marginTop:8, color:'#ffb4b4'}}>
            {bootError} — <a href="/login">Ir al login</a>
          </div>
        )}
      </div>
    )
  }

  // si no logueado → a /login
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />
  return <Outlet />
}
