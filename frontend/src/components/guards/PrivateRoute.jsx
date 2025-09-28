import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'

export default function PrivateRoute({ fallback = null }) {
  const { user, booted, bootError } = useAuthCtx()
  const loc = useLocation()

  // Esperar a que termine el boot, nada de "cargando" infinito
  if (!booted) {
    return fallback ?? (
      <div style={{padding:24}}>
        Cargando sesión…
        {bootError && (
          <div style={{marginTop:8, color:'#ffb4b4'}}>
            {bootError} — <a href="/login">Ir al login</a>
          </div>
        )}x 
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />
  return <Outlet />
}