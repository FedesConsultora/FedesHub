// /frontend/src/components/tasks/TaskCard.jsx
import AvatarStack from '../common/AvatarStack'
import ContextMenu from '../common/ContextMenu'
import { getPriorityMeta } from './priority-utils'
import { FaTrash, FaExternalLinkAlt } from 'react-icons/fa'

const STATUS_COLORS = {
  pendiente: '#7A1B9F',
  en_curso: '#9F1B50',
  revision: '#1B6D9F',
  aprobada: '#1B9F4E',
  cancelada: '#9F1B1B',
}

export default function TaskCard({ t, onPointerDown, onOpenTask, onDelete, canDelete = false, attendanceStatuses = null }) {
  const open = () => {
    onOpenTask(t.id);
  };

  const dueTxt = t.due
    ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' })
      .format(new Date(t.due))
    : '—'

  // Calcular nivel de prioridad para el indicador de color
  const prio = getPriorityMeta(t.prioridad_num || t.prioridad || 0, t.boost_manual || 0, t.due || t.vencimiento)
  const prioClass = prio.level >= 3 ? 'prio-crit' : prio.level === 2 ? 'prio-high' : prio.level === 1 ? 'prio-med' : 'prio-low'

  const boltIcon = prio.isBoosted && (
    <div className="fh-k-prio-bolt" title="Prioridad manual activada">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffeb3b" style={{ filter: 'drop-shadow(0 0 4px rgba(255,235,59,0.8))' }}>
        <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" />
      </svg>
    </div>
  )

  const statusColor = STATUS_COLORS[t.status?.code] || '#94a3b8'

  // Menú contextual
  const menuItems = [
    {
      label: 'Abrir tarea',
      icon: <FaExternalLinkAlt />,
      onClick: open
    },
    { separator: true, hidden: !canDelete },
    {
      label: 'Eliminar tarea',
      icon: <FaTrash />,
      danger: true,
      hidden: !canDelete,
      onClick: () => onDelete?.(t)
    }
  ]

  return (
    <ContextMenu items={menuItems}>
      <article
        className={`fh-k-task ${prioClass}`}
        onPointerDown={onPointerDown}
        onClick={open}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open()}
        aria-label={`Abrir tarea #${t.id}: ${t.title}`}
      >
        <div className="fh-k-row">
          <div className="fh-k-client" title={t.client?.name ?? '—'}>
            {t.client?.name ?? '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              className="fh-k-status-badge"
              style={{
                fontSize: '0.65rem',
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: `${statusColor}15`,
                color: statusColor,
                border: `1px solid ${statusColor}30`,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap'
              }}
            >
              {t.status?.name || '—'}
            </div>
            <div className="fh-k-date" title="Vencimiento">{dueTxt}</div>
            {boltIcon}
          </div>
        </div>

        <div className="fh-k-title" title={t.title}>{t.title}</div>

        <div className="fh-k-people">
          <div className="fh-k-role">
            <span className="fh-k-roleLabel">Resp.</span>
            <AvatarStack
              people={t.responsables || []}
              titlePrefix="Responsable: "
              attendanceStatuses={attendanceStatuses}
            />
          </div>
          <div className="fh-k-role">
            <span className="fh-k-roleLabel">Colab.</span>
            <AvatarStack
              people={t.colaboradores || []}
              titlePrefix="Colaborador: "
              attendanceStatuses={attendanceStatuses}
            />
          </div>
        </div>
      </article>
    </ContextMenu>
  )
}