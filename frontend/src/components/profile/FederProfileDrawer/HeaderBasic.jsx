import { FaCamera, FaRotateRight } from 'react-icons/fa6'
import './HeaderBasic.scss'

export default function HeaderBasic({ feder, celulaName, onToggleActivo, onRefresh }) {
  const initials = ((feder?.nombre?.[0] || '') + (feder?.apellido?.[0] || '') || 'FP').toUpperCase()

  return (
    <div className="pfHeader" aria-label="Encabezado de perfil">
      <div className="pfAvatar">
        <div className="circle" aria-label={`Iniciales ${initials}`}>{initials}</div>
        <button className="ghost" title="Cambiar foto de perfil" aria-label="Cambiar foto"><FaCamera/></button>
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
          <FaRotateRight style={{marginRight:6}}/>Actualizar
        </button>
      </div>
    </div>
  )
}