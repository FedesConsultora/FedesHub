import { Outlet } from 'react-router-dom'
import Header from '../components/Header/Header.jsx'
import './AppLayout.scss'

export default function AppLayout() {
  return (
    <div className="appLayout">
      <Header />
      <main className="appMain">
        <Outlet />
      </main>
    </div>
  )
}
