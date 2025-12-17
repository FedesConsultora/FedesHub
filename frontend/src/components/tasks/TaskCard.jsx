// /frontend/src/components/tasks/TaskCard.jsx
import AvatarStack from '../common/AvatarStack'
import ContextMenu from '../common/ContextMenu'
import { getPriorityMeta } from './priority-utils'
import { FaTrash, FaExternalLinkAlt } from 'react-icons/fa'

export default function TaskCard({ t, onPointerDown, onOpenTask, onDelete, canDelete = false }) {
  const open = () => {
    onOpenTask(t.id);
  };

  const dueTxt = t.due
    ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' })
      .format(new Date(t.due))
    : '—'

  // Calcular nivel de prioridad para el indicador de color
  const prio = getPriorityMeta(Number(t.prioridad) || 0, t.due)
  const prioClass = prio.level >= 2 ? 'prio-high' : prio.level === 1 ? 'prio-med' : ''

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
          <div className="fh-k-date" title="Vencimiento">{dueTxt}</div>
        </div>

        <div className="fh-k-title" title={t.title}>{t.title}</div>

        <div className="fh-k-people">
          <div className="fh-k-role">
            <span className="fh-k-roleLabel">Resp.</span>
            <AvatarStack people={t.responsables || []} titlePrefix="Responsable: " />
          </div>
          <div className="fh-k-role">
            <span className="fh-k-roleLabel">Colab.</span>
            <AvatarStack people={t.colaboradores || []} titlePrefix="Colaborador: " />
          </div>
        </div>
      </article>
    </ContextMenu>
  )
}