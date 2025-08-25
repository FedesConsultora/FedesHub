import { Routes, Route, Navigate } from 'react-router-dom'

// Guards / layout
import PrivateRoute from '../components/guards/PrivateRoute.jsx'
import RequirePerm from '../components/guards/RequirePerm.jsx'
import AppLayout from '../layouts/AppLayout.jsx'

// Pages
import Login from '../pages/Login/Login.jsx'
import Dashboard from '../pages/Dashboard/Dashboard.jsx'
import FedersList from '../pages/Feders/FedersList.jsx'
import CargosList from '../pages/Cargos/CargosList.jsx'

// Estas están en /pages/Auth y /pages/Admin (pueden ser placeholders al inicio)
import Profile from '../pages/Auth/Profile.jsx'
import Users from '../pages/Admin/Users.jsx'
import Roles from '../pages/Admin/Roles.jsx'
import RoleDetail from '../pages/Admin/RoleDetail.jsx'

// Loader global opcional
function FullPageLoader() {
  return (
    <div style={{ display:'grid', placeItems:'center', minHeight:'100vh' }}>
      Cargando…
    </div>
  )
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<Login />} />

      {/* Privadas */}
      <Route element={<PrivateRoute fallback={<FullPageLoader />} />}>
        <Route element={<AppLayout />}>
          {/* Home */}
          <Route index element={<Dashboard />} />

          {/* Módulos */}
          <Route
            path="feders"
            element={
              <RequirePerm modulo="feders" accion="read">
                <FedersList />
              </RequirePerm>
            }
          />
          <Route
            path="cargos"
            element={
              <RequirePerm modulo="cargos" accion="read">
                <CargosList />
              </RequirePerm>
            }
          />

          {/* Perfil */}
          <Route path="perfil" element={<Profile />} />

          {/* Admin Auth (requiere auth.assign) */}
          <Route path="admin">
            <Route
              path="usuarios"
              element={
                <RequirePerm modulo="auth" accion="assign">
                  <Users />
                </RequirePerm>
              }
            />
            <Route
              path="roles"
              element={
                <RequirePerm modulo="auth" accion="assign">
                  <Roles />
                </RequirePerm>
              }
            />
            <Route
              path="roles/:id"
              element={
                <RequirePerm modulo="auth" accion="assign">
                  <RoleDetail />
                </RequirePerm>
              }
            />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
