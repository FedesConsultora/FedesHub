import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import { useLoading } from '../../context/LoadingContext.jsx'
import { useEffect } from 'react'
import GlobalLoader from '../loader/GlobalLoader.jsx'

export default function PrivateRoute({ fallback = null }) {
  const { user, booted, bootError } = useAuthCtx()
  const loc = useLocation()
  const { showLoader, hideLoader } = useLoading()

  useEffect(() => {
    if (!booted) {
      showLoader()
      return () => hideLoader()
    }
  }, [booted, showLoader, hideLoader])

  if (!booted) {
    if (bootError) {
      return (
        <div style={{ padding: 24 }}>
          {bootError} — <a href="/login">Ir al login</a>
        </div>
      )
    }
    return <GlobalLoader />
  }

  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />
  return <Outlet />
}