import { FaRotateRight } from 'react-icons/fa6'
import AvatarUpload from './AvatarUpload'
import { resolveMediaUrl } from '../../../utils/media'
import './HeaderBasic.scss'

export default function HeaderBasic({ feder, celulaName, onToggleActivo, onRefresh }) {
  const federName = `${feder?.nombre || ''} ${feder?.apellido || ''}`.trim()

  return (
    <div className="pfHeader" aria-label="Encabezado de perfil">
      <div className="pfAvatar">
        <AvatarUpload
          federId={feder?.id}
          src={resolveMediaUrl(feder?.avatar_url)}
          alt={federName}
          onUpdated={onRefresh}
        />
      </div>

      <div className="pfMeta">
        <div className="nm" title="Nombre y apellido">{feder?.nombre || '—'} {feder?.apellido || ''}</div>
        <div className="sub" title="Cargo principal">{feder?.cargo_principal || '—'}</div>
        <div className="sub" title="Correo electrónico">{feder?.user_email || '—'}</div>
        {celulaName && <div className="pill" title="Célula asignada">Célula: {celulaName}</div>}
      </div>

      <div className="pfActions">
        <label className="switchLbl" title="Estado activo">
          <input type="checkbox" defaultChecked={!!feder?.is_activo} onChange={onToggleActivo} aria-label="Alternar activo" />
          <span>Activo</span>
        </label>
        <button className="btn" onClick={onRefresh} title="Actualizar">
          <FaRotateRight style={{ marginRight: 6 }} />Actualizar
        </button>
      </div>
    </div>
  )
}