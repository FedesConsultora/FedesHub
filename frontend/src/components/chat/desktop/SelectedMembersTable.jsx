import { memo } from 'react'
import { FaTimes, FaChevronDown } from 'react-icons/fa'
import { displayName } from '../../../utils/people'
import './SelectedMembersTable.scss'

function SelectedMembersTable({
  selOrder = [],
  selMap = {},
  candidates = [],
  allowedRoles = ['admin','mod','member','guest'],
  onChangeRole,
  onRemove
}) {
  return (
    <section className="selTable" aria-label="Seleccionados">
      <div className="selTableHead">
        <div className="th user">Seleccionados ({selOrder.length})</div>
        <div className="th role">Rol</div>
        <div className="th actions" aria-hidden />
      </div>

      <div className="selTableBody">
        {selOrder.length === 0 && (
          <div className="empty">Aún no hay seleccionados</div>
        )}

        {selOrder.map(uid => {
          const u = candidates.find(x => Number(x.user_id) === Number(uid)) || {}
          const dn = displayName(u) || u?.email || `Usuario ${uid}`
          const email = u?.email || ''
          const rol = selMap[uid] || 'member'

          return (
            <div key={uid} className="tr" data-user-id={uid}>
              <div className="td user">
                <span className="ava">{(dn[0] || '?').toUpperCase()}</span>
                <div className="meta">
                  <div className="nm">{dn}</div>
                  {email && <div className="sub">{email}</div>}
                </div>
              </div>

              <div className="td role">
                <div className="selectWrap">
                  <select
                    value={rol}
                    onChange={(e)=>onChangeRole?.(Number(uid), e.target.value)}
                    aria-label={`Rol para ${dn}`}
                  >
                    {allowedRoles.map(r => (
                      <option key={r} value={r}>
                        {r === 'admin' ? 'Admin' :
                         r === 'mod' ? 'Mod' :
                         r === 'member' ? 'Miembro' :
                         r === 'guest' ? 'Invitado' : r}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="chev" aria-hidden />
                </div>
              </div>

              <div className="td actions">
                <button
                  type="button"
                  className="iconBtn"
                  aria-label={`Quitar ${dn}`}
                  onClick={()=>onRemove?.(Number(uid))}
                  title="Quitar"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default memo(SelectedMembersTable)
