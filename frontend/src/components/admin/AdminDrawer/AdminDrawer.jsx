import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaXmark } from 'react-icons/fa6'
import { FiUsers, FiShield, FiBriefcase, FiSettings, FiDatabase, FiTag } from 'react-icons/fi'
import usePermission from '../../../hooks/usePermissions'
import BackupTab from './BackupTab.jsx'
import UsersTab from './UsersTab.jsx'
import RolesTab from './RolesTab.jsx'
import CargosTab from './CargosTab.jsx'
import RrhhAusenciasTab from './RrhhAusenciasTab.jsx'
import AbsenceTypesTab from './AbsenceTypesTab.jsx'
import AdminComercial from '../../../pages/Admin/Comercial/AdminComercial.jsx'
import './AdminDrawer.scss'

const TABS_CONFIG = [
    { id: 'users', label: 'Usuarios', icon: FiUsers, permission: { mod: 'auth', act: 'read' } },
    { id: 'roles', label: 'Roles', icon: FiShield, permission: { mod: 'auth', act: 'manage' } },
    { id: 'comercial', label: 'Comercial', icon: FiTag, permission: { mod: 'comercial', act: 'admin' } },
    { id: 'cargos', label: 'Cargos', icon: FiBriefcase, permission: { mod: 'cargos', act: 'manage' } },
    { id: 'backups', label: 'Mantenimiento', icon: FiDatabase, permission: { mod: 'auth', act: 'manage' } },
    { id: 'ausencia_tipos', label: 'Tipos de Ausencia', icon: FiTag, permission: { mod: 'ausencias', act: 'manage' } },
    { id: 'rrhh', label: 'RRHH', icon: FiBriefcase, permission: { mod: 'rrhh', act: 'manage' } },
]

export default function AdminDrawer({ open = false, onClose }) {
    const [closing, setClosing] = useState(false)
    const [mounted, setMounted] = useState(false)
    const { can } = usePermission()

    const visibleTabs = useMemo(() => {
        return TABS_CONFIG.filter(t => !t.permission || can(t.permission.mod, t.permission.act))
    }, [can])

    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('fh_admin_tab')
        if (saved && visibleTabs.some(t => t.id === saved)) return saved
        return visibleTabs[0]?.id || 'users'
    })

    useEffect(() => {
        if (activeTab) localStorage.setItem('fh_admin_tab', activeTab)
    }, [activeTab])

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
        const props = { setActiveTab }
        switch (activeTab) {
            case 'users': return <UsersTab {...props} />
            case 'roles': return <RolesTab {...props} />
            case 'cargos': return <CargosTab {...props} />
            case 'backups': return <BackupTab {...props} />
            case 'comercial': return <AdminComercial {...props} />
            case 'ausencia_tipos': return <AbsenceTypesTab {...props} />
            case 'rrhh': return <RrhhAusenciasTab {...props} />
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
                    {visibleTabs.map(tab => (
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
