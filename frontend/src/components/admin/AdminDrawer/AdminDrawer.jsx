import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState } from 'react'
import { FaXmark } from 'react-icons/fa6'
import { FiUsers, FiShield, FiBriefcase, FiSettings } from 'react-icons/fi'
import UsersTab from './UsersTab.jsx'
import RolesTab from './RolesTab.jsx'
import CargosTab from './CargosTab.jsx'
import './AdminDrawer.scss'

const TABS = [
    { id: 'users', label: 'Usuarios', icon: FiUsers },
    { id: 'roles', label: 'Roles', icon: FiShield },
    { id: 'cargos', label: 'Cargos', icon: FiBriefcase },
]

export default function AdminDrawer({ open = false, onClose }) {
    const [mounted, setMounted] = useState(false)
    const [closing, setClosing] = useState(false)
    const [activeTab, setActiveTab] = useState('users')

    useEffect(() => {
        if (!open) return
        const onKey = (e) => { if (e.key === 'Escape') handleClose() }
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKey)
        requestAnimationFrame(() => setMounted(true))
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
            setMounted(false)
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        const prev = document.title
        document.title = 'Administración | FedesHub'
        return () => { document.title = prev }
    }, [open])

    const handleClose = useCallback(() => {
        setClosing(true)
        setTimeout(() => { setClosing(false); onClose?.() }, 220)
    }, [onClose])

    if (!open) return null

    const renderTabContent = () => {
        switch (activeTab) {
            case 'users': return <UsersTab />
            case 'roles': return <RolesTab />
            case 'cargos': return <CargosTab />
            default: return null
        }
    }

    const body = (
        <div className={'adminWrap' + (mounted ? ' open' : '') + (closing ? ' closing' : '')}
            role="dialog" aria-modal="true" aria-label="Panel de administración">
            <div className="adminBackdrop" onClick={handleClose} />

            <aside className="adminPanel" onClick={(e) => e.stopPropagation()}>
                <header className="adminTopBar">
                    <div className="brand">
                        <div className="logo"><FiSettings /> Administración</div>
                        <div className="sub">Gestión de usuarios, roles y cargos</div>
                    </div>
                    <button className="close" onClick={handleClose} aria-label="Cerrar">
                        <FaXmark />
                    </button>
                </header>

                <nav className="adminTabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="adminBody">
                    {renderTabContent()}
                </div>
            </aside>
        </div>
    )

    return createPortal(body, document.body)
}
