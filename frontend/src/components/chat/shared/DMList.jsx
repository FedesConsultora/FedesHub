import { useMemo } from 'react'
import Avatar from '../../Avatar.jsx'
import './DMList.scss'
import { displayName, pickAvatar } from '../../../utils/people'
import AttendanceBadge from '../../common/AttendanceBadge.jsx'
import useAttendanceStatus, { getModalidad } from '../../../hooks/useAttendanceStatus.js'

export default function DMList({ items = [], selectedId = null, unreadLookup = {}, mentionLookup = {}, onOpenDm }) {
  // Collect feder_ids for attendance status
  const federIds = useMemo(() =>
    items.map(u => u.feder_id || u.id_feder).filter(Boolean),
    [items]
  )
  const { statuses } = useAttendanceStatus(federIds)

  return (
    <div className="chat-dms">
      <div className="list">
        {items.map(u => {
          const canalId = u.dm_canal_id
          const unread = !!(canalId && unreadLookup[canalId])
          const hasMention = !!(canalId && mentionLookup[canalId])
          const sel = selectedId === canalId
          const name = displayName(u)
          return (
            <button
              key={u.user_id}
              className={`row ${sel ? 'sel' : ''}`}
              onClick={() => onOpenDm?.(u)}
              title={u.email}
            >
              <span className={'avatarWrap' + (hasMention ? ' mention' : '')}>
                <Avatar src={pickAvatar(u)} name={name} size={36} federId={u.feder_id || u.id_feder} />
                {unread && <i className="dot" />}
                <AttendanceBadge modalidad={getModalidad(statuses, u.feder_id || u.id_feder)} size={14} />
              </span>
              <div className="meta">
                <div className="name">
                  {name}
                  {hasMention && <span className="mentionTag">@</span>}
                </div>
                <div className="sub">{u.email}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
