import { Routes, Route, Navigate } from 'react-router-dom'

// Guards / layout
import PrivateRoute from '../components/guards/PrivateRoute.jsx'
import PublicRoute from '../components/guards/PublicRoute.jsx'
import RequirePerm from '../components/guards/RequirePerm.jsx'
import AppLayout from '../layouts/AppLayout.jsx'

// Pages
import Login from '../pages/Login/Login.jsx'
import Dashboard from '../pages/Dashboard/Dashboard.jsx'
import FedersList from '../pages/Feders/FedersListPage.jsx'
import CargosList from '../pages/Cargos/CargosList.jsx'
import Users from '../pages/Admin/Users.jsx'
import Roles from '../pages/Admin/Roles.jsx'
import AdminCargos from '../pages/Admin/Cargos.jsx'
import AdminCatalogos from '../pages/Admin/Catalogos.jsx'
import RoleDetail from '../pages/Admin/RoleDetail.jsx'
import Diag from '../pages/Diag.jsx'
import TasksPage from '../pages/Tareas/TasksPage.jsx'
import ForgotPassword from '../pages/passwordRecovery/ForgotPassword.jsx'
import ResetPassword from '../pages/passwordRecovery/ResetPassword.jsx'
import AdminTabs from '../pages/Admin/AdminTabs.jsx'
import FedersTabs from '../pages/Feders/FedersTabs.jsx'
import FedersOverviewPage from '../pages/Feders/FedersOverviewPage.jsx'
import CelulasListPage from '../pages/Feders/CelulasListPage.jsx'
import CelulaDetailPage from '../pages/Feders/CelulaDetailPage.jsx'
import FederDetailPage from '../pages/Feders/FederDetailPage.jsx'
import ClientesListPage from '../pages/Clientes/ClientesListPage.jsx'
import ClienteDetailPage from '../pages/Clientes/ClienteDetailPage.jsx'
import AsistenciaPage from '../pages/Asistencia/AsistenciaPage.jsx'
import AusenciasPage from '../pages/Ausencias/AusenciasPage.jsx'
import CalendarioPage from '../pages/Calendario/CalendarioPage.jsx'

import NotificacionesTabs from '../pages/Notificaciones/NotificacionesTabs.jsx'
import NotifListPage from '../pages/Notificaciones/NotifListPage.jsx'

import ChatPage from '../pages/Chat/ChatPage.jsx'   // NUEVO
import PerfilPage from '../pages/Perfil/PerfilPage.jsx'

function FullPageLoader() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      Cargando…
    </div>
  )
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Públicas */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/forgot" element={<ForgotPassword />} />
        <Route path="/auth/reset" element={<ResetPassword />} />
      </Route>
      <Route path="/diag" element={<Diag />} />

      {/* Privadas */}
      <Route element={<PrivateRoute fallback={<FullPageLoader />} />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />

          <Route
            path="feders"
            element={<RequirePerm modulo="feders" accion="read"><FedersTabs /></RequirePerm>}
          >
            <Route index element={<FedersOverviewPage />} />
            <Route path="listado" element={<FedersList />} />
            <Route path="celulas" element={<CelulasListPage />} />
            <Route path="celulas/:id" element={<CelulaDetailPage />} />
            <Route path="view/:id" element={<FederDetailPage />} />
            <Route
              path="cargos"
              element={<RequirePerm modulo="cargos" accion="read"><CargosList /></RequirePerm>}
            />
          </Route>
          <Route
            path="perfil"
            element={<RequirePerm modulo="feders" accion="read"><PerfilPage /></RequirePerm>}
          />

          {/* LISTA de tareas */}
          <Route
            path="tareas"
            element={<RequirePerm modulo="tareas" accion="read"><TasksPage /></RequirePerm>}
          />
          <Route
            path="asistencia"
            element={<RequirePerm modulo="asistencia" accion="read"><AsistenciaPage /></RequirePerm>}
          />
          <Route
            path="ausencias"
            element={<RequirePerm modulo="ausencias" accion="read"><AusenciasPage /></RequirePerm>}
          />
          <Route
            path="calendario"
            element={<RequirePerm modulo="calendario" accion="read"><CalendarioPage /></RequirePerm>}
          />
          <Route
            path="notificaciones"
            element={<RequirePerm modulo="notificaciones" accion="read"><NotificacionesTabs /></RequirePerm>}
          >
            <Route index element={<NotifListPage buzonOverride={undefined} />} />
            <Route path="chat" element={<NotifListPage buzonOverride="chat" />} />
            <Route path="tareas" element={<NotifListPage buzonOverride="tareas" />} />
            <Route path="calendario" element={<NotifListPage buzonOverride="calendario" />} />
          </Route>

          {/* Chat */}
          <Route
            path="chat/*"
            element={<RequirePerm modulo="chat" accion="read"><ChatPage /></RequirePerm>}
          />


          <Route path="/clientes" element={<ClientesListPage />} />
          <Route path="/clientes/:id" element={<ClienteDetailPage />} />
          <Route
            path="admin"
            element={<RequirePerm modulo="auth" accion="assign"><AdminTabs /></RequirePerm>}
          >
            <Route path="usuarios" element={<Users />} />
            <Route path="roles" element={<Roles />} />
            <Route path="roles/:id" element={<RoleDetail />} />
            <Route path="cargos" element={<RequirePerm modulo="cargos" accion="read"><AdminCargos /></RequirePerm>} />
            <Route path="catalogos" element={<RequirePerm modulo="auth" accion="assign"><AdminCatalogos /></RequirePerm>} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}