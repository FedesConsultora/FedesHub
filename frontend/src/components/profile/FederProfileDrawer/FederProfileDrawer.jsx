import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState } from 'react'
import { FaXmark } from 'react-icons/fa6'
import { FiUser, FiFileText, FiCalendar, FiEdit3, FiCreditCard, FiLifeBuoy } from 'react-icons/fi'
import useFederDetail from '../../../hooks/useFederDetail'
import useFederCatalog from '../../../hooks/useFederCatalog'
import { useAuth } from '../../../context/AuthContext'
import HeaderBasic from './HeaderBasic.jsx'
import BasicInfoSection from './BasicInfoSection.jsx'
import IdentidadSection from './IdentidadSection.jsx'
import FirmaPerfilSection from './FirmaPerfilSection.jsx'
import BancosSection from './BancosSection.jsx'
import EmergenciasSection from './EmergenciasSection.jsx'
import ModalidadDiaSection from './ModalidadDiaSection.jsx'
import ProfileTabs from './ProfileTabs.jsx'
import './FederProfileDrawer.scss'

export default function FederProfileDrawer({
  open = false,
  federId,
  onClose,
  catalog,
  canEditCargo = false,
  isSelf = false,
  forceReadOnly = false // Nuevo
}) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const { data: feder, loading, refetch, toggleActive } = useFederDetail(federId)
  const { catalog: catLocal } = useFederCatalog(catalog)
  const { roles } = useAuth()

  // Determinar permisos de visualización
  // Si no es uno mismo y tiene Rol C, solo ve básica.
  const isRolC = roles.some(r => r.nombre === 'Rol C')
  const showOnlyBasic = !isSelf && isRolC

  // El modo lectura se activa si se fuerza desde prop o si no es el perfil propio
  const readOnly = forceReadOnly || !isSelf

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    requestAnimationFrame(() => setMounted(true))
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; setMounted(false) }
  }, [open])

  useEffect(() => {
    if (!feder) return
    const prev = document.title
    document.title = `Perfil — ${feder.nombre || ''} ${feder.apellido || ''} | FedesHub`
    return () => { document.title = prev }
  }, [feder])

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => { setClosing(false); onClose?.() }, 220)
  }, [onClose])

  const onTabChange = (id) => {
    if (!feder) return
    const labels = {
      basic: 'Información básica',
      id: 'Identidad y legales',
      mode: 'Modalidad por día',
      firma: 'Firma',
      bancos: 'Bancos',
      emerg: 'Emergencias'
    }
    document.title = `${labels[id] || 'Perfil'} — ${feder.nombre || ''} ${feder.apellido || ''} | FedesHub`
  }

  if (!open) return null
  if (loading) return <div className="pfd-loading">Cargando...</div>
  if (!feder) return <div className="pfd-error">No se pudo cargar la información.</div>

  // Definición de pestañas con filtrado por rol
  const allTabs = [
    {
      id: 'basic', label: 'Información básica', icon: FiUser,
      content: (
        <BasicInfoSection
          feder={feder}
          celulaName={feder?.celula_nombre || null}
          canEditCargo={canEditCargo && !readOnly}
          isSelf={isSelf}
          readOnly={readOnly}
        />
      )
    },
    {
      id: 'id', label: 'Identidad y legales', icon: FiFileText,
      content: <IdentidadSection feder={feder} isSelf={isSelf} readOnly={readOnly} />
    },
    {
      id: 'mode', label: 'Modalidad por día', icon: FiCalendar,
      content: <ModalidadDiaSection federId={feder.id} catalog={catLocal || {}} isSelf={isSelf} readOnly={readOnly} />
    },
    {
      id: 'firma', label: 'Firma', icon: FiEdit3,
      content: <FirmaPerfilSection federId={feder.id} federNombre={feder.nombre} federApellido={feder.apellido} readOnly={readOnly} />
    },
    {
      id: 'bancos', label: 'Bancos', icon: FiCreditCard,
      content: <BancosSection federId={feder.id} isSelf={isSelf} readOnly={readOnly} />
    },
    {
      id: 'emerg', label: 'Emergencias', icon: FiLifeBuoy,
      content: <EmergenciasSection federId={feder.id} isSelf={isSelf} readOnly={readOnly} />
    },
  ]

  const enabledTabs = showOnlyBasic ? allTabs.filter(t => t.id === 'basic') : allTabs

  const body = (
    <div className={'pfWrap' + (mounted ? ' open' : '') + (closing ? ' closing' : '')} role="dialog" aria-modal="true" aria-label="Perfil del feder">
      <div className="pfBackdrop" onClick={handleClose} />

      <aside className="pfPanel" onClick={(e) => e.stopPropagation()}>
        <header className="pfTopBar">
          <div className="brand">
            <div className="logo">Perfil</div>
            <div className="sub">{readOnly ? 'Vista de solo lectura' : 'Ficha completa y configuración'}</div>
          </div>
          <button className="close" onClick={handleClose} aria-label="Cerrar"><FaXmark /></button>
        </header>

        <div className="pfBody">
          {loading || !feder ? (
            <div className="muted" style={{ padding: '2rem' }}>Cargando datos del perfil…</div>
          ) : (
            <>
              <HeaderBasic
                feder={feder}
                celulaName={feder.celula_nombre || null}
                onToggleActivo={toggleActive}
                onRefresh={refetch}
                readOnly={readOnly}
              />

              <ProfileTabs
                defaultId="basic"
                onChange={onTabChange}
                tabs={enabledTabs}
              />
            </>
          )}
        </div>
      </aside>
    </div>
  )

  return createPortal(body, document.body)
}