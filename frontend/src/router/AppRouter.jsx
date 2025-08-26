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

// Admin/Auth
import Users from '../pages/Admin/Users.jsx'
import Roles from '../pages/Admin/Roles.jsx'
import RoleDetail from '../pages/Admin/RoleDetail.jsx'
import Diag from '../pages/Diag.jsx'

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
      <Route path="/diag" element={<Diag />} />
      {/* Privadas */}
      <Route element={<PrivateRoute fallback={<FullPageLoader />} />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />

          <Route
            path="feders"
            element={<RequirePerm modulo="feders" accion="read"><FedersList /></RequirePerm>}
          />
          <Route
            path="cargos"
            element={<RequirePerm modulo="cargos" accion="read"><CargosList /></RequirePerm>}
          />

          {/* Admin Auth (requiere auth.assign) */}
          <Route path="admin">
            <Route path="usuarios" element={
              <RequirePerm modulo="auth" accion="assign"><Users /></RequirePerm>
            } />
            <Route path="roles" element={
              <RequirePerm modulo="auth" accion="assign"><Roles /></RequirePerm>
            } />
            <Route path="roles/:id" element={
              <RequirePerm modulo="auth" accion="assign"><RoleDetail /></RequirePerm>
            } />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
