// /frontend/src/components/dashboard/TaskItem.jsx

import './tasks.scss'

export default function TaskItem({ t }) {
  const dueTxt = t.due
    ? new Intl.DateTimeFormat('es-AR', { day:'2-digit', month:'2-digit' })
        .format(new Date(t.due))
    : '—'
  const w = t.client?.weight ?? 0
  return (
    <div className="fh-taskItem" title={t.title}>
      <div className="fh-taskItem__title">{t.title}</div>
      <div className="fh-taskItem__meta">
        <span className="fh-badge">{t.client?.name ?? '—'}</span>
        <span className="fh-stars" aria-label={`Ponderación ${w}`}>
          {'★'.repeat(w)}{'☆'.repeat(Math.max(0,5-w))}
        </span>
        <span className="fh-date">{dueTxt}</span>
      </div>
    </div>
  )
}
