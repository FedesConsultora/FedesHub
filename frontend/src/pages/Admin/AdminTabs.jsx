import { NavLink, Outlet } from 'react-router-dom'
import './Admin.scss'

export default function AdminTabs() {
  return (
    <section className="adminWrap card adminCard">
      <div className="adminTabs sticky">
        <NavLink to="/admin/usuarios" className={({isActive})=>isActive?'tab active':'tab'}>Usuarios</NavLink>
        <NavLink to="/admin/roles"    className={({isActive})=>isActive?'tab active':'tab'}>Roles</NavLink>
        <NavLink to="/admin/cargos"   className={({isActive})=>isActive?'tab active':'tab'}>Cargos</NavLink>
        <NavLink to="/admin/catalogos"className={({isActive})=>isActive?'tab active':'tab'}>Catálogos</NavLink>
      </div>
      <div className="adminTabBody fill">
        <Outlet />
      </div>
    </section>
  )
}
