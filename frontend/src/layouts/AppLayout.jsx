import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header/Header.jsx'
import Sidebar from '../components/Sidebar/Sidebar.jsx'
import GlobalLoader from '../components/loader/GlobalLoader.jsx'
import FloatingBubbles from '../components/chat/FloatingBubbles.jsx'
import './AppLayout.scss'

export default function AppLayout() {
  const location = useLocation()
  const isChat = location.pathname.startsWith('/chat')

  return (
    <div className="appShell">
      <Header />
      <div className="appBody">
        <Sidebar />
        <main className="appMain">
          <Outlet />
          {!isChat && <GlobalLoader />}
          <FloatingBubbles />
        </main>
      </div>
    </div>
  )
}
