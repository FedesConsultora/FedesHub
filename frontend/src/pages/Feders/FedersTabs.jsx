// frontend/src/pages/Feders/FedersTabs.jsx
import { NavLink, Outlet } from 'react-router-dom'
import { FiUsers, FiBriefcase, FiLayers } from 'react-icons/fi'
import { useAuthCtx } from '../../context/AuthContext.jsx'
import './FedersTabs.scss'

export default function FedersTabs() {
  const { hasPerm } = useAuthCtx()
  const canSeeCargos = hasPerm('cargos', 'read')

  return (
    <section className="fhFedersTabs">
      <header className="tabsBar">
        <NavLink end to="/feders" className="tab"><FiUsers /> Vista general</NavLink>
        <NavLink to="/feders/listado" className="tab"><FiUsers /> Listado</NavLink>
        {/* Células tab removed */}
        {canSeeCargos && <NavLink to="/feders/cargos" className="tab"><FiBriefcase /> Cargos</NavLink>}
      </header>
      <div className="tabBody"><Outlet /></div>
    </section>
  )
}
