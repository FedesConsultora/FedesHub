import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState } from 'react'
import { FaXmark } from 'react-icons/fa6'
import { FiUser, FiFileText, FiCalendar, FiEdit3, FiCreditCard, FiLifeBuoy } from 'react-icons/fi'
import useFederDetail from '../../../hooks/useFederDetail'
import useFederCatalog from '../../../hooks/useFederCatalog'
import HeaderBasic from './HeaderBasic.jsx'
import BasicInfoSection from './BasicInfoSection.jsx'
import IdentidadSection from './IdentidadSection.jsx'
import FirmaPerfilSection from './FirmaPerfilSection.jsx'
import BancosSection from './BancosSection.jsx'
import EmergenciasSection from './EmergenciasSection.jsx'
import ModalidadDiaSection from './ModalidadDiaSection.jsx'
import ProfileTabs from './ProfileTabs.jsx'
import './FederProfileDrawer.scss'

export default function FederProfileDrawer({ open = false, federId, onClose, catalog, canEditCargo = false, isSelf = false }) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const { data: feder, loading, refetch, toggleActive } = useFederDetail(federId)
  const { catalog: catLocal } = useFederCatalog(catalog)

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

  const body = (
    <div className={'pfWrap' + (mounted ? ' open' : '') + (closing ? ' closing' : '')} role="dialog" aria-modal="true" aria-label="Perfil del feder">
      <div className="pfBackdrop" onClick={handleClose} />

      <aside className="pfPanel" onClick={(e) => e.stopPropagation()}>
        <header className="pfTopBar">
          <div className="brand">
            <div className="logo">Perfil</div>
            <div className="sub">Ficha completa y configuración</div>
          </div>
          <button className="close" onClick={handleClose} aria-label="Cerrar"><FaXmark /></button>
        </header>

        <div className="pfBody">
          {loading || !feder ? (
            <div className="muted">Cargando…</div>
          ) : (
            <>
              <HeaderBasic
                feder={feder}
                celulaName={feder.celula_nombre || null}
                onToggleActivo={toggleActive}
                onRefresh={refetch}
              />

              <ProfileTabs
                defaultId="basic"
                onChange={onTabChange}
                tabs={[
                  {
                    id: 'basic', label: 'Información básica', icon: FiUser,
                    content: (
                      <BasicInfoSection
                        feder={feder}
                        celulaName={feder.celula_nombre || null}
                        canEditCargo={canEditCargo}
                        isSelf={isSelf}
                      />
                    )
                  },
                  {
                    id: 'id', label: 'Identidad y legales', icon: FiFileText,
                    content: <IdentidadSection feder={feder} isSelf={isSelf} />
                  },
                  {
                    id: 'mode', label: 'Modalidad por día', icon: FiCalendar,
                    content: <ModalidadDiaSection federId={feder.id} catalog={catLocal || {}} isSelf={isSelf} />
                  },
                  {
                    id: 'firma', label: 'Firma', icon: FiEdit3,
                    content: <FirmaPerfilSection federId={feder.id} federNombre={feder.nombre} federApellido={feder.apellido} />
                  },
                  {
                    id: 'bancos', label: 'Bancos', icon: FiCreditCard,
                    content: <BancosSection federId={feder.id} isSelf={isSelf} />
                  },
                  {
                    id: 'emerg', label: 'Emergencias', icon: FiLifeBuoy,
                    content: <EmergenciasSection federId={feder.id} isSelf={isSelf} />
                  },
                ]}
              />
            </>
          )}
        </div>
      </aside>
    </div>
  )

  return createPortal(body, document.body)
}