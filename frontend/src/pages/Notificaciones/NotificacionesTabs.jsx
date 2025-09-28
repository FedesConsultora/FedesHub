// src/pages/Notificaciones/NotificacionesTabs.jsx
import { NavLink, Outlet } from 'react-router-dom'
import { FiMessageSquare, FiCheckSquare, FiCalendar } from 'react-icons/fi'
import './NotificacionesTabs.scss'

export default function NotificacionesTabs(){
  document.title = 'FedesHub — Notificaciones'
  return (
    <section className="fhNotifTabs">
      <header className="tabsBar">
        <NavLink end to="/notificaciones" className="tab">Todas</NavLink>
        <NavLink to="/notificaciones/chat" className="tab"><FiMessageSquare/> Chat</NavLink>
        <NavLink to="/notificaciones/tareas" className="tab"><FiCheckSquare/> Tareas</NavLink>
        <NavLink to="/notificaciones/calendario" className="tab"><FiCalendar/> Calendario</NavLink>
      </header>
      <div className="tabBody"><Outlet/></div>
    </section>
  )
}
