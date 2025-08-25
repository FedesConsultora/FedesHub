import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'

export default function PrivateRoute() {
  const { user, loading } = useAuthCtx()
  const loc = useLocation()

  if (loading) return <div style={{padding:24}}>Cargando sesión…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />
  return <Outlet />
}
