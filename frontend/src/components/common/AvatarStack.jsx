import Avatar from '../Avatar.jsx'
import AttendanceBadge from './AttendanceBadge.jsx'
import { getModalidad } from '../../hooks/useAttendanceStatus.js'
import { fullName as getFullName, pickAvatar } from '../../utils/people.js'

export default function AvatarStack({ people = [], size = 22, titlePrefix = '', attendanceStatuses = null }) {
  return (
    <div className="fh-avatars" style={{ '--av-size': `${size}px` }}>
      {people.slice(0, 5).map((p, i) => {
        const avatarUrl = pickAvatar(p)
        const fullName = getFullName(p)
        const federId = p.id || p.feder_id || p.feder?.id

        return (
          <div
            key={p.id || p.email || i}
            className="fh-avatar"
            title={`${titlePrefix}${fullName}`}
            style={{ zIndex: 10 - i, position: 'relative' }}
          >
            <Avatar src={avatarUrl} name={fullName} size={size} />
            {attendanceStatuses && (
              <AttendanceBadge modalidad={getModalidad(attendanceStatuses, federId)} size={size * 0.6} />
            )}
          </div>
        )
      })}
      {people.length > 5 && <div className="fh-avatar fh-avatar--more">+{people.length - 5}</div>}
    </div>
  )
}

